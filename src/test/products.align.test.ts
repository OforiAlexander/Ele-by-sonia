/**
 * Products alignment tests.
 * Verify that product endpoints return data matching the frontend Product type
 * and that the frontend Formik form shape is accepted by the backend.
 *
 * Key shape fact: GET /api/products returns
 *   { data: { products: Product[], total, page, limit } }
 * NOT a flat array. Pagination lives inside `data`, not at the response root.
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { Product, PaginatedProducts } from '../client/common/types';
import { productSchema, paginatedProductsSchema } from './schemas';
import {
    createTestUser, cleanupUserCascade, loginAgent,
    createTestProduct, cleanupTestProduct,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const EMAIL = 'products-align@example.com';
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

// ─── GET /api/products — list shape ──────────────────────────────────────────

describe('GET /api/products — response shape matches PaginatedProducts', () => {
    it('returns 200 with data.products array and data.total/page/limit', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products');

        expect(res.status).toBe(200);
        // Compile-time: TypeScript must agree res.body.data is PaginatedProducts
        const data: PaginatedProducts = res.body.data as PaginatedProducts;
        expect(Array.isArray(data.products)).toBe(true);
        expect(typeof data.total).toBe('number');

        await expect(
            paginatedProductsSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('pagination lives inside data — NOT at response root', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products');

        // Confirm the shape the frontend must use: res.body.data.products
        expect(res.body.data).toHaveProperty('products');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limit');
        // meta is NOT at root
        expect(res.body.meta).toBeUndefined();
    });

    it('every item in data.products validates against productSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products');

        for (const item of res.body.data.products) {
            await expect(
                productSchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('accepts page and limit query params and reflects them in response', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products?page=1&limit=10');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limit).toBe(10);
    });

    it('accepts search and category query params', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products?search=Align');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.products)).toBe(true);
    });
});

// ─── GET /api/products/:id — single product shape ────────────────────────────

describe('GET /api/products/:id — response shape matches Product type', () => {
    it('returns product and validates against productSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/products/${productId}`);

        expect(res.status).toBe(200);

        // Compile-time: TypeScript must agree this is assignable to Product
        const product: Product = res.body.data as Product;
        expect(product.id).toBe(productId);

        await expect(
            productSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('single product response includes variants array', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get(`/api/products/${productId}`);

        // Backend joins variants on single-product fetch
        expect(Array.isArray(res.body.data.variants)).toBe(true);
    });

    it('returns 404 for unknown id', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });
});

// ─── POST /api/products — request shape the frontend Formik form sends ────────

describe('POST /api/products — accepts the frontend Formik payload', () => {
    const createdIds: string[] = [];

    afterAll(async () => {
        for (const id of createdIds) {
            await cleanupTestProduct(id).catch(() => undefined);
        }
    });

    it('accepts {name, category} minimum payload', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/products').send({
            name: 'Align Form Product',
            category: 'Clothing',
        });

        expect(res.status).toBe(201);
        await expect(
            productSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
        createdIds.push(res.body.data.id);
    });

    it('accepts optional brand and description fields', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/products').send({
            name: 'Align Full Product',
            category: 'Shoes',
            brand: 'Elegance',
            description: 'A test product',
        });

        expect(res.status).toBe(201);
        const product: Product = res.body.data as Product;
        expect(product.brand).toBe('Elegance');
        expect(product.description).toBe('A test product');
        createdIds.push(res.body.data.id);
    });

    it('returns 422 when name is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/products').send({ category: 'Clothing' });
        expect(res.status).toBe(422);
    });

    it('returns 422 when category is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/products').send({ name: 'No Category' });
        expect(res.status).toBe(422);
    });
});

// ─── PUT /api/products/:id — update request shape ────────────────────────────

describe('PUT /api/products/:id — accepts the frontend update payload', () => {
    it('updates and returns updated product matching productSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.put(`/api/products/${productId}`).send({
            name: 'Updated Align Product',
            category: 'Test Category',
        });

        expect(res.status).toBe(200);
        await expect(
            productSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });
});

// ─── DELETE /api/products/:id — deactivates (not a hard delete) ──────────────
// IMPORTANT: DELETE does NOT destroy the row. It calls deactivateProduct()
// which sets is_active = false. The product remains queryable.
// The UI should display this as "Deactivate" not "Delete".

describe('DELETE /api/products/:id — deactivates product, keeps row', () => {
    let deactivateTargetId = '';

    beforeAll(async () => {
        const { user } = await createTestUser({ email: 'deactivate-align@example.com', password: TEST_PASS, is_owner: true });
        const product = await createTestProduct({ name: 'Deactivate Target' }, user.id);
        deactivateTargetId = product.id;
    });

    afterAll(async () => {
        await cleanupTestProduct(deactivateTargetId).catch(() => undefined);
        await cleanupUserCascade('deactivate-align@example.com');
    });

    it('returns 200 and sets is_active to false — product is not deleted', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.delete(`/api/products/${deactivateTargetId}`);

        expect(res.status).toBe(200);
        // Compile-time: response data must be assignable to Product
        const product: Product = res.body.data as Product;
        expect(product.is_active).toBe(false);
        expect(product.id).toBe(deactivateTargetId);
    });

    it('deactivated product still appears in GET /api/products list', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/products');

        const found = res.body.data.products.find((p: Product) => p.id === deactivateTargetId);
        expect(found).toBeDefined();
        expect(found.is_active).toBe(false);
    });

    it('returns 404 for unknown id', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.delete('/api/products/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
        const res = await request(app).delete(`/api/products/${deactivateTargetId}`);
        expect(res.status).toBe(401);
    });
});
