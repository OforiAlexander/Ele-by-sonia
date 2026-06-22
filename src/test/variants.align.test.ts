/**
 * Variants alignment tests.
 * Verify that variant endpoints match the frontend ProductVariant type.
 *
 * Key shape facts:
 * - POST /api/variants (not /api/products/:id/variants)
 *   body: { product_id, cost_price, selling_price, optionValueIds: [], low_stock_threshold?, sku? }
 * - stock starts at 0 on creation; numeric not string
 * - cost_price / selling_price are decimal strings not numbers
 * - GET /api/variants?productId=UUID → { data: variant[] } (flat array)
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { ProductVariant } from '../client/common/types';
import { productVariantSchema } from './schemas';
import {
    createTestUser, cleanupUserCascade, loginAgent,
    createTestProduct, cleanupTestProduct,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const EMAIL = 'variants-align@example.com';
let userId = '';
let productId = '';

beforeAll(async () => {
    await connectDb();
    await cleanupUserCascade(EMAIL);
    const { user } = await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
    userId = user.id;
    const product = await createTestProduct({}, userId);
    productId = product.id;
});

afterAll(async () => {
    await cleanupTestProduct(productId).catch(() => undefined);
    await cleanupUserCascade(EMAIL);
    await disconnectDb();
});

// ─── POST /api/variants — request shape the frontend sends ──────────────────

describe('POST /api/variants — accepts the frontend form payload', () => {
    it('accepts minimum payload with empty optionValueIds', async () => {
        // Exact shape the frontend VariantForm sends
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 30,
            selling_price: 60,
            optionValueIds: [],     // required even when no options exist
            low_stock_threshold: 2,
        });

        expect(res.status).toBe(201);

        // Compile-time: TypeScript must agree this is assignable to ProductVariant
        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.product_id).toBe(productId);

        await expect(
            productVariantSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('accepts optional sku field', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 40,
            selling_price: 80,
            optionValueIds: [],
            sku: 'ALIGN-SKU-001',
        });

        expect(res.status).toBe(201);
        expect(res.body.data.sku).toBe('ALIGN-SKU-001');
    });

    it('returns 422 when product_id is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            cost_price: 30,
            selling_price: 60,
            optionValueIds: [],
        });
        expect(res.status).toBe(422);
    });

    it('returns 422 when optionValueIds array is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 30,
            selling_price: 60,
        });
        expect(res.status).toBe(422);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/variants').send({
            product_id: productId,
            cost_price: 30,
            selling_price: 60,
            optionValueIds: [],
        });
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/variants — list shape ─────────────────────────────────────────

describe('GET /api/variants?productId= — response shape matches ProductVariant[]', () => {
    it('returns flat array — no pagination wrapper', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/variants?productId=${productId}`);

        expect(res.status).toBe(200);
        // Variants list is a flat array (unlike products/sales which have pagination)
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('each variant validates against productVariantSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/variants?productId=${productId}`);

        for (const v of res.body.data) {
            await expect(
                productVariantSchema.validate(v, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('requires productId query param — returns 422 without it', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/variants');
        expect(res.status).toBe(422);
    });
});

// ─── Type-specific assertions the frontend relies on ─────────────────────────

describe('variant field types — frontend uses these as specific JS types', () => {
    it('stock is a JS number — POS uses it for arithmetic', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/variants?productId=${productId}`);

        for (const v of res.body.data) {
            expect(typeof v.stock).toBe('number');
            expect(typeof v.low_stock_threshold).toBe('number');
        }
    });

    it('cost_price and selling_price are strings — frontend parses via parseFloat', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/variants?productId=${productId}`);

        for (const v of res.body.data) {
            expect(typeof v.cost_price).toBe('string');
            expect(typeof v.selling_price).toBe('string');
        }
    });

    it('stock starts at 0 on creation — not from POST body', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const createRes = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 25,
            selling_price: 50,
            optionValueIds: [],
        });

        expect(createRes.status).toBe(201);
        expect(createRes.body.data.stock).toBe(0);
    });
});
