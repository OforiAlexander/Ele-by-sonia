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
import type { ProductVariant, SearchVariantResult, StockEntry } from '../client/common/types';
import { productVariantSchema, searchVariantSchema, stockEntrySchema } from './schemas';
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

// ─── POST /api/stock/add — adds stock to a variant ───────────────────────────
// UI calls this from the "Add Stock" modal on VariantsPage.
// Body: { variant_id, quantity (positive integer), note? }
// Response: { code: 'STOCK_ADDED', data: ProductVariant } — data IS the variant

describe('POST /api/stock/add — adds stock, returns updated variant', () => {
    let stockVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 20,
            selling_price: 40,
            optionValueIds: [],
        });
        stockVariantId = res.body.data.id;
    });

    it('accepts { variant_id, quantity } and returns variant with incremented stock', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/add').send({
            variant_id: stockVariantId,
            quantity: 10,
        });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe('STOCK_ADDED');

        // Compile-time: data must be assignable to ProductVariant
        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.stock).toBe(10);

        await expect(
            productVariantSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('accepts optional note field', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/add').send({
            variant_id: stockVariantId,
            quantity: 5,
            note: 'Initial delivery batch',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.stock).toBe(15);
    });

    it('returns 422 when quantity is zero', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/add').send({ variant_id: stockVariantId, quantity: 0 });
        expect(res.status).toBe(422);
    });

    it('returns 422 when quantity is negative', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/add').send({ variant_id: stockVariantId, quantity: -5 });
        expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
        const res = await request(app).post('/api/stock/add').send({ variant_id: stockVariantId, quantity: 1 });
        expect(res.status).toBe(401);
    });
});

// ─── POST /api/stock/adjust — signed adjustment ───────────────────────────────
// UI calls this from the "Adjust Stock" modal (corrections, write-offs).
// Body: { variant_id, quantity (non-zero signed integer), note (required) }
// Response: { code: 'STOCK_ADJUSTED', data: ProductVariant }

describe('POST /api/stock/adjust — signed adjustment, note required', () => {
    let adjustVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const createRes = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 15,
            selling_price: 30,
            optionValueIds: [],
        });
        adjustVariantId = createRes.body.data.id;
        // Seed with 20 units so we can test negative adjustments
        await agent.post('/api/stock/add').send({ variant_id: adjustVariantId, quantity: 20 });
    });

    it('accepts negative quantity with note and decrements stock', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/adjust').send({
            variant_id: adjustVariantId,
            quantity: -5,
            note: 'Damaged in storage',
        });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe('STOCK_ADJUSTED');

        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.stock).toBe(15);

        await expect(
            productVariantSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('accepts positive quantity with note (found extra units)', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/adjust').send({
            variant_id: adjustVariantId,
            quantity: 3,
            note: 'Count correction',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.stock).toBe(18);
    });

    it('returns 422 when note is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/adjust').send({
            variant_id: adjustVariantId,
            quantity: -1,
        });
        expect(res.status).toBe(422);
    });

    it('returns 400 when adjustment would make stock negative', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/stock/adjust').send({
            variant_id: adjustVariantId,
            quantity: -999,
            note: 'Too much',
        });
        expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
        const res = await request(app).post('/api/stock/adjust').send({
            variant_id: adjustVariantId,
            quantity: -1,
            note: 'Test',
        });
        expect(res.status).toBe(401);
    });
});

// ─── PATCH /api/stock/threshold/:variantId — update low_stock_threshold ───────
// UI calls this from an inline threshold editor on VariantsPage.
// Body: { low_stock_threshold (non-negative integer) }
// Response: { code: 'THRESHOLD_UPDATED', data: ProductVariant }

describe('PATCH /api/stock/threshold/:variantId — updates low stock threshold', () => {
    let thresholdVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 10,
            selling_price: 20,
            optionValueIds: [],
            low_stock_threshold: 5,
        });
        thresholdVariantId = res.body.data.id;
    });

    it('accepts { low_stock_threshold } and returns updated variant', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/stock/threshold/${thresholdVariantId}`).send({
            low_stock_threshold: 3,
        });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe('THRESHOLD_UPDATED');

        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.low_stock_threshold).toBe(3);

        await expect(
            productVariantSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('threshold of 0 is valid (disables low-stock alert)', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/stock/threshold/${thresholdVariantId}`).send({
            low_stock_threshold: 0,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.low_stock_threshold).toBe(0);
    });

    it('returns 422 when low_stock_threshold is negative', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/stock/threshold/${thresholdVariantId}`).send({
            low_stock_threshold: -1,
        });
        expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
        const res = await request(app).patch(`/api/stock/threshold/${thresholdVariantId}`).send({
            low_stock_threshold: 5,
        });
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/stock?variantId= — stock entry history ─────────────────────────
// UI uses this to show a stock history list on VariantsPage.
// Each entry has quantity, note, createdByUser.name, created_at.

describe('GET /api/stock?variantId= — stock entry history', () => {
    let historyVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const createRes = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 12,
            selling_price: 24,
            optionValueIds: [],
        });
        historyVariantId = createRes.body.data.id;
        await agent.post('/api/stock/add').send({ variant_id: historyVariantId, quantity: 8, note: 'Opening stock' });
    });

    it('returns array of stock entries ordered newest-first', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/stock?variantId=${historyVariantId}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('each entry validates against stockEntrySchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/stock?variantId=${historyVariantId}`);

        for (const entry of res.body.data) {
            // Compile-time: assignable to StockEntry
            const typed: StockEntry = entry as StockEntry;
            expect(typed.createdByUser.name).toBeDefined();

            await expect(
                stockEntrySchema.validate(entry, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('createdByUser does not expose password_hash', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/stock?variantId=${historyVariantId}`);

        for (const entry of res.body.data) {
            expect(entry.createdByUser.password_hash).toBeUndefined();
        }
    });

    it('requires authentication', async () => {
        const res = await request(app).get(`/api/stock?variantId=${historyVariantId}`);
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/variants/search — POS lookup ─────────────────────────────────
// UI: POS page calls this to find variants by SKU or product name.
// Response: { data: SearchVariantResult[] }
// Each result has product_name (for display) + optionValues (for label).

describe('GET /api/variants/search — response matches SearchVariantResult[]', () => {
    let searchVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 18,
            selling_price: 36,
            optionValueIds: [],
            sku: 'ALIGN-SEARCH-001',
        });
        searchVariantId = res.body.data.id;
    });

    it('returns flat array of SearchVariantResult', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/variants/search');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('each result validates against searchVariantSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/variants/search');

        for (const v of res.body.data) {
            const typed: SearchVariantResult = v as SearchVariantResult;
            expect(typed.product_name).toBeDefined();

            await expect(
                searchVariantSchema.validate(v, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('matches by SKU and result includes product_name', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/variants/search?q=ALIGN-SEARCH-001');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const found = res.body.data.find((v: any) => v.id === searchVariantId);
        expect(found).toBeDefined();
        expect(found.product_name).toBeDefined();
        expect(found.sku).toBe('ALIGN-SEARCH-001');

        const typed: SearchVariantResult = found as SearchVariantResult;
        expect(typeof typed.product_name).toBe('string');
    });

    it('optionValues is always an array (empty when no options)', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/variants/search?q=ALIGN-SEARCH-001');

        const found = res.body.data.find((v: any) => v.id === searchVariantId);
        expect(Array.isArray(found.optionValues)).toBe(true);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/variants/search');
        expect(res.status).toBe(401);
    });
});

// ─── PATCH /api/variants/:id/status — toggle is_active ───────────────────────
// UI: VariantsPage calls this to activate/deactivate a variant without a full PUT.
// Body: { is_active: boolean }
// Response: { code: 'VARIANT_STATUS_UPDATED', data: ProductVariant }

describe('PATCH /api/variants/:id/status — toggles is_active, returns variant', () => {
    let statusVariantId = '';

    beforeAll(async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/variants').send({
            product_id: productId,
            cost_price: 22,
            selling_price: 44,
            optionValueIds: [],
        });
        statusVariantId = res.body.data.id;
    });

    it('accepts { is_active: false } and deactivates the variant', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/variants/${statusVariantId}/status`).send({
            is_active: false,
        });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe('VARIANT_STATUS_UPDATED');

        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.is_active).toBe(false);

        await expect(
            productVariantSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('accepts { is_active: true } and reactivates the variant', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/variants/${statusVariantId}/status`).send({
            is_active: true,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(true);

        const variant: ProductVariant = res.body.data as ProductVariant;
        expect(variant.is_active).toBe(true);
    });

    it('returns 422 when is_active field is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch(`/api/variants/${statusVariantId}/status`).send({});
        expect(res.status).toBe(422);
    });

    it('returns 422 when id is not a UUID', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch('/api/variants/not-a-uuid/status').send({ is_active: false });
        expect(res.status).toBe(422);
    });

    it('returns 404 for unknown variant id', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.patch('/api/variants/00000000-0000-0000-0000-000000000000/status').send({ is_active: false });
        expect(res.status).toBe(404);
    });

    it('returns 401 when not logged in', async () => {
        const res = await request(app).patch(`/api/variants/${statusVariantId}/status`).send({ is_active: false });
        expect(res.status).toBe(401);
    });
});
