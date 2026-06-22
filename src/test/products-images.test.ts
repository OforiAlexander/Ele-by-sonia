import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL  = 'imgtest-owner@example.com';
const VIEWER_EMAIL = 'imgtest-viewer@example.com';
const PASS = 'TestPass123!';

const UPLOADS_DIR = path.resolve('uploads/products');

// Minimal 1×1 white PNG
const PNG_1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

let productId: string;
let viewerRoleId: string;
let uploadedImageId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

async function cleanupProduct() {
    if (!productId) return;
    const images = await knex('product_images').where({ product_id: productId }).select('image_path');
    for (const img of images) {
        await fs.promises.unlink(path.resolve(img.image_path)).catch(() => undefined);
    }
    await knex('product_images').where({ product_id: productId }).delete();
    const variants = await knex('product_variants').where({ product_id: productId }).select('id');
    if (variants.length > 0) {
        await knex('variant_option_values').whereIn('variant_id', variants.map((v: any) => v.id)).delete();
        await knex('product_variants').where({ product_id: productId }).delete();
    }
    await knex('product_option_types').where({ product_id: productId }).delete();
    await knex('products').where({ id: productId }).delete();
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    await cleanupUsersByEmailLike('imgtest-%@example.com');
    await knex('roles').where('name', 'like', 'ImgTest%').delete();

    const [canView] = await knex('permissions').select('id').where({ name: 'products.view' });
    const [viewerRole] = await knex('roles').insert({ name: 'ImgTest Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL,  password: PASS, is_owner: true });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });

    const owner = await knex('users').where({ email: OWNER_EMAIL }).first();
    const [product] = await knex('products').insert({
        name: 'Image Test Product',
        category: 'Ladies Clothing',
        is_active: true,
        created_by: owner.id,
    }).returning('id');
    productId = product.id;
});

afterAll(async () => {
    await cleanupProduct();
    await cleanupUsersByEmailLike('imgtest-%@example.com');
    await knex('roles').where('name', 'like', 'ImgTest%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── POST /api/products/:id/images ───────────────────────────────────────────

describe('POST /api/products/:id/images', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app)
            .post(`/api/products/${productId}/images`)
            .attach('images', PNG_1x1, { filename: 'test.png', contentType: 'image/png' });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks can_update_products', async () => {
        const s = await login(VIEWER_EMAIL);
        const res = await s
            .post(`/api/products/${productId}/images`)
            .attach('images', PNG_1x1, { filename: 'test.png', contentType: 'image/png' });
        expect(res.status).toBe(403);
    });

    it('returns 404 for unknown product', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post('/api/products/00000000-0000-0000-0000-000000000000/images')
            .attach('images', PNG_1x1, { filename: 'test.png', contentType: 'image/png' });
        expect(res.status).toBe(404);
    });

    it('returns 422 when no file is attached', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post(`/api/products/${productId}/images`).send();
        expect(res.status).toBe(422);
    });

    it('returns 400 when file is not jpeg or png', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post(`/api/products/${productId}/images`)
            .attach('images', Buffer.from('fake'), { filename: 'file.txt', contentType: 'text/plain' });
        expect(res.status).toBe(400);
    });

    it('returns 201 and saves image record', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post(`/api/products/${productId}/images`)
            .attach('images', PNG_1x1, { filename: 'first.png', contentType: 'image/png' });
        expect(res.status).toBe(201);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('image_path');
        expect(res.body.data[0].sort_order).toBe(0);
        uploadedImageId = res.body.data[0].id;
    });

    it('assigns ascending sort_order for subsequent uploads', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s
            .post(`/api/products/${productId}/images`)
            .attach('images', PNG_1x1, { filename: 'second.png', contentType: 'image/png' });
        expect(res.status).toBe(201);
        const orders = res.body.data.map((img: any) => img.sort_order);
        expect(orders).toEqual([0, 1]);
    });
});

// ─── DELETE /api/products/:id/images/:imageId ─────────────────────────────────

describe('DELETE /api/products/:id/images/:imageId', () => {
    it('returns 401 when not logged in', async () => {
        expect(
            (await request(app).delete(`/api/products/${productId}/images/${uploadedImageId}`)).status,
        ).toBe(401);
    });

    it('returns 403 when user lacks can_update_products', async () => {
        const s = await login(VIEWER_EMAIL);
        expect(
            (await s.delete(`/api/products/${productId}/images/${uploadedImageId}`)).status,
        ).toBe(403);
    });

    it('returns 404 for unknown image', async () => {
        const s = await login(OWNER_EMAIL);
        expect(
            (await s.delete(`/api/products/${productId}/images/00000000-0000-0000-0000-000000000000`)).status,
        ).toBe(404);
    });

    it('returns 200 and removes the image record', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.delete(`/api/products/${productId}/images/${uploadedImageId}`);
        expect(res.status).toBe(200);
        const row = await knex('product_images').where({ id: uploadedImageId }).first();
        expect(row).toBeUndefined();
    });
});
