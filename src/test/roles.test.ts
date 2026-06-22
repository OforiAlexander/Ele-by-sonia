import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUser } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const OWNER_EMAIL = 'roles-owner@example.com';
const STAFF_EMAIL = 'roles-staff@example.com';
const PASS = 'TestPass123!';

let permissionId: string;
let createdRoleId: string;

function ownerSession() {
    const s = request.agent(app);
    beforeEach(() => s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' }));
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);
    await cleanupUser(OWNER_EMAIL);
    await cleanupUser(STAFF_EMAIL);
    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: STAFF_EMAIL, password: PASS });
    const perm = await knex('permissions').select('id').where({ name: 'products.view' }).first();
    permissionId = perm.id;
});

afterAll(async () => {
    await knex('roles').where('name', 'like', 'Test Role%').delete();
    await cleanupUser(OWNER_EMAIL);
    await cleanupUser(STAFF_EMAIL);
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

describe('GET /api/roles', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get('/api/roles')).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_roles', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: STAFF_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.get('/api/roles')).status).toBe(403);
    });

    it('returns 200 with array of roles', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.get('/api/roles');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

describe('POST /api/roles', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post('/api/roles').send({ name: 'X', permissionIds: [] })).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_roles', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: STAFF_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.post('/api/roles').send({ name: 'X', permissionIds: [] })).status).toBe(403);
    });

    it('returns 422 when name is missing', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.post('/api/roles').send({ permissionIds: [] })).status).toBe(422);
    });

    it('returns 422 when permissionIds is not an array', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.post('/api/roles').send({ name: 'Test Role A', permissionIds: 'bad' })).status).toBe(422);
    });

    it('returns 201 and creates the role', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.post('/api/roles').send({ name: 'Test Role B', description: 'A test role', permissionIds: [permissionId] });
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Test Role B');
        expect(res.body.data.permissions).toHaveLength(1);
        createdRoleId = res.body.data.id;
    });

    it('returns 409 when role name already exists', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.post('/api/roles').send({ name: 'Test Role B', permissionIds: [] });
        expect(res.status).toBe(409);
    });
});

describe('GET /api/roles/:id', () => {
    it('returns 404 for unknown id', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.get('/api/roles/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with role and permissions', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.get(`/api/roles/${createdRoleId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(createdRoleId);
        expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });
});

describe('PUT /api/roles/:id', () => {
    it('returns 403 when user lacks can_update_roles', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: STAFF_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.put(`/api/roles/${createdRoleId}`).send({ name: 'X', permissionIds: [] })).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.put('/api/roles/00000000-0000-0000-0000-000000000000').send({ name: 'X', permissionIds: [] })).status).toBe(404);
    });

    it('returns 200 and updates the role', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.put(`/api/roles/${createdRoleId}`).send({ name: 'Test Role B Updated', permissionIds: [] });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Test Role B Updated');
        expect(res.body.data.permissions).toHaveLength(0);
    });
});

describe('DELETE /api/roles/:id', () => {
    it('returns 403 when user lacks can_delete_roles', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: STAFF_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.delete(`/api/roles/${createdRoleId}`)).status).toBe(403);
    });

    it('returns 400 when role has users assigned', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        await knex('users').where({ email: STAFF_EMAIL }).update({ role_id: createdRoleId });
        const res = await s.delete(`/api/roles/${createdRoleId}`);
        expect(res.status).toBe(400);
        await knex('users').where({ email: STAFF_EMAIL }).update({ role_id: null });
    });

    it('returns 404 for unknown id', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        expect((await s.delete('/api/roles/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 and deletes the role', async () => {
        const s = request.agent(app);
        await s.post('/api/auth/login').send({ email: OWNER_EMAIL, password: PASS, recaptchaToken: 'test' });
        const res = await s.delete(`/api/roles/${createdRoleId}`);
        expect(res.status).toBe(200);
    });
});
