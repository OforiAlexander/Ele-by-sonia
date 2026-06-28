import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUser } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const TEST_EMAIL = 'perms-test@example.com';
const TEST_PASS = 'TestPass123!';

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);
    await cleanupUser(TEST_EMAIL);
    await createTestUser({ email: TEST_EMAIL, password: TEST_PASS });
});

afterAll(async () => {
    await cleanupUser(TEST_EMAIL);
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

describe('GET /api/permissions', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/permissions');
        expect(res.status).toBe(401);
    });

    it('returns 200 with permissions grouped by resource', async () => {
        const session = request.agent(app);
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'test' });

        const res = await session.get('/api/permissions');
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(typeof res.body.data).toBe('object');

        const resources = Object.keys(res.body.data);
        expect(resources).toContain('products');
        expect(resources).toContain('sales');
        expect(resources).toContain('staff');
        expect(resources).toContain('roles');
        expect(resources).toContain('reports');
        expect(resources).toContain('settings');
    });

    it('each group is an array of permission objects with required fields', async () => {
        const session = request.agent(app);
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'test' });

        const res = await session.get('/api/permissions');
        const group = res.body.data['products'] as Array<any>;

        expect(Array.isArray(group)).toBe(true);
        expect(group.length).toBeGreaterThan(0);

        const perm = group[0];
        expect(perm).toHaveProperty('id');
        expect(perm).toHaveProperty('name');
        expect(perm).toHaveProperty('label');
        expect(perm).toHaveProperty('is_sensitive');
    });

    it('returns only enabled permissions', async () => {
        const session = request.agent(app);
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'test' });

        const res = await session.get('/api/permissions');
        const all = Object.values(res.body.data as Record<string, any[]>).flat();
        expect(all.every((p) => p.enabled !== false)).toBe(true);
    });

    it('total permissions matches 32 seeded definitions', async () => {
        const session = request.agent(app);
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'test' });

        const res = await session.get('/api/permissions');
        const total = Object.values(res.body.data as Record<string, any[]>).reduce((n, g) => n + g.length, 0);
        expect(total).toBe(32);
    });
});
