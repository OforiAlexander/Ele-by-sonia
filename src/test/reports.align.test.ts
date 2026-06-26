/**
 * Reports alignment tests.
 * Verify that every /api/reports/* endpoint returns data matching the shapes
 * the frontend reads, and that required query parameters are enforced.
 *
 * Schema source of truth: src/test/schemas.ts
 * Frontend type source:   src/client/common/types/index.ts
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import {
    stockHealthSchema,
    reportsSummarySchema,
    chartSchema,
    topProductSchema,
    profitBreakdownItemSchema,
} from './schemas';
import {
    createTestUser, cleanupUserCascade, loginAgent,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const EMAIL = 'reports-align@example.com';

beforeAll(async () => {
    await connectDb();
    await cleanupUserCascade(EMAIL);
    await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
});

afterAll(async () => {
    await cleanupUserCascade(EMAIL);
    await disconnectDb();
});

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

describe('GET /api/reports/summary', () => {
    it('accepts all valid period values', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
        for (const period of periods) {
            const res = await agent.get(`/api/reports/summary?period=${period}`);
            expect(res.status).toBe(200);
        }
    });

    it('validates against reportsSummarySchema for every period', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
        for (const period of periods) {
            const res = await agent.get(`/api/reports/summary?period=${period}`);
            await expect(
                reportsSummarySchema.validate(res.body.data, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('rejects invalid period with 422', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=hourly');
        expect(res.status).toBe(422);
    });

    it('rejects missing period with 422', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary');
        expect(res.status).toBe(422);
    });

    it('accepts optional date param in YYYY-MM-DD format', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=monthly&date=2025-01-01');
        expect(res.status).toBe(200);
    });

    it('rejects malformed date with 422', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=monthly&date=01-01-2025');
        expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/reports/summary?period=annual');
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/reports/chart ───────────────────────────────────────────────────

describe('GET /api/reports/chart', () => {
    it('returns {labels, values} arrays of equal length', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/chart?period=annual&metric=revenue');

        expect(res.status).toBe(200);
        expect(res.body.data.labels.length).toBe(res.body.data.values.length);
    });

    it('validates against chartSchema for all metrics', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const metrics = ['revenue', 'profit', 'units'];
        for (const metric of metrics) {
            const res = await agent.get(`/api/reports/chart?period=annual&metric=${metric}`);
            await expect(
                chartSchema.validate(res.body.data, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('annual period produces exactly 12 labels', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/chart?period=annual&metric=revenue');
        expect(res.body.data.labels).toHaveLength(12);
        expect(res.body.data.values).toHaveLength(12);
    });

    it('rejects invalid metric with 422', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/chart?period=annual&metric=expenses');
        expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/reports/chart?period=annual');
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/reports/top-products ───────────────────────────────────────────

describe('GET /api/reports/top-products', () => {
    it('returns an array', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/top-products?period=annual');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('each item validates against topProductSchema when data exists', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/top-products?period=annual&limit=10');

        for (const item of res.body.data) {
            await expect(
                topProductSchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('respects the limit param — returns at most limit items', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/top-products?period=annual&limit=2');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/reports/top-products?period=annual');
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/reports/profit ──────────────────────────────────────────────────

describe('GET /api/reports/profit', () => {
    it('returns an array for groupBy=category', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/profit?period=annual&groupBy=category');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('each item validates against profitBreakdownItemSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const groupBys = ['category', 'product', 'payment_method'];
        for (const groupBy of groupBys) {
            const res = await agent.get(`/api/reports/profit?period=annual&groupBy=${groupBy}`);
            for (const item of res.body.data) {
                await expect(
                    profitBreakdownItemSchema.validate(item, { abortEarly: false }),
                ).resolves.toBeDefined();
            }
        }
    });

    it('rejects invalid groupBy with 422', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/profit?period=annual&groupBy=store');
        expect(res.status).toBe(422);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/reports/profit?period=annual');
        expect(res.status).toBe(401);
    });
});

// ─── GET /api/reports/stock-health ───────────────────────────────────────────

describe('GET /api/reports/stock-health', () => {
    it('validates against stockHealthSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');

        expect(res.status).toBe(200);
        await expect(
            stockHealthSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('healthy + lowStock + outOfStock equals total', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');
        const d = res.body.data;

        expect(d.healthy + d.lowStock + d.outOfStock).toBe(d.total);
    });

    it('inventoryValue is a non-negative number', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');

        expect(typeof res.body.data.inventoryValue).toBe('number');
        expect(res.body.data.inventoryValue).toBeGreaterThanOrEqual(0);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/reports/stock-health');
        expect(res.status).toBe(401);
    });
});
