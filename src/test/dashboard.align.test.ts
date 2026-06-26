/**
 * Dashboard alignment tests.
 *
 * useDashboardSummary() assembles DashSummary from FIVE separate API calls.
 * This file tests each of those calls independently to guarantee the backend
 * returns the exact field names the hook reads. If a field is renamed on the
 * backend, the corresponding test breaks here before it silently breaks the UI.
 *
 * useDashboardSummary field map:
 *   /api/products?limit=1              → data.total          → DashSummary.totalProducts
 *   /api/reports/summary?period=annual → data.revenue        → DashSummary.totalSales
 *   /api/reports/top-products?...      → data[].productName  → DashSummary.topSellingItem
 *                                      → data[].revenue      → DashSummary.topItems[].revenue
 *   /api/reports/chart?...             → data.labels         → DashSummary.chart.labels
 *                                      → data.values         → DashSummary.chart.values
 *   /api/reports/profit?...&groupBy=category → data[].group  → DashSummary.categories[].name
 *                                             → data[].revenue → DashSummary.categories[].revenue
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { DashSummary, StockHealthData } from '../client/common/types';
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
const EMAIL = 'dashboard-align@example.com';

beforeAll(async () => {
    await connectDb();
    await cleanupUserCascade(EMAIL);
    await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
});

afterAll(async () => {
    await cleanupUserCascade(EMAIL);
    await disconnectDb();
});

// ─── /api/products?limit=1 → DashSummary.totalProducts ───────────────────────

describe('GET /api/products?limit=1 — dashboard reads data.total', () => {
    it('returns 200 and data.total is a number', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products?limit=1');

        expect(res.status).toBe(200);
        // Hook: totalProducts = productsRes?.data?.data?.total ?? 0
        expect(typeof res.body.data.total).toBe('number');
    });
});

// ─── /api/reports/summary → DashSummary.totalSales ───────────────────────────

describe('GET /api/reports/summary — response shape', () => {
    it('accepts period=annual and returns 200', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=annual');

        expect(res.status).toBe(200);
        // Compile-time: field access from the hook must compile
        const data = res.body.data as Pick<DashSummary, 'totalSales'> & { revenue: number };
        void data;
    });

    it('data.revenue field exists and is a number — hook maps this to totalSales', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=annual');

        // Hook: totalSales = summaryRes?.data?.data?.revenue ?? 0
        expect(typeof res.body.data.revenue).toBe('number');
    });

    it('full response validates against reportsSummarySchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary?period=annual');

        await expect(
            reportsSummarySchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('rejects missing period — frontend must always send it', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/summary');
        expect(res.status).toBe(422);
    });
});

// ─── /api/reports/top-products → DashSummary.topItems / topSellingItem ────────

describe('GET /api/reports/top-products — response shape', () => {
    it('returns an array (may be empty on a fresh database)', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/top-products?period=annual&limit=4');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('each item has productName and revenue — fields the hook reads', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/top-products?period=annual&limit=4');

        // Only validate items when data exists; an empty array is valid on a fresh DB
        for (const item of res.body.data) {
            // Hook: topSellingItem = topData[0]?.productName
            //       topItems = topData.map(i => ({ name: i.productName, revenue: Number(i.revenue) }))
            await expect(
                topProductSchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });
});

// ─── /api/reports/chart → DashSummary.chart ──────────────────────────────────

describe('GET /api/reports/chart — response shape', () => {
    it('returns {labels, values} arrays — hook maps directly to DashSummary.chart', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/chart?period=annual&metric=revenue');

        expect(res.status).toBe(200);
        // Hook: chart = chartRes?.data?.data ?? { labels: [], values: [] }
        expect(Array.isArray(res.body.data.labels)).toBe(true);
        expect(Array.isArray(res.body.data.values)).toBe(true);
        expect(res.body.data.labels.length).toBe(res.body.data.values.length);
    });

    it('validates against chartSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/chart?period=annual&metric=revenue');

        await expect(
            chartSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });
});

// ─── /api/reports/profit?groupBy=category → DashSummary.categories ───────────

describe('GET /api/reports/profit?groupBy=category — response shape', () => {
    it('returns an array with group and revenue fields — hook maps to categories', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/profit?period=annual&groupBy=category');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // Hook: categories = catData.slice(0,4).map(c => ({ name: c.group, revenue: Number(c.revenue) }))
        for (const item of res.body.data) {
            await expect(
                profitBreakdownItemSchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });
});

// ─── /api/reports/stock-health → StockHealthData ─────────────────────────────

describe('GET /api/reports/stock-health — response shape matches StockHealthData', () => {
    it('returns 200 with all StockHealthData fields', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');

        expect(res.status).toBe(200);
        // Compile-time: must be assignable to StockHealthData
        const data: StockHealthData = res.body.data as StockHealthData;
        expect(typeof data.healthy).toBe('number');
        expect(typeof data.lowStock).toBe('number');
        expect(typeof data.outOfStock).toBe('number');
        expect(typeof data.total).toBe('number');
        expect(typeof data.inventoryValue).toBe('number');
    });

    it('validates against stockHealthSchema (runtime Yup check)', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');

        await expect(
            stockHealthSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('healthy + lowStock + outOfStock sums to total', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/reports/stock-health');
        const d: StockHealthData = res.body.data;

        expect(d.healthy + d.lowStock + d.outOfStock).toBe(d.total);
    });

    it('requires authentication — returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/reports/stock-health');
        expect(res.status).toBe(401);
    });
});
