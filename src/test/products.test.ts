import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL = 'prod-owner@example.com';
const VIEWER_EMAIL = 'prod-viewer@example.com';
const PASS = 'TestPass123!';

let viewerRoleId: string;
let createdProductId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);
    await cleanupUsersByEmailLike('prod-%@example.com');
    await knex('roles').where({ name: 'Prod Test Viewer' }).delete();

    const [canView] = await knex('permissions').select('id').where({ name: 'products.view' });
    const [viewerRole] = await knex('roles').insert({ name: 'Prod Test Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });
});

afterAll(async () => {
    await knex('products').where('name', 'like', 'Test Product%').delete();
    await cleanupUsersByEmailLike('prod-%@example.com');
    await knex('roles').where({ name: 'Prod Test Viewer' }).delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── POST /api/products ───────────────────────────────────────────────────────

describe('POST /api/products', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post('/api/products').send({ name: 'X', category: 'tops' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_products', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/products').send({ name: 'X', category: 'tops' })).status).toBe(403);
    });

    it('returns 422 when name is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/products').send({ category: 'tops' })).status).toBe(422);
    });

    it('returns 422 when category is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/products').send({ name: 'Test Product A' })).status).toBe(422);
    });

    it('returns 201 and creates the product', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/products').send({
            name: 'Test Product A',
            category: 'tops',
            brand: 'Elegance',
            description: 'A nice top',
        });
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Test Product A');
        expect(res.body.data.category).toBe('tops');
        expect(res.body.data.brand).toBe('Elegance');
        expect(res.body.data.is_active).toBe(true);
        createdProductId = res.body.data.id;
    });
});

// ─── GET /api/products ────────────────────────────────────────────────────────

describe('GET /api/products', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get('/api/products')).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_products', async () => {
        const { user: plain } = await createTestUser({ email: 'prod-plain@example.com', password: PASS });
        const s = await login('prod-plain@example.com');
        const res = await s.get('/api/products');
        expect(res.status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 200 with paginated products', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/products');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.products)).toBe(true);
        expect(res.body.data.products.length).toBeGreaterThan(0);
        expect(typeof res.body.data.total).toBe('number');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limit');
    });

    it('returns 200 for user with can_view_products', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.get('/api/products')).status).toBe(200);
    });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────

describe('GET /api/products/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get(`/api/products/${createdProductId}`)).status).toBe(401);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/products/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with product and relations', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/products/${createdProductId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(createdProductId);
        expect(Array.isArray(res.body.data.variants)).toBe(true);
        expect(Array.isArray(res.body.data.images)).toBe(true);
    });
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────

describe('PUT /api/products/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).put(`/api/products/${createdProductId}`).send({ name: 'X', category: 'Y' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_update_products', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.put(`/api/products/${createdProductId}`).send({ name: 'X', category: 'Y' })).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/products/00000000-0000-0000-0000-000000000000').send({ name: 'X', category: 'Y' })).status).toBe(404);
    });

    it('returns 422 when name is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put(`/api/products/${createdProductId}`).send({ category: 'bottoms' })).status).toBe(422);
    });

    it('returns 422 when category is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put(`/api/products/${createdProductId}`).send({ name: 'X' })).status).toBe(422);
    });

    it('returns 200 and updates the product', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put(`/api/products/${createdProductId}`).send({
            name: 'Test Product A Updated',
            category: 'bottoms',
            brand: 'Sconia',
        });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Test Product A Updated');
        expect(res.body.data.category).toBe('bottoms');
    });
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────

describe('DELETE /api/products/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).delete(`/api/products/${createdProductId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_delete_products', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.delete(`/api/products/${createdProductId}`)).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.delete('/api/products/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 and deactivates the product', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/products/${createdProductId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(false);
    });
});
