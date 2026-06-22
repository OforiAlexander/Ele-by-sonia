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

const OWNER_EMAIL = 'rp-owner@example.com';
const PLAIN_EMAIL = 'rp-plain@example.com';

let ownerId: string;
let productId: string;
let variantAId: string;
let variantBId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    await knex('sale_items').whereIn('sale_id', knex('sales').where('sale_number', 'like', 'RP-%').select('id')).delete();
    await knex('sales').where('sale_number', 'like', 'RP-%').delete();
    await cleanupUsersByEmailLike('rp-%@example.com');
    await knex('products').where({ name: 'RP Test Product' }).delete();

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: PLAIN_EMAIL, password: PASS });

    const ownerRow = await knex('users').where({ email: OWNER_EMAIL }).select('id').first();
    ownerId = ownerRow.id;

    const [p] = await knex('products').insert({
        name: 'RP Test Product', category: 'Clothing', is_active: true, created_by: ownerId,
    }).returning('id');
    productId = p.id;

    const [vA] = await knex('product_variants').insert({
        product_id: productId, cost_price: 60, selling_price: 100,
        stock: 100, low_stock_threshold: 5, is_active: true,
    }).returning('id');
    variantAId = vA.id;

    const [vB] = await knex('product_variants').insert({
        product_id: productId, cost_price: 50, selling_price: 80,
        stock: 100, low_stock_threshold: 5, is_active: true,
    }).returning('id');
    variantBId = vB.id;

    // Sale 1 — cash, 2020-01-15, variantA qty 2 → revenue 200, cost 120
    const [s1] = await knex('sales').insert({
        sale_number: 'RP-20200115-0001', staff_id: ownerId,
        payment_method: 'cash', payment_status: 'paid',
        amount_due: 200, amount_tendered: 200, change_given: 0, discount: 0,
        created_at: new Date('2020-01-15T10:00:00Z'),
    }).returning('id');
    await knex('sale_items').insert({
        sale_id: s1.id, variant_id: variantAId,
        quantity: 2, unit_price: 100, line_total: 200, cost_price_snapshot: 60,
    });

    // Sale 2 — momo, 2020-01-15, variantB qty 3 → revenue 240, cost 150
    const [s2] = await knex('sales').insert({
        sale_number: 'RP-20200115-0002', staff_id: ownerId,
        payment_method: 'momo', payment_status: 'paid',
        amount_due: 240, discount: 0,
        created_at: new Date('2020-01-15T14:00:00Z'),
    }).returning('id');
    await knex('sale_items').insert({
        sale_id: s2.id, variant_id: variantBId,
        quantity: 3, unit_price: 80, line_total: 240, cost_price_snapshot: 50,
    });

    // Sale 3 — voided, should be excluded from all reports
    const [s3] = await knex('sales').insert({
        sale_number: 'RP-20200115-0003', staff_id: ownerId,
        payment_method: 'cash', payment_status: 'paid',
        amount_due: 100, amount_tendered: 100, change_given: 0, discount: 0,
        voided_at: new Date('2020-01-15T17:00:00Z'), voided_by_id: ownerId,
        created_at: new Date('2020-01-15T16:00:00Z'),
    }).returning('id');
    await knex('sale_items').insert({
        sale_id: s3.id, variant_id: variantAId,
        quantity: 1, unit_price: 100, line_total: 100, cost_price_snapshot: 60,
    });
});

afterAll(async () => {
    await knex('sale_items').whereIn('sale_id', knex('sales').where('sale_number', 'like', 'RP-%').select('id')).delete();
    await knex('sales').where('sale_number', 'like', 'RP-%').delete();
    if (productId) {
        await knex('product_variants').where({ product_id: productId }).delete();
        await knex('products').where({ id: productId }).delete();
    }
    await cleanupUsersByEmailLike('rp-%@example.com');
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

describe('GET /api/reports/summary', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/summary?period=monthly');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        const res = await s.get('/api/reports/summary?period=monthly&date=2020-01-15');
        expect(res.status).toBe(403);
    });

    it('returns 422 when period is missing', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary');
        expect(res.status).toBe(422);
    });

    it('returns 422 when period is invalid', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=yearly');
        expect(res.status).toBe(422);
    });

    it('returns 422 when date format is invalid', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=monthly&date=15-01-2020');
        expect(res.status).toBe(422);
    });

    it('returns 200 with correct headline numbers for monthly period', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('OK');
        const d = res.body.data;
        expect(d.period).toBe('monthly');
        expect(d.from).toBe('2020-01-01');
        expect(d.to).toBe('2020-01-31');
        expect(Number(d.revenue)).toBe(440);
        expect(Number(d.cost)).toBe(270);
        expect(Number(d.profit)).toBe(170);
        expect(Number(d.marginPercent)).toBeCloseTo(38.6, 0);
        expect(d.salesCount).toBe(2);
        expect(d.unitsSold).toBe(5);
    });

    it('excludes voided sales from the totals', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data.salesCount).toBe(2);
        expect(Number(res.body.data.revenue)).toBe(440);
    });

    it('returns zeros for a period with no sales', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.revenue)).toBe(0);
        expect(Number(res.body.data.profit)).toBe(0);
        expect(res.body.data.salesCount).toBe(0);
    });

    it('returns correct data for annual period', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/summary?period=annual&date=2020-06-01');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.revenue)).toBe(440);
        expect(res.body.data.from).toBe('2020-01-01');
        expect(res.body.data.to).toBe('2020-12-31');
    });
});

describe('GET /api/reports/profit', () => {
    let owner: Awaited<ReturnType<typeof login>>;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/profit?period=monthly&date=2020-01-15');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/profit?period=monthly&date=2020-01-15')).status).toBe(403);
    });

    it('returns 422 when groupBy is invalid', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2020-01-15&groupBy=brand');
        expect(res.status).toBe(422);
    });

    it('returns breakdown grouped by category', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2020-01-15&groupBy=category');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
        const clothing = res.body.data.find((r: any) => r.group === 'Clothing');
        expect(clothing).toBeDefined();
        expect(Number(clothing.revenue)).toBe(440);
        expect(Number(clothing.cost)).toBe(270);
        expect(Number(clothing.profit)).toBe(170);
        expect(typeof clothing.margin).toBe('number');
    });

    it('returns breakdown grouped by product', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2020-01-15&groupBy=product');
        expect(res.status).toBe(200);
        const product = res.body.data.find((r: any) => r.group === 'RP Test Product');
        expect(product).toBeDefined();
        expect(Number(product.revenue)).toBe(440);
    });

    it('returns breakdown grouped by payment_method', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2020-01-15&groupBy=payment_method');
        expect(res.status).toBe(200);
        const cash = res.body.data.find((r: any) => r.group === 'cash');
        const momo = res.body.data.find((r: any) => r.group === 'momo');
        expect(cash).toBeDefined();
        expect(momo).toBeDefined();
        expect(Number(cash.revenue)).toBe(200);
        expect(Number(cash.cost)).toBe(120);
        expect(Number(cash.profit)).toBe(80);
        expect(Number(momo.revenue)).toBe(240);
        expect(Number(momo.cost)).toBe(150);
        expect(Number(momo.profit)).toBe(90);
    });

    it('defaults groupBy to category', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data[0]).toHaveProperty('group');
    });

    it('returns empty array for period with no sales', async () => {
        const res = await owner.get('/api/reports/profit?period=monthly&date=2019-06-01&groupBy=category');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });
});

describe('GET /api/reports/top-products', () => {
    let owner: Awaited<ReturnType<typeof login>>;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/top-products?period=monthly&date=2020-01-15');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/top-products?period=monthly&date=2020-01-15')).status).toBe(403);
    });

    it('returns ranked variants with correct structure', async () => {
        const res = await owner.get('/api/reports/top-products?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        const first = res.body.data[0];
        expect(first).toHaveProperty('variantId');
        expect(first).toHaveProperty('productName');
        expect(first).toHaveProperty('unitsSold');
        expect(first).toHaveProperty('revenue');
    });

    it('ranks by units sold descending — variantB (3 units) before variantA (2 units)', async () => {
        const res = await owner.get('/api/reports/top-products?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data[0].variantId).toBe(variantBId);
        expect(res.body.data[0].unitsSold).toBe(3);
        expect(res.body.data[1].variantId).toBe(variantAId);
        expect(res.body.data[1].unitsSold).toBe(2);
    });

    it('respects the limit param', async () => {
        const res = await owner.get('/api/reports/top-products?period=monthly&date=2020-01-15&limit=1');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it('excludes voided sales from variant rankings', async () => {
        const res = await owner.get('/api/reports/top-products?period=monthly&date=2020-01-15');
        const variantARow = res.body.data.find((r: any) => r.variantId === variantAId);
        expect(variantARow.unitsSold).toBe(2);
    });

    it('returns empty array for period with no sales', async () => {
        const res = await owner.get('/api/reports/top-products?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });
});

describe('GET /api/reports/chart', () => {
    let owner: Awaited<ReturnType<typeof login>>;

    beforeAll(async () => {
        owner = await login(OWNER_EMAIL);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/chart?period=monthly&date=2020-01-15');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/chart?period=monthly&date=2020-01-15')).status).toBe(403);
    });

    it('returns 422 when metric is invalid', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2020-01-15&metric=sales');
        expect(res.status).toBe(422);
    });

    it('returns labels and values arrays for monthly period (31 days)', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2020-01-15&metric=revenue');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('OK');
        const { labels, values } = res.body.data;
        expect(labels).toHaveLength(31);
        expect(values).toHaveLength(31);
        expect(labels[0]).toBe('1');
        expect(labels[14]).toBe('15');
    });

    it('places revenue value at day 15 index (index 14) for monthly metric=revenue', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2020-01-15&metric=revenue');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.values[14])).toBe(440);
        expect(res.body.data.values[0]).toBe(0);
    });

    it('returns profit values correctly at day 15 for metric=profit', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2020-01-15&metric=profit');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.values[14])).toBe(170);
    });

    it('returns units values correctly at day 15 for metric=units', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2020-01-15&metric=units');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.values[14])).toBe(5);
    });

    it('returns 12 labels for annual period', async () => {
        const res = await owner.get('/api/reports/chart?period=annual&date=2020-01-01');
        expect(res.status).toBe(200);
        const { labels, values } = res.body.data;
        expect(labels).toHaveLength(12);
        expect(labels[0]).toBe('Jan');
        expect(labels[11]).toBe('Dec');
        expect(Number(values[0])).toBe(440);
        expect(values[11]).toBe(0);
    });

    it('returns 7 labels for weekly period', async () => {
        const res = await owner.get('/api/reports/chart?period=weekly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data.labels).toHaveLength(7);
    });

    it('returns 3 labels for quarterly period', async () => {
        const res = await owner.get('/api/reports/chart?period=quarterly&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data.labels).toHaveLength(3);
    });

    it('returns 24 labels for daily period', async () => {
        const res = await owner.get('/api/reports/chart?period=daily&date=2020-01-15');
        expect(res.status).toBe(200);
        expect(res.body.data.labels).toHaveLength(24);
        expect(res.body.data.labels[0]).toBe('0');
        expect(res.body.data.labels[10]).toBe('10');
    });

    it('returns all zeros for a period with no sales', async () => {
        const res = await owner.get('/api/reports/chart?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data.values.every((v: number) => v === 0)).toBe(true);
    });
});
