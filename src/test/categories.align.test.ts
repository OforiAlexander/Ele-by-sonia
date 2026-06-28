/**
 * Categories alignment tests.
 * Verifies that category endpoints accept the payload the frontend sends
 * and return data matching the frontend Category type.
 *
 * Key shape fact: GET /api/categories returns { data: Category[] }
 * POST/PUT return { code, data: Category }
 * DELETE returns { code, data: Category }
 */
import { createApp } from '../server/createApp';
import type { Category } from '../client/common/types';
import { categorySchema } from './schemas';
import {
    createTestUser, cleanupUserCascade, loginAgent,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';
import knex from '../server/models/_config';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app  = createApp();
const EMAIL = 'categories-align@example.com';
const CAT_NAME = `AlignCat-${Date.now()}`;
let createdId = '';

beforeAll(async () => {
    await connectDb();
    await cleanupUserCascade(EMAIL);
    await knex('categories').where('name', 'like', 'AlignCat-%').delete();
    await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
});

afterAll(async () => {
    await knex('categories').where('name', 'like', 'AlignCat-%').delete();
    await cleanupUserCascade(EMAIL);
    await disconnectDb();
});

// ─── GET /api/categories ──────────────────────────────────────────────────────

describe('GET /api/categories — list shape', () => {
    it('returns 200 with data as an array', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/categories');

        expect(res.status).toBe(200);
        const data: Category[] = res.body.data as Category[];
        expect(Array.isArray(data)).toBe(true);
    });

    it('each item validates against categorySchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/categories');

        for (const item of res.body.data) {
            await expect(
                categorySchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('category items do not contain password_hash or otp_code', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/categories');
        for (const item of res.body.data) {
            expect(item.password_hash).toBeUndefined();
            expect(item.otp_code).toBeUndefined();
        }
    });
});

// ─── POST /api/categories ─────────────────────────────────────────────────────

describe('POST /api/categories — create', () => {
    it('returns 201 with data matching Category type', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent
            .post('/api/categories')
            .send({ name: CAT_NAME });

        expect(res.status).toBe(201);
        const data: Category = res.body.data as Category;
        expect(data.name).toBe(CAT_NAME);
        expect(typeof data.id).toBe('string');

        await expect(
            categorySchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();

        createdId = data.id;
    });

    it('returns 422 when name is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/categories').send({});
        expect(res.status).toBe(422);
    });

    it('returns 409 on duplicate name', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/categories').send({ name: CAT_NAME });
        expect(res.status).toBe(409);
    });
});

// ─── PUT /api/categories/:id ──────────────────────────────────────────────────

describe('PUT /api/categories/:id — update', () => {
    it('returns 200 with updated Category', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const newName = `${CAT_NAME}-updated`;
        const res = await agent
            .put(`/api/categories/${createdId}`)
            .send({ name: newName });

        expect(res.status).toBe(200);
        const data: Category = res.body.data as Category;
        expect(data.name).toBe(newName);
        expect(data.id).toBe(createdId);

        await expect(
            categorySchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('returns 422 when name is missing', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.put(`/api/categories/${createdId}`).send({});
        expect(res.status).toBe(422);
    });

    it('returns 404 for unknown id', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent
            .put('/api/categories/00000000-0000-0000-0000-000000000000')
            .send({ name: 'Ghost' });
        expect(res.status).toBe(404);
    });
});

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────

describe('DELETE /api/categories/:id', () => {
    it('returns 200 with deleted Category', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.delete(`/api/categories/${createdId}`);

        expect(res.status).toBe(200);
        const data: Category = res.body.data as Category;
        expect(data.id).toBe(createdId);

        await expect(
            categorySchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('returns 404 for already-deleted id', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.delete(`/api/categories/${createdId}`);
        expect(res.status).toBe(404);
    });

    it('returns 409 when category is in use by a product', async () => {
        const { agent } = await loginAgent(app, EMAIL);

        // Create a category and a product using it
        const catRes = await agent.post('/api/categories').send({ name: `AlignCat-InUse-${Date.now()}` });
        expect(catRes.status).toBe(201);
        const catId: string = catRes.body.data.id;
        const catName: string = catRes.body.data.name;

        await knex('products').insert({
            name: `Align inuse product ${Date.now()}`,
            category: catName,
            created_by: (await knex('users').where({ email: EMAIL }).first()).id,
        });

        const delRes = await agent.delete(`/api/categories/${catId}`);
        expect(delRes.status).toBe(409);

        // Cleanup
        await knex('products').where({ category: catName }).delete();
        await knex('categories').where({ id: catId }).delete();
    });
});
