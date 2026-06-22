import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const PASS = 'TestPass123!';

const OWNER_EMAIL = 'sl-owner@example.com';
const PLAIN_EMAIL = 'sl-plain@example.com';
const NO_DISCOUNT_EMAIL = 'sl-nodiscount@example.com';

let ownerId: string;
let testProductId: string;
let variantAId: string;
let variantBId: string;
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

    await knex('sales').whereIn(
        'staff_id',
        knex('users').where('email', 'like', 'sl-%@example.com').select('id'),
    ).delete();
    await cleanupUsersByEmailLike('sl-%@example.com');
    await knex('role_permissions').whereIn('role_id', knex('roles').where('name', 'like', 'SL Role%').select('id')).delete();
    await knex('roles').where('name', 'like', 'SL Role%').delete();

    const [processPerm] = await knex('permissions').select('id').where({ name: 'sales.process' });
    const [viewPerm]    = await knex('permissions').select('id').where({ name: 'sales.view' });
    const [voidPerm]    = await knex('permissions').select('id').where({ name: 'sales.void' });

    const [roleRow] = await knex('roles').insert({ name: 'SL Role ProcessOnly' }).returning('id');
    await knex('role_permissions').insert([
        { role_id: roleRow.id, permission_id: processPerm.id },
        { role_id: roleRow.id, permission_id: viewPerm.id },
        { role_id: roleRow.id, permission_id: voidPerm.id },
    ]);

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: PLAIN_EMAIL, password: PASS });
    await createTestUser({ email: NO_DISCOUNT_EMAIL, password: PASS });
    await knex('users').where({ email: NO_DISCOUNT_EMAIL }).update({ role_id: roleRow.id });

    const ownerRow = await knex('users').where({ email: OWNER_EMAIL }).select('id').first();
    ownerId = ownerRow.id;

    const [p] = await knex('products')
        .insert({ name: 'SL Test Product', category: 'Clothing', is_active: true, created_by: ownerId })
        .returning('id');
    testProductId = p.id;

    const [vA] = await knex('product_variants')
        .insert({ product_id: testProductId, cost_price: 50, selling_price: 100, stock: 20, low_stock_threshold: 5, is_active: true })
        .returning('id');
    variantAId = vA.id;

    const [vB] = await knex('product_variants')
        .insert({ product_id: testProductId, cost_price: 30, selling_price: 80, stock: 10, low_stock_threshold: 5, is_active: true })
        .returning('id');
    variantBId = vB.id;

    const [vInactive] = await knex('product_variants')
        .insert({ product_id: testProductId, cost_price: 20, selling_price: 60, stock: 10, low_stock_threshold: 5, is_active: false })
        .returning('id');
    inactiveVariantId = vInactive.id;
});

afterAll(async () => {
    await knex('sales').whereIn(
        'staff_id',
        knex('users').where('email', 'like', 'sl-%@example.com').select('id'),
    ).delete();
    if (testProductId) {
        await knex('product_variants').where({ product_id: testProductId }).delete();
        await knex('products').where({ id: testProductId }).delete();
    }
    await cleanupUsersByEmailLike('sl-%@example.com');
    await knex('role_permissions').whereIn('role_id', knex('roles').where('name', 'like', 'SL Role%').select('id')).delete();
    await knex('roles').where('name', 'like', 'SL Role%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

describe('POST /api/sales', () => {
    let owner: Awaited<ReturnType<typeof login>>;
    let plain: Awaited<ReturnType<typeof login>>;
    let noDiscount: Awaited<ReturnType<typeof login>>;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
        plain = await login(PLAIN_EMAIL);
        noDiscount = await login(NO_DISCOUNT_EMAIL);
    });

    beforeEach(async () => {
        await setStock(variantAId, 20);
        await setStock(variantBId, 10);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_process_sales', async () => {
        const res = await plain.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(403);
    });

    it('returns 422 when items is empty', async () => {
        const res = await owner.post('/api/sales').send({
            items: [],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when quantity is less than 1', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 0 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when payment_method is invalid', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'card',
            amount_tendered: 100,
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when duplicate variant IDs appear in items', async () => {
        const res = await owner.post('/api/sales').send({
            items: [
                { variant_id: variantAId, quantity: 1 },
                { variant_id: variantAId, quantity: 2 },
            ],
            payment_method: 'cash',
            amount_tendered: 300,
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when cash sale has no amount_tendered', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
        });
        expect(res.status).toBe(422);
    });

    it('returns 404 when variant does not exist', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(404);
    });

    it('returns 400 when variant is inactive', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: inactiveVariantId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when stock is insufficient', async () => {
        await setStock(variantAId, 2);
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 5 }],
            payment_method: 'cash',
            amount_tendered: 500,
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('STOCK_INSUFFICIENT');
    });

    it('returns 400 when amount_tendered is less than amount_due', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 2 }],
            payment_method: 'cash',
            amount_tendered: 150,
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('AMOUNT_INSUFFICIENT');
    });

    it('returns 403 when discount applied without can_discount_sales', async () => {
        const res = await noDiscount.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
            discount: 10,
        });
        expect(res.status).toBe(403);
    });

    it('returns 400 when discount exceeds sale total', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
            discount: 200,
        });
        expect(res.status).toBe(400);
    });

    it('processes a cash sale and returns 201 with correct data', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 2 }],
            payment_method: 'cash',
            amount_tendered: 250,
        });
        expect(res.status).toBe(201);
        expect(res.body.code).toBe('SALE_COMPLETED');
        const sale = res.body.data;
        expect(sale.payment_method).toBe('cash');
        expect(sale.payment_status).toBe('paid');
        expect(Number(sale.amount_due)).toBe(200);
        expect(Number(sale.amount_tendered)).toBe(250);
        expect(Number(sale.change_given)).toBe(50);
        expect(Number(sale.discount)).toBe(0);
        expect(sale.voided_at).toBeNull();
        expect(sale.items).toHaveLength(1);
        expect(Number(sale.items[0].quantity)).toBe(2);
        expect(Number(sale.items[0].unit_price)).toBe(100);
        expect(Number(sale.items[0].line_total)).toBe(200);
        expect(Number(sale.items[0].cost_price_snapshot)).toBe(50);
    });

    it('sale_number follows SL-YYYYMMDD-NNNN format', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(201);
        expect(res.body.data.sale_number).toMatch(/^SL-\d{8}-\d{4}$/);
    });

    it('decrements variant stock after sale', async () => {
        await setStock(variantAId, 15);
        await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 3 }],
            payment_method: 'cash',
            amount_tendered: 300,
        });
        const [variant] = await knex('product_variants').where({ id: variantAId });
        expect(Number(variant.stock)).toBe(12);
    });

    it('processes a momo sale with payment_status paid', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'momo',
        });
        expect(res.status).toBe(201);
        expect(res.body.data.payment_method).toBe('momo');
        expect(res.body.data.payment_status).toBe('paid');
        expect(res.body.data.amount_tendered).toBeNull();
        expect(res.body.data.change_given).toBeNull();
    });

    it('processes a sale with a valid discount', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 2 }],
            payment_method: 'cash',
            amount_tendered: 180,
            discount: 20,
        });
        expect(res.status).toBe(201);
        expect(Number(res.body.data.amount_due)).toBe(180);
        expect(Number(res.body.data.discount)).toBe(20);
        expect(Number(res.body.data.change_given)).toBe(0);
    });

    it('processes a multi-item sale correctly', async () => {
        const res = await owner.post('/api/sales').send({
            items: [
                { variant_id: variantAId, quantity: 1 },
                { variant_id: variantBId, quantity: 2 },
            ],
            payment_method: 'cash',
            amount_tendered: 300,
        });
        expect(res.status).toBe(201);
        expect(Number(res.body.data.amount_due)).toBe(260);
        expect(res.body.data.items).toHaveLength(2);
    });

    it('writes an audit log on successful sale', async () => {
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        expect(res.status).toBe(201);
        const log = await knex('audit_logs')
            .where({ entity_type: 'sale', entity_id: res.body.data.id, action: 'SALE_COMPLETED' })
            .first();
        expect(log).toBeDefined();
    });
});

describe('GET /api/sales', () => {
    let owner: Awaited<ReturnType<typeof login>>;
    let plain: Awaited<ReturnType<typeof login>>;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
        plain = await login(PLAIN_EMAIL);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/sales');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_sales', async () => {
        const res = await plain.get('/api/sales');
        expect(res.status).toBe(403);
    });

    it('returns 200 with paginated sales', async () => {
        const res = await owner.get('/api/sales');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.sales)).toBe(true);
        expect(typeof res.body.data.total).toBe('number');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limit');
    });

    it('respects limit query param', async () => {
        const res = await owner.get('/api/sales?page=1&limit=2');
        expect(res.status).toBe(200);
        expect(res.body.data.sales.length).toBeLessThanOrEqual(2);
    });

    it('returns 422 when page is 0', async () => {
        const res = await owner.get('/api/sales?page=0');
        expect(res.status).toBe(422);
    });
});

describe('GET /api/sales/:id', () => {
    let owner: Awaited<ReturnType<typeof login>>;
    let plain: Awaited<ReturnType<typeof login>>;
    let saleId: string;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
        plain = await login(PLAIN_EMAIL);
        await setStock(variantAId, 10);
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 100,
        });
        saleId = res.body.data.id;
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get(`/api/sales/${saleId}`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_sales', async () => {
        const res = await plain.get(`/api/sales/${saleId}`);
        expect(res.status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const res = await owner.get('/api/sales/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });

    it('returns 200 with sale, items, and staff', async () => {
        const res = await owner.get(`/api/sales/${saleId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(saleId);
        expect(Array.isArray(res.body.data.items)).toBe(true);
        expect(res.body.data.items.length).toBeGreaterThan(0);
        expect(res.body.data.staff).toBeDefined();
        expect(res.body.data.staff.name).toBeDefined();
    });
});

describe('POST /api/sales/:id/void', () => {
    let owner: Awaited<ReturnType<typeof login>>;
    let plain: Awaited<ReturnType<typeof login>>;
    let saleId: string;
    let stockAfterSale: number;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
        plain = await login(PLAIN_EMAIL);
        await setStock(variantAId, 20);
        const res = await owner.post('/api/sales').send({
            items: [{ variant_id: variantAId, quantity: 4 }],
            payment_method: 'cash',
            amount_tendered: 400,
        });
        saleId = res.body.data.id;
        const [v] = await knex('product_variants').where({ id: variantAId });
        stockAfterSale = Number(v.stock);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post(`/api/sales/${saleId}/void`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_void_sales', async () => {
        const res = await plain.post(`/api/sales/${saleId}/void`);
        expect(res.status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const res = await owner.post('/api/sales/00000000-0000-0000-0000-000000000000/void');
        expect(res.status).toBe(404);
    });

    it('voids the sale and restores stock', async () => {
        const res = await owner.post(`/api/sales/${saleId}/void`);
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('SALE_VOIDED');
        expect(res.body.data.voided_at).not.toBeNull();
        expect(res.body.data.voided_by_id).toBe(ownerId);
        const [v] = await knex('product_variants').where({ id: variantAId });
        expect(Number(v.stock)).toBe(stockAfterSale + 4);
    });

    it('returns 400 when voiding an already voided sale', async () => {
        const res = await owner.post(`/api/sales/${saleId}/void`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('ALREADY_VOIDED');
    });

    it('writes an audit log on void', async () => {
        await setStock(variantBId, 5);
        const newSaleRes = await owner.post('/api/sales').send({
            items: [{ variant_id: variantBId, quantity: 1 }],
            payment_method: 'cash',
            amount_tendered: 80,
        });
        const newSaleId = newSaleRes.body.data.id;
        await owner.post(`/api/sales/${newSaleId}/void`);
        const log = await knex('audit_logs')
            .where({ entity_type: 'sale', entity_id: newSaleId, action: 'SALE_VOIDED' })
            .first();
        expect(log).toBeDefined();
    });
});
