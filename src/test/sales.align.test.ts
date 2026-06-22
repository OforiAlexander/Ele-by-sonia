/**
 * Sales / POS alignment tests.
 * Verify that the POS sale payload matches what the backend accepts, and that
 * sale responses match the frontend Sale type.
 *
 * Key shape facts:
 * - POST /api/sales body: { payment_method, items: [{variant_id, quantity}] }
 *   Items do NOT include selling_price (backend reads it from the variant)
 * - Response sale has: id, sale_number, payment_method, payment_status,
 *   amount_due, amount_tendered, change_given, discount, created_at
 * - GET /api/sales returns { data: { sales: [], total, page, limit } }
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { Sale, PaginatedSales } from '../client/common/types';
import { saleSchema, paginatedSalesSchema } from './schemas';
import {
    createTestUser, cleanupUserCascade, loginAgent,
    createTestProduct, cleanupTestProduct,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';
import knex from '../server/models/_config';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));
jest.mock('../server/services/mail/send-mail', () => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();
const EMAIL = 'sales-align@example.com';
let userId = '';
let productId = '';
let variantId = '';

beforeAll(async () => {
    await connectDb();
    await cleanupUserCascade(EMAIL);
    const { user } = await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
    userId = user.id;

    const product = await createTestProduct({}, userId);
    productId = product.id;

    // Create variant directly via DB to avoid depending on variants endpoint
    const [variant] = await knex('product_variants').insert({
        product_id: productId,
        cost_price: '50.00',
        selling_price: '100.00',
        stock: 50,
        low_stock_threshold: 3,
        is_active: true,
        sku: null,
    }).returning('*');
    variantId = variant.id;
});

afterAll(async () => {
    // Clean sales that reference this variant before dropping the variant
    if (!variantId) { await cleanupUserCascade(EMAIL); await disconnectDb(); return; }
    const saleItems = await knex('sale_items').where({ variant_id: variantId }).select('sale_id');
    const saleIds = saleItems.map((r: { sale_id: string }) => r.sale_id);
    if (saleIds.length > 0) {
        await knex('sale_items').whereIn('sale_id', saleIds).delete();
        await knex('audit_logs').whereIn('entity_id', saleIds).delete();
        await knex('sales').whereIn('id', saleIds).delete();
    }
    await cleanupUserCascade(EMAIL);
    await disconnectDb();
});

// ─── POST /api/sales — POS sale request shape ────────────────────────────────

describe('POST /api/sales — accepts the POS sale payload the frontend sends', () => {
    it('accepts cash sale — items have only variant_id and quantity', async () => {
        // Exact shape PosPage sends — no selling_price in items; amount_tendered required for cash
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'cash',
            amount_tendered: '200',
            items: [{ variant_id: variantId, quantity: 1 }],
        });

        expect(res.status).toBe(201);
    });

    it('cash sale response validates against saleSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'cash',
            amount_tendered: '200',
            items: [{ variant_id: variantId, quantity: 1 }],
        });

        expect(res.status).toBe(201);

        // Compile-time: TypeScript must agree this is assignable to Sale
        const sale: Sale = res.body.data as Sale;
        expect(sale.payment_method).toBe('cash');
        expect(typeof sale.amount_due).toBe('string');

        await expect(
            saleSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('sale response uses amount_due not total_amount — frontend must use amount_due', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'cash',
            amount_tendered: '200',
            items: [{ variant_id: variantId, quantity: 1 }],
        });

        expect(res.body.data).toHaveProperty('amount_due');
        expect(res.body.data).not.toHaveProperty('total_amount');
    });

    it('sale_number follows SL-YYYYMMDD-NNNN format', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'cash',
            amount_tendered: '200',
            items: [{ variant_id: variantId, quantity: 1 }],
        });

        expect(res.body.data.sale_number).toMatch(/^SL-\d{8}-\d{4}$/);
    });

    it('returns 422 when items array is empty', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'cash',
            items: [],
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when payment_method is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            items: [{ variant_id: variantId, quantity: 1 }],
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when payment_method is invalid — frontend only sends cash or momo', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/sales').send({
            payment_method: 'card',
            items: [{ variant_id: variantId, quantity: 1 }],
        });
        expect(res.status).toBe(422);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/sales').send({
            payment_method: 'cash',
            items: [{ variant_id: variantId, quantity: 1 }],
        });
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/sales — list shape the frontend reads ──────────────────────────

describe('GET /api/sales — response shape matches PaginatedSales', () => {
    it('returns data.sales array with pagination inside data', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/sales');

        expect(res.status).toBe(200);

        // Compile-time: TypeScript must agree
        const data: PaginatedSales = res.body.data as PaginatedSales;
        expect(Array.isArray(data.sales)).toBe(true);
        expect(typeof data.total).toBe('number');

        await expect(
            paginatedSalesSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('pagination is inside data — not at response root', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/sales');

        expect(res.body.data).toHaveProperty('sales');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limit');
        expect(res.body.meta).toBeUndefined();
    });

    it('each sale in the list validates against saleSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/sales');

        for (const sale of res.body.data.sales) {
            await expect(
                saleSchema.validate(sale, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });
});
