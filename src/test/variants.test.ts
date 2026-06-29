import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL = 'var-owner@example.com';
const VIEWER_EMAIL = 'var-viewer@example.com';
const PASS = 'TestPass123!';

let viewerRoleId: string;
let testProductId: string;
let otherProductId: string;
let sizeTypeId: string;
let colourTypeId: string;
let sValueId: string;
let mValueId: string;
let lValueId: string;
let blackValueId: string;
let whiteValueId: string;
let ownerId: string;

// Created during tests
let materialTypeId: string;
let cottonValueId: string;
let createdVariantId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    // Clean any leftovers from previous runs
    await cleanupUsersByEmailLike('var-%@example.com');
    await knex('roles').where({ name: 'Var Test Viewer' }).delete();
    const oldProducts = await knex('products').whereIn('name', ['Var Test Product', 'Var Other Product']).select('id');
    for (const p of oldProducts) {
        await knex('product_variants').where({ product_id: p.id }).delete();
        await knex('products').where({ id: p.id }).delete();
    }

    // Viewer role with variants.view only
    const [canView] = await knex('permissions').select('id').where({ name: 'variants.view' });
    const [viewerRole] = await knex('roles').insert({ name: 'Var Test Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });

    ownerId = (await knex('users').where({ email: OWNER_EMAIL }).select('id').first()).id;

    // Main test product
    const [p1] = await knex('products')
        .insert({ name: 'Var Test Product', category: 'tops', is_active: true, created_by: ownerId })
        .returning('id');
    testProductId = p1.id;

    // A separate product — used to test cross-product option value rejection
    const [p2] = await knex('products')
        .insert({ name: 'Var Other Product', category: 'bottoms', is_active: true, created_by: ownerId })
        .returning('id');
    otherProductId = p2.id;

    // Option types for testProductId
    const [st] = await knex('product_option_types').insert({ product_id: testProductId, name: 'Size' }).returning('id');
    sizeTypeId = st.id;
    const [ct] = await knex('product_option_types').insert({ product_id: testProductId, name: 'Colour' }).returning('id');
    colourTypeId = ct.id;

    // Option values
    const [sv] = await knex('product_option_values').insert({ option_type_id: sizeTypeId, value: 'S' }).returning('id');
    sValueId = sv.id;
    const [mv] = await knex('product_option_values').insert({ option_type_id: sizeTypeId, value: 'M' }).returning('id');
    mValueId = mv.id;
    const [lv] = await knex('product_option_values').insert({ option_type_id: sizeTypeId, value: 'L' }).returning('id');
    lValueId = lv.id;
    const [bv] = await knex('product_option_values').insert({ option_type_id: colourTypeId, value: 'Black' }).returning('id');
    blackValueId = bv.id;
    const [wv] = await knex('product_option_values').insert({ option_type_id: colourTypeId, value: 'White' }).returning('id');
    whiteValueId = wv.id;
});

afterAll(async () => {
    await knex('product_variants').where({ product_id: testProductId }).delete();
    await knex('product_variants').where({ product_id: otherProductId }).delete();
    await knex('products').whereIn('id', [testProductId, otherProductId]).delete();
    await cleanupUsersByEmailLike('var-%@example.com');
    await knex('roles').where({ name: 'Var Test Viewer' }).delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── POST /api/variants/option-types ─────────────────────────────────────────

describe('POST /api/variants/option-types', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post('/api/variants/option-types').send({ product_id: testProductId, name: 'X' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ product_id: testProductId, name: 'X' })).status).toBe(403);
    });

    it('returns 422 when product_id is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ name: 'Material' })).status).toBe(422);
    });

    it('returns 422 when product_id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ product_id: 'not-a-uuid', name: 'Material' })).status).toBe(422);
    });

    it('returns 422 when name is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ product_id: testProductId })).status).toBe(422);
    });

    it('returns 404 when product does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ product_id: '00000000-0000-0000-0000-000000000000', name: 'Material' })).status).toBe(404);
    });

    it('returns 201 and creates the option type', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/variants/option-types').send({ product_id: testProductId, name: 'Material' });
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Material');
        expect(res.body.data.product_id).toBe(testProductId);
        expect(Array.isArray(res.body.data.values)).toBe(true);
        materialTypeId = res.body.data.id;
    });

    it('returns 409 when option type name already exists for the product', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types').send({ product_id: testProductId, name: 'Material' })).status).toBe(409);
    });
});

// ─── GET /api/variants/option-types ──────────────────────────────────────────

describe('GET /api/variants/option-types', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get(`/api/variants/option-types?productId=${testProductId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_variants', async () => {
        const { user: plain } = await createTestUser({ email: 'var-plain@example.com', password: PASS });
        const s = await login('var-plain@example.com');
        const res = await s.get(`/api/variants/option-types?productId=${testProductId}`);
        expect(res.status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 422 when productId query param is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/option-types')).status).toBe(422);
    });

    it('returns 422 when productId is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/option-types?productId=not-a-uuid')).status).toBe(422);
    });

    it('returns 404 when product does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/option-types?productId=00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with all option types and their values', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/variants/option-types?productId=${testProductId}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        const names = res.body.data.map((t: any) => t.name);
        expect(names).toContain('Size');
        expect(names).toContain('Colour');
        expect(names).toContain('Material');
        const sizeType = res.body.data.find((t: any) => t.name === 'Size');
        expect(Array.isArray(sizeType.values)).toBe(true);
        expect(sizeType.values.map((v: any) => v.value)).toContain('M');
    });
});

// ─── POST /api/variants/option-types/:id/values ───────────────────────────────

describe('POST /api/variants/option-types/:id/values', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post(`/api/variants/option-types/${materialTypeId}/values`).send({ value: 'Cotton' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post(`/api/variants/option-types/${materialTypeId}/values`).send({ value: 'Cotton' })).status).toBe(403);
    });

    it('returns 422 when value is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post(`/api/variants/option-types/${materialTypeId}/values`).send({})).status).toBe(422);
    });

    it('returns 404 when option type does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants/option-types/00000000-0000-0000-0000-000000000000/values').send({ value: 'Cotton' })).status).toBe(404);
    });

    it('returns 201 and adds the value', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post(`/api/variants/option-types/${materialTypeId}/values`).send({ value: 'Cotton' });
        expect(res.status).toBe(201);
        expect(res.body.data.value).toBe('Cotton');
        expect(res.body.data.option_type_id).toBe(materialTypeId);
        cottonValueId = res.body.data.id;
    });

    it('returns 409 when value already exists for the option type', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post(`/api/variants/option-types/${materialTypeId}/values`).send({ value: 'Cotton' })).status).toBe(409);
    });
});

// ─── POST /api/variants ───────────────────────────────────────────────────────

describe('POST /api/variants', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post('/api/variants').send({})).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: testProductId, cost_price: 10, selling_price: 20, optionValueIds: [] })).status).toBe(403);
    });

    it('returns 422 when product_id is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ cost_price: 10, selling_price: 20, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 422 when product_id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: 'not-a-uuid', cost_price: 10, selling_price: 20, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 422 when cost_price is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: testProductId, selling_price: 20, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 422 when selling_price is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: testProductId, cost_price: 10, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 422 when optionValueIds is not an array', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: testProductId, cost_price: 10, selling_price: 20, optionValueIds: 'bad' })).status).toBe(422);
    });

    it('returns 404 when product does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: '00000000-0000-0000-0000-000000000000', cost_price: 10, selling_price: 20, optionValueIds: [] })).status).toBe(404);
    });

    it('returns 400 when option values belong to a different product', async () => {
        // otherProductId has no option types — but even if we create one, mValueId belongs to testProductId
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/variants').send({ product_id: otherProductId, cost_price: 10, selling_price: 20, optionValueIds: [mValueId] });
        expect(res.status).toBe(400);
    });

    it('returns 400 when two values from the same option type are provided', async () => {
        const s = await login(OWNER_EMAIL);
        // sValueId and mValueId both belong to sizeTypeId
        const res = await s.post('/api/variants').send({ product_id: testProductId, cost_price: 10, selling_price: 20, optionValueIds: [sValueId, mValueId] });
        expect(res.status).toBe(400);
    });

    it('returns 201 and creates the variant with option values', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/variants').send({
            product_id: testProductId,
            cost_price: 25.00,
            selling_price: 50.00,
            optionValueIds: [mValueId, blackValueId],
            low_stock_threshold: 3,
            sku: 'VAR-SKU-001',
        });
        expect(res.status).toBe(201);
        expect(res.body.data.product_id).toBe(testProductId);
        expect(res.body.data.stock).toBe(0);
        expect(res.body.data.is_active).toBe(true);
        expect(res.body.data.sku).toBe('VAR-SKU-001');
        expect(Array.isArray(res.body.data.optionValues)).toBe(true);
        expect(res.body.data.optionValues).toHaveLength(2);
        createdVariantId = res.body.data.id;
    });

    it('returns 409 when SKU already exists', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/variants').send({ product_id: testProductId, cost_price: 10, selling_price: 20, optionValueIds: [], sku: 'VAR-SKU-001' })).status).toBe(409);
    });
});

// ─── GET /api/variants ────────────────────────────────────────────────────────

describe('GET /api/variants', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get(`/api/variants?productId=${testProductId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_variants', async () => {
        const { user: plain } = await createTestUser({ email: 'var-plain2@example.com', password: PASS });
        const s = await login('var-plain2@example.com');
        expect((await s.get(`/api/variants?productId=${testProductId}`)).status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 422 when productId query param is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants')).status).toBe(422);
    });

    it('returns 422 when productId is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants?productId=not-a-uuid')).status).toBe(422);
    });

    it('returns 404 when product does not exist', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants?productId=00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with variants and their option values', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/variants?productId=${testProductId}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        const variant = res.body.data[0];
        expect(Array.isArray(variant.optionValues)).toBe(true);
        const hasOptionType = variant.optionValues.every((ov: any) => ov.optionType?.name);
        expect(hasOptionType).toBe(true);
    });
});

// ─── GET /api/variants/search ─────────────────────────────────────────────────

describe('GET /api/variants/search', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get('/api/variants/search')).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_variants', async () => {
        const { user: plain } = await createTestUser({ email: 'var-plain3@example.com', password: PASS });
        const s = await login('var-plain3@example.com');
        expect((await s.get('/api/variants/search')).status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 200 with empty array when no variants match', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?q=XYZNONEXISTENT999');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(0);
    });

    it('returns 200 with all active variants when no query provided', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('matches by SKU', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?q=VAR-SKU-001');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        const found = res.body.data.find((v: any) => v.sku === 'VAR-SKU-001');
        expect(found).toBeDefined();
    });

    it('matches by product name', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?q=Var+Test');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        const first = res.body.data[0];
        expect(first.product_name).toBeDefined();
        expect(first.id).toBeDefined();
    });

    it('each result includes product_name and optionValues', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?q=Var+Test');
        expect(res.status).toBe(200);
        for (const v of res.body.data) {
            expect(v.product_name).toBeDefined();
            expect(Array.isArray(v.optionValues)).toBe(true);
        }
    });

    it('respects inStock=true filter (excludes zero-stock variants)', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?inStock=true');
        expect(res.status).toBe(200);
        for (const v of res.body.data) {
            expect(v.stock).toBeGreaterThan(0);
        }
    });

    it('respects limit parameter', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/variants/search?limit=1');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('returns 422 when limit exceeds maximum', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/search?limit=999')).status).toBe(422);
    });
});

// ─── GET /api/variants/:id ────────────────────────────────────────────────────

describe('GET /api/variants/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get(`/api/variants/${createdVariantId}`)).status).toBe(401);
    });

    it('returns 422 when id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/not-a-uuid')).status).toBe(422);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/variants/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with variant and option values including type names', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/variants/${createdVariantId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(createdVariantId);
        expect(Array.isArray(res.body.data.optionValues)).toBe(true);
        expect(res.body.data.optionValues).toHaveLength(2);
        const names = res.body.data.optionValues.map((ov: any) => ov.optionType.name);
        expect(names).toContain('Size');
        expect(names).toContain('Colour');
    });
});

// ─── PUT /api/variants/:id ────────────────────────────────────────────────────

describe('PUT /api/variants/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).put(`/api/variants/${createdVariantId}`).send({ cost_price: 30, selling_price: 60, optionValueIds: [] })).status).toBe(401);
    });

    it('returns 403 when user lacks can_update_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.put(`/api/variants/${createdVariantId}`).send({ cost_price: 30, selling_price: 60, optionValueIds: [] })).status).toBe(403);
    });

    it('returns 422 when id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/variants/not-a-uuid').send({ cost_price: 30, selling_price: 60, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/variants/00000000-0000-0000-0000-000000000000').send({ cost_price: 30, selling_price: 60, optionValueIds: [] })).status).toBe(404);
    });

    it('returns 422 when cost_price is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put(`/api/variants/${createdVariantId}`).send({ selling_price: 60, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 422 when selling_price is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put(`/api/variants/${createdVariantId}`).send({ cost_price: 30, optionValueIds: [] })).status).toBe(422);
    });

    it('returns 400 when two values from the same option type are provided', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put(`/api/variants/${createdVariantId}`).send({ cost_price: 30, selling_price: 60, optionValueIds: [sValueId, mValueId] });
        expect(res.status).toBe(400);
    });

    it('returns 200 and updates prices and option values', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put(`/api/variants/${createdVariantId}`).send({
            cost_price: 35.00,
            selling_price: 70.00,
            optionValueIds: [lValueId, whiteValueId],
            is_active: false,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(false);
        expect(res.body.data.optionValues).toHaveLength(2);
        const values = res.body.data.optionValues.map((ov: any) => ov.value);
        expect(values).toContain('L');
        expect(values).toContain('White');
    });

    it('returns 409 when SKU conflicts with another variant', async () => {
        const [other] = await knex('product_variants')
            .insert({ product_id: testProductId, cost_price: 5, selling_price: 10, sku: 'VAR-SKU-OTHER', stock: 0, low_stock_threshold: 5, is_active: true })
            .returning('id');
        const s = await login(OWNER_EMAIL);
        const res = await s.put(`/api/variants/${createdVariantId}`).send({ cost_price: 30, selling_price: 60, optionValueIds: [], sku: 'VAR-SKU-OTHER' });
        expect(res.status).toBe(409);
        await knex('product_variants').where({ id: other.id }).delete();
    });
});

// ─── PATCH /api/variants/:id/status ──────────────────────────────────────────

describe('PATCH /api/variants/:id/status', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).patch(`/api/variants/${createdVariantId}/status`).send({ is_active: true })).status).toBe(401);
    });

    it('returns 403 when user lacks can_update_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.patch(`/api/variants/${createdVariantId}/status`).send({ is_active: true })).status).toBe(403);
    });

    it('returns 422 when id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch('/api/variants/not-a-uuid/status').send({ is_active: true })).status).toBe(422);
    });

    it('returns 422 when is_active is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch(`/api/variants/${createdVariantId}/status`).send({})).status).toBe(422);
    });

    it('returns 422 when is_active is not a boolean', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch(`/api/variants/${createdVariantId}/status`).send({ is_active: 'yes' })).status).toBe(422);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch('/api/variants/00000000-0000-0000-0000-000000000000/status').send({ is_active: true })).status).toBe(404);
    });

    it('activates an inactive variant', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/variants/${createdVariantId}/status`).send({ is_active: true });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('VARIANT_STATUS_UPDATED');
        expect(res.body.data.is_active).toBe(true);
    });

    it('deactivates an active variant', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/variants/${createdVariantId}/status`).send({ is_active: false });
        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(false);
    });

    it('writes audit log with before and after is_active', async () => {
        const log = await knex('audit_logs')
            .where({ action: 'VARIANT_UPDATED', entity_type: 'variant', entity_id: createdVariantId })
            .orderBy('created_at', 'desc')
            .first();
        expect(log).toBeDefined();
        expect(log.before.is_active).toBeDefined();
        expect(log.after.is_active).toBeDefined();
    });

    afterAll(async () => {
        // Leave createdVariantId as is_active=false (stock=0) so it can be deleted without guards
    });
});

// ─── DELETE /api/variants/:id ─────────────────────────────────────────────────

describe('DELETE /api/variants/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).delete(`/api/variants/${createdVariantId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_delete_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.delete(`/api/variants/${createdVariantId}`)).status).toBe(403);
    });

    it('returns 422 when id is not a UUID', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.delete('/api/variants/not-a-uuid')).status).toBe(422);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.delete('/api/variants/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 400 when variant has remaining stock', async () => {
        await knex('product_variants').where({ id: createdVariantId }).update({ stock: 5 });
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/${createdVariantId}`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('STOCK_REMAINING');
        await knex('product_variants').where({ id: createdVariantId }).update({ stock: 0 });
    });

    it('returns 409 when variant has been sold', async () => {
        const [sale] = await knex('sales').insert({
            sale_number: 'VAR-TEST-SALE-001',
            staff_id: ownerId,
            payment_method: 'cash',
            payment_status: 'paid',
            amount_due: 50,
        }).returning('id');
        await knex('sale_items').insert({
            sale_id: sale.id,
            variant_id: createdVariantId,
            quantity: 1,
            unit_price: 50,
            line_total: 50,
            cost_price_snapshot: 25,
        });
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/${createdVariantId}`);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('IN_USE');
        await knex('sale_items').where({ variant_id: createdVariantId }).delete();
        await knex('sales').where({ id: sale.id }).delete();
    });

    it('removes stock_entries when variant is deleted', async () => {
        const [tmp] = await knex('product_variants')
            .insert({ product_id: testProductId, cost_price: 5, selling_price: 10, stock: 0, low_stock_threshold: 5, is_active: true })
            .returning('id');
        await knex('stock_entries').insert({ variant_id: tmp.id, quantity: 10, created_by: ownerId });
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/${tmp.id}`);
        expect(res.status).toBe(200);
        const entries = await knex('stock_entries').where({ variant_id: tmp.id });
        expect(entries).toHaveLength(0);
    });

    it('returns 200 and permanently deletes the variant and its option value links', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/${createdVariantId}`);
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('VARIANT_DELETED');
        const row = await knex('product_variants').where({ id: createdVariantId }).first();
        expect(row).toBeUndefined();
        const links = await knex('variant_option_values').where({ variant_id: createdVariantId });
        expect(links).toHaveLength(0);
    });
});

// ─── DELETE /api/variants/option-values/:id ───────────────────────────────────

describe('DELETE /api/variants/option-values/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).delete(`/api/variants/option-values/${cottonValueId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_delete_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.delete(`/api/variants/option-values/${cottonValueId}`)).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.delete('/api/variants/option-values/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 400 when option value is in use by a variant', async () => {
        const [tmp] = await knex('product_variants')
            .insert({ product_id: testProductId, cost_price: 5, selling_price: 10, stock: 0, low_stock_threshold: 5, is_active: true })
            .returning('id');
        await knex('variant_option_values').insert({ variant_id: tmp.id, option_value_id: cottonValueId });
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/option-values/${cottonValueId}`);
        expect(res.status).toBe(400);
        await knex('product_variants').where({ id: tmp.id }).delete();
    });

    it('returns 200 and deletes the option value', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/option-values/${cottonValueId}`);
        expect(res.status).toBe(200);
        const row = await knex('product_option_values').where({ id: cottonValueId }).first();
        expect(row).toBeUndefined();
    });
});

// ─── DELETE /api/variants/option-types/:id ────────────────────────────────────

describe('DELETE /api/variants/option-types/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).delete(`/api/variants/option-types/${materialTypeId}`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_delete_variants', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.delete(`/api/variants/option-types/${materialTypeId}`)).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.delete('/api/variants/option-types/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 400 when values of the option type are in use by a variant', async () => {
        const [tmp] = await knex('product_variants')
            .insert({ product_id: testProductId, cost_price: 5, selling_price: 10, stock: 0, low_stock_threshold: 5, is_active: true })
            .returning('id');
        await knex('variant_option_values').insert({ variant_id: tmp.id, option_value_id: sValueId });
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/option-types/${sizeTypeId}`);
        expect(res.status).toBe(400);
        await knex('product_variants').where({ id: tmp.id }).delete();
    });

    it('returns 200 and deletes the option type and cascades to its values', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/variants/option-types/${materialTypeId}`);
        expect(res.status).toBe(200);
        const row = await knex('product_option_types').where({ id: materialTypeId }).first();
        expect(row).toBeUndefined();
    });
});
