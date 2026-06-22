import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL = 'stock-owner@example.com';
const MANAGER_EMAIL = 'stock-manager@example.com';
const VIEWER_EMAIL = 'stock-viewer@example.com';
const PASS = 'TestPass123!';

let testProductId: string;
let testVariantId: string;
let inactiveVariantId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

async function setStock(variantId: string, stock: number) {
    await knex('product_variants').where({ id: variantId }).update({ stock });
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    await cleanupUsersByEmailLike('stock-%@example.com');
    await knex('roles').where('name', 'like', 'Stock Test%').delete();

    const [canView]      = await knex('permissions').select('id').where({ name: 'stock.view' });
    const [canAdd]       = await knex('permissions').select('id').where({ name: 'stock.add' });
    const [canAdjust]    = await knex('permissions').select('id').where({ name: 'stock.adjust' });
    const [canThreshold] = await knex('permissions').select('id').where({ name: 'stock.set_threshold' });

    const [mgr] = await knex('roles').insert({ name: 'Stock Test Manager' }).returning('id');
    const managerRoleId = mgr.id;
    await knex('role_permissions').insert([
        { role_id: managerRoleId, permission_id: canView.id },
        { role_id: managerRoleId, permission_id: canAdd.id },
        { role_id: managerRoleId, permission_id: canAdjust.id },
        { role_id: managerRoleId, permission_id: canThreshold.id },
    ]);

    const [vwr] = await knex('roles').insert({ name: 'Stock Test Viewer' }).returning('id');
    const viewerRoleId = vwr.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: MANAGER_EMAIL, password: PASS });
    await knex('users').where({ email: MANAGER_EMAIL }).update({ role_id: managerRoleId });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });

    const ownerId = (await knex('users').where({ email: OWNER_EMAIL }).select('id').first()).id;

    const [p] = await knex('products')
        .insert({ name: 'Stock Test Product', category: 'tops', is_active: true, created_by: ownerId })
        .returning('id');
    testProductId = p.id;

    const [v] = await knex('product_variants')
        .insert({ product_id: testProductId, cost_price: 10, selling_price: 20, stock: 0, low_stock_threshold: 5, is_active: true })
        .returning('id');
    testVariantId = v.id;

    const [iv] = await knex('product_variants')
        .insert({ product_id: testProductId, cost_price: 8, selling_price: 18, stock: 0, low_stock_threshold: 3, is_active: false })
        .returning('id');
    inactiveVariantId = iv.id;
});

afterAll(async () => {
    await knex('stock_entries').whereIn('variant_id', [testVariantId, inactiveVariantId]).delete();
    await knex('product_variants').whereIn('id', [testVariantId, inactiveVariantId]).delete();
    await knex('products').where({ id: testProductId }).delete();
    await cleanupUsersByEmailLike('stock-%@example.com');
    await knex('roles').where('name', 'like', 'Stock Test%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── GET /api/stock ───────────────────────────────────────────────────────────

describe('GET /api/stock', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get(`/api/stock?variantId=${testVariantId}`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_stock', async () => {
        const { user: plain } = await createTestUser({ email: 'stock-plain@example.com', password: PASS });
        const s = await login('stock-plain@example.com');
        const res = await s.get(`/api/stock?variantId=${testVariantId}`);
        expect(res.status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 422 when variantId is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/stock')).status).toBe(422);
    });

    it('returns 404 when variant does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/stock?variantId=00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with empty array for active variant with no entries', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/stock?variantId=${testVariantId}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 200 even for inactive variant (read-only, no restriction)', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/stock?variantId=${inactiveVariantId}`);
        expect(res.status).toBe(200);
    });
});

// ─── POST /api/stock/add ─────────────────────────────────────────────────────

describe('POST /api/stock/add', () => {
    beforeAll(async () => {
        await setStock(testVariantId, 0);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/stock/add').send({ variant_id: testVariantId, quantity: 10 });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_add_stock', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 10 })).status).toBe(403);
    });

    it('returns 422 when variant_id is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ quantity: 10 })).status).toBe(422);
    });

    it('returns 422 when quantity is 0', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 0 })).status).toBe(422);
    });

    it('returns 422 when quantity is negative', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: -5 })).status).toBe(422);
    });

    it('returns 422 when quantity is not an integer', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 2.5 })).status).toBe(422);
    });

    it('returns 422 when quantity exceeds maximum', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 10001 })).status).toBe(422);
    });

    it('returns 404 when variant does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/add').send({ variant_id: '00000000-0000-0000-0000-000000000000', quantity: 10 })).status).toBe(404);
    });

    it('returns 400 when variant is inactive', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/add').send({ variant_id: inactiveVariantId, quantity: 10 });
        expect(res.status).toBe(400);
    });

    it('returns 201 and increments stock correctly', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 10, note: 'Initial delivery' });
        expect(res.status).toBe(201);
        expect(res.body.code).toBe('STOCK_ADDED');
        expect(res.body.data.stock).toBe(10);
    });

    it('accumulates stock across multiple additions', async () => {
        const s = await login(MANAGER_EMAIL);
        const res = await s.post('/api/stock/add').send({ variant_id: testVariantId, quantity: 5 });
        expect(res.status).toBe(201);
        expect(res.body.data.stock).toBe(15);
    });

    it('list shows entries ordered newest-first with creator name', async () => {
        const s = await login(VIEWER_EMAIL);
        const res = await s.get(`/api/stock?variantId=${testVariantId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        const entry = res.body.data[0];
        expect(entry.quantity).toBeDefined();
        expect(entry.createdByUser.name).toBeDefined();
        expect(entry.createdByUser.password_hash).toBeUndefined();
    });

    it('audit log captures before and after stock', async () => {
        const log = await knex('audit_logs')
            .where({ action: 'STOCK_ADDED', entity_type: 'variant', entity_id: testVariantId })
            .orderBy('created_at', 'desc')
            .first();
        expect(log).toBeDefined();
        expect(log.before.stock).toBeDefined();
        expect(log.after.stock).toBeDefined();
        expect(log.after.quantity_added).toBeDefined();
    });
});

// ─── POST /api/stock/adjust ──────────────────────────────────────────────────

describe('POST /api/stock/adjust', () => {
    beforeAll(async () => {
        // Each describe block owns its starting state — not dependent on add tests
        await setStock(testVariantId, 20);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -3, note: 'Damaged' });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_adjust_stock', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -3, note: 'Damaged' })).status).toBe(403);
    });

    it('returns 422 when variant_id is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ quantity: -3, note: 'Damaged' })).status).toBe(422);
    });

    it('returns 422 when note is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -3 })).status).toBe(422);
    });

    it('returns 422 when quantity is 0', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: 0, note: 'Nothing' })).status).toBe(422);
    });

    it('returns 422 when quantity is not an integer', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -1.5, note: 'Damaged' })).status).toBe(422);
    });

    it('returns 422 when quantity magnitude exceeds maximum', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -10001, note: 'Too much' })).status).toBe(422);
    });

    it('returns 404 when variant does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/stock/adjust').send({ variant_id: '00000000-0000-0000-0000-000000000000', quantity: -3, note: 'Damaged' })).status).toBe(404);
    });

    it('returns 400 when variant is inactive', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/adjust').send({ variant_id: inactiveVariantId, quantity: 5, note: 'Found extras' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when adjustment would make stock negative', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -25, note: 'Too much loss' });
        expect(res.status).toBe(400);
    });

    it('returns 201 with a negative adjustment', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -5, note: 'Damaged in storage' });
        expect(res.status).toBe(201);
        expect(res.body.code).toBe('STOCK_ADJUSTED');
        expect(res.body.data.stock).toBe(15); // 20 - 5
    });

    it('returns 201 with a positive adjustment', async () => {
        const s = await login(MANAGER_EMAIL);
        const res = await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: 3, note: 'Found extra units' });
        expect(res.status).toBe(201);
        expect(res.body.data.stock).toBe(18); // 15 + 3
    });

    it('allows adjusting stock exactly to zero', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/stock/adjust').send({ variant_id: testVariantId, quantity: -18, note: 'Full write-off' });
        expect(res.status).toBe(201);
        expect(res.body.data.stock).toBe(0);
    });

    it('audit log captures before and after stock with delta', async () => {
        const log = await knex('audit_logs')
            .where({ action: 'STOCK_ADJUSTED', entity_type: 'variant', entity_id: testVariantId })
            .orderBy('created_at', 'desc')
            .first();
        expect(log).toBeDefined();
        expect(log.before.stock).toBeDefined();
        expect(log.after.stock).toBeDefined();
        expect(log.after.quantity_delta).toBeDefined();
        expect(log.after.note).toBeDefined();
    });
});

// ─── PATCH /api/stock/threshold/:variantId ───────────────────────────────────

describe('PATCH /api/stock/threshold/:variantId', () => {
    beforeAll(async () => {
        await knex('product_variants').where({ id: testVariantId }).update({ low_stock_threshold: 5 });
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: 3 });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_set_threshold', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: 3 })).status).toBe(403);
    });

    it('returns 422 when low_stock_threshold is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch(`/api/stock/threshold/${testVariantId}`).send({})).status).toBe(422);
    });

    it('returns 422 when low_stock_threshold is negative', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: -1 })).status).toBe(422);
    });

    it('returns 422 when low_stock_threshold is not an integer', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: 2.5 })).status).toBe(422);
    });

    it('returns 404 when variant does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch('/api/stock/threshold/00000000-0000-0000-0000-000000000000').send({ low_stock_threshold: 3 })).status).toBe(404);
    });

    it('returns 200 and updates the threshold', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: 3 });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('THRESHOLD_UPDATED');
        expect(res.body.data.low_stock_threshold).toBe(3);
    });

    it('threshold of 0 is valid (disables alert)', async () => {
        const s = await login(MANAGER_EMAIL);
        const res = await s.patch(`/api/stock/threshold/${testVariantId}`).send({ low_stock_threshold: 0 });
        expect(res.status).toBe(200);
        expect(res.body.data.low_stock_threshold).toBe(0);
    });

    it('threshold works on inactive variant', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/stock/threshold/${inactiveVariantId}`).send({ low_stock_threshold: 0 });
        expect(res.status).toBe(200);
    });

    it('audit log captures before and after threshold', async () => {
        const log = await knex('audit_logs')
            .where({ action: 'LOW_STOCK_THRESHOLD_SET', entity_type: 'variant', entity_id: testVariantId })
            .orderBy('created_at', 'desc')
            .first();
        expect(log).toBeDefined();
        expect(log.before.low_stock_threshold).toBeDefined();
        expect(log.after.low_stock_threshold).toBeDefined();
        expect(log.before.low_stock_threshold).not.toEqual(log.after.low_stock_threshold);
    });
});
