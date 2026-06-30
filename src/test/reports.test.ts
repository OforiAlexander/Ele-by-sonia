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
let sale4Id: string;
let saleItem4Id: string;

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

    // Sale 4 — separate year window, isolated from the annual-period assertions above
    const [s4] = await knex('sales').insert({
        sale_number: 'RP-20210310-0001', staff_id: ownerId,
        payment_method: 'cash', payment_status: 'paid',
        amount_due: 200, amount_tendered: 200, change_given: 0, discount: 10,
        levy_amount: 8, vat_amount: 20, nhil_amount: 5, getfund_amount: 5, covid_levy_amount: 3,
        created_at: new Date('2021-03-10T09:00:00Z'),
    }).returning('id');
    sale4Id = s4.id;
    const [si4] = await knex('sale_items').insert({
        sale_id: sale4Id, variant_id: variantAId,
        quantity: 2, unit_price: 100, line_total: 200, cost_price_snapshot: 60,
    }).returning('id');
    saleItem4Id = si4.id;

    const [sr1] = await knex('sale_returns').insert({
        sale_id: sale4Id, processed_by_id: ownerId, refund_method: 'cash',
        created_at: new Date('2021-03-10T15:00:00Z'),
    }).returning('id');
    await knex('sale_return_items').insert({
        return_id: sr1.id, sale_item_id: saleItem4Id, quantity: 1,
        created_at: new Date('2021-03-10T15:00:00Z'),
    });

    await knex('stock_entries').insert([
        { variant_id: variantAId, quantity: 50, note: 'RP restock', created_by: ownerId, created_at: new Date('2021-03-10T08:00:00Z') },
        { variant_id: variantAId, quantity: -5, note: 'RP damaged', created_by: ownerId, created_at: new Date('2021-03-10T08:30:00Z') },
    ]);

    await knex('audit_logs').insert([
        { user_id: ownerId, action: 'STOCK_ADDED', entity_type: 'variant', entity_id: variantAId, after: { quantity: 50 }, created_at: new Date('2021-03-10T08:00:00Z') },
        { user_id: ownerId, action: 'SALE_VOIDED', entity_type: 'sale', entity_id: sale4Id, before: { voided_at: null }, created_at: new Date('2021-03-10T16:00:00Z') },
    ]);
});

afterAll(async () => {
    const rpSaleIds = knex('sales').where('sale_number', 'like', 'RP-%').select('id');
    const rpReturnIds = knex('sale_returns').whereIn('sale_id', rpSaleIds).select('id');
    await knex('sale_return_items').whereIn('return_id', rpReturnIds).delete();
    await knex('sale_returns').whereIn('sale_id', rpSaleIds).delete();
    await knex('sale_items').whereIn('sale_id', rpSaleIds).delete();
    await knex('sales').where('sale_number', 'like', 'RP-%').delete();
    if (productId) {
        await knex('stock_entries').where({ variant_id: variantAId }).orWhere({ variant_id: variantBId }).delete();
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

describe('GET /api/reports/profit?groupBy=staff', () => {
    it('groups revenue and cost by staff member', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/profit?period=monthly&date=2020-01-15&groupBy=staff');
        expect(res.status).toBe(200);
        const row = res.body.data.find((r: any) => r.group === 'Test User');
        expect(row).toBeDefined();
        expect(Number(row.revenue)).toBe(440);
        expect(Number(row.cost)).toBe(270);
        expect(Number(row.profit)).toBe(170);
    });
});

describe('GET /api/reports/tax', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/tax?period=monthly&date=2021-03-10');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/tax?period=monthly&date=2021-03-10')).status).toBe(403);
    });

    it('sums each levy/tax column for the period', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/tax?period=monthly&date=2021-03-10');
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.from).toBe('2021-03-01');
        expect(d.to).toBe('2021-03-31');
        expect(Number(d.vat)).toBe(20);
        expect(Number(d.nhil)).toBe(5);
        expect(Number(d.getfund)).toBe(5);
        expect(Number(d.covidLevy)).toBe(3);
        expect(Number(d.levy)).toBe(8);
        expect(Number(d.totalTax)).toBe(41);
    });

    it('returns zeros for a period with no sales', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/tax?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(Number(res.body.data.totalTax)).toBe(0);
    });
});

describe('GET /api/reports/stock-movements', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/stock-movements?period=monthly&date=2021-03-10');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/stock-movements?period=monthly&date=2021-03-10')).status).toBe(403);
    });

    it('totals added/removed quantity and lists entries with product and staff names', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/stock-movements?period=monthly&date=2021-03-10');
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.totalAdded).toBe(50);
        expect(d.totalRemoved).toBe(5);
        expect(d.entryCount).toBe(2);
        expect(d.entries).toHaveLength(2);
        expect(d.entries[0].productName).toBe('RP Test Product');
        expect(d.entries[0].staffName).toBe('Test User');
    });

    it('returns empty entries for a period with no movements', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/stock-movements?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data.entries).toHaveLength(0);
        expect(res.body.data.totalAdded).toBe(0);
    });
});

describe('GET /api/reports/returns', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/returns?period=monthly&date=2021-03-10');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/returns?period=monthly&date=2021-03-10')).status).toBe(403);
    });

    it('counts and totals returned value, broken down by staff', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/returns?period=monthly&date=2021-03-10');
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.returnCount).toBe(1);
        expect(Number(d.returnTotal)).toBe(100);
        expect(d.byStaff).toHaveLength(1);
        expect(d.byStaff[0].staffName).toBe('Test User');
        expect(d.byStaff[0].count).toBe(1);
        expect(Number(d.byStaff[0].total)).toBe(100);
    });

    it('returns zeros for a period with no returns', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/returns?period=monthly&date=2019-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data.returnCount).toBe(0);
        expect(res.body.data.byStaff).toHaveLength(0);
    });
});

describe('GET /api/reports/activity', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/activity');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/activity')).status).toBe(403);
    });

    it('filters by exact date range to the two seeded entries', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/activity?from=2021-03-10&to=2021-03-10&limit=50');
        expect(res.status).toBe(200);
        expect(res.body.data.logs).toHaveLength(2);
        expect(res.body.data.logs[0].action).toBe('SALE_VOIDED');
        expect(res.body.data.logs[1].action).toBe('STOCK_ADDED');
    });

    it('filters by action', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/activity?action=STOCK_ADDED&from=2021-03-10&to=2021-03-10');
        expect(res.status).toBe(200);
        expect(res.body.data.logs).toHaveLength(1);
        expect(res.body.data.logs[0].entityType).toBe('variant');
        expect(res.body.data.logs[0].entityId).toBe(variantAId);
    });

    it('filters by entityType', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/activity?entityType=sale&from=2021-03-10&to=2021-03-10');
        expect(res.status).toBe(200);
        expect(res.body.data.logs).toHaveLength(1);
        expect(res.body.data.logs[0].action).toBe('SALE_VOIDED');
    });

    it('respects page/limit pagination', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/activity?from=2021-03-10&to=2021-03-10&limit=1&page=1');
        expect(res.status).toBe(200);
        expect(res.body.data.logs).toHaveLength(1);
        expect(res.body.data.limit).toBe(1);
        expect(res.body.data.total).toBe(2);
    });
});

describe('GET /api/reports/reconciliation', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/reconciliation?period=monthly&date=2021-03-10');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_view_reports', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/reports/reconciliation?period=monthly&date=2021-03-10')).status).toBe(403);
    });

    it('computes cash/momo split, COGS, discounts, levy, returns, and net cash expected', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/reconciliation?period=monthly&date=2021-03-10');
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.cashCount).toBe(1);
        expect(Number(d.cashTotal)).toBe(200);
        expect(d.momoCount).toBe(0);
        expect(Number(d.momoTotal)).toBe(0);
        expect(Number(d.totalRevenue)).toBe(200);
        expect(d.totalTransactions).toBe(1);
        expect(d.unitsSold).toBe(2);
        expect(Number(d.cogsTotal)).toBe(120);
        expect(Number(d.grossProfit)).toBe(80);
        expect(Number(d.discountTotal)).toBe(10);
        expect(d.returnCount).toBe(1);
        expect(Number(d.returnTotal)).toBe(100);
        expect(d.voidCount).toBe(0);
        expect(Number(d.voidTotal)).toBe(0);
        expect(Number(d.levyTotal)).toBe(8);
        expect(Number(d.netCashExpected)).toBe(100);
    });

    it('counts a voided sale in voidCount/voidTotal but excludes it from revenue', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/reports/reconciliation?period=monthly&date=2020-01-15');
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.voidCount).toBe(1);
        expect(Number(d.voidTotal)).toBe(100);
        expect(Number(d.totalRevenue)).toBe(440);
        expect(d.totalTransactions).toBe(2);
    });
});
