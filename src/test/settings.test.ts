import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();

const OWNER_EMAIL  = 'settings-owner@example.com';
const VIEWER_EMAIL = 'settings-viewer@example.com';
const PLAIN_EMAIL  = 'settings-plain@example.com';
const PASS = 'TestPass123!';

let viewerRoleId: string;

async function login(email: string) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password: PASS, recaptchaToken: 'test' });
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    await cleanupUsersByEmailLike('settings-%@example.com');
    await knex('roles').where('name', 'like', 'Settings Test%').delete();

    const [canView]   = await knex('permissions').select('id').where({ name: 'settings.view' });
    const [canUpdate] = await knex('permissions').select('id').where({ name: 'settings.update' });

    const [viewerRole] = await knex('roles').insert({ name: 'Settings Test Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL,  password: PASS, is_owner: true });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });
    await createTestUser({ email: PLAIN_EMAIL,  password: PASS });

    const count = await knex('settings').count('* as n').first();
    if (Number(count?.n) === 0) {
        await knex('settings').insert([
            { name: 'BUSINESS_NAME',      label: 'Business display name',                value: 'Elegance by Sconia', group: 'general',   editable: true  },
            { name: 'SALE_NUMBER_PREFIX', label: 'Prefix for sale reference numbers',    value: 'S-',                group: 'inventory', editable: false },
        ]);
    }
});

afterAll(async () => {
    await knex('settings').where({ name: 'BUSINESS_NAME' }).update({ value: 'Elegance by Sconia' });
    await cleanupUsersByEmailLike('settings-%@example.com');
    await knex('roles').where('name', 'like', 'Settings Test%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get('/api/settings')).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_settings', async () => {
        const s = await login(PLAIN_EMAIL);
        expect((await s.get('/api/settings')).status).toBe(403);
    });

    it('returns 200 with array of settings for viewer', async () => {
        const s = await login(VIEWER_EMAIL);
        const res = await s.get('/api/settings');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        const first = res.body.data[0];
        expect(first).toHaveProperty('name');
        expect(first).toHaveProperty('label');
        expect(first).toHaveProperty('value');
        expect(first).toHaveProperty('group');
        expect(first).toHaveProperty('editable');
    });

    it('returns 200 for owner', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/settings');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

// ─── PUT /api/settings/:name ──────────────────────────────────────────────────

describe('PUT /api/settings/:name', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).put('/api/settings/BUSINESS_NAME').send({ value: 'X' })).status).toBe(401);
    });

    it('returns 403 when user has view but not update permission', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.put('/api/settings/BUSINESS_NAME').send({ value: 'X' })).status).toBe(403);
    });

    it('returns 422 when value is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/settings/BUSINESS_NAME').send({})).status).toBe(422);
    });

    it('returns 422 when value is empty string', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/settings/BUSINESS_NAME').send({ value: '' })).status).toBe(422);
    });

    it('returns 404 for unknown setting name', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/settings/NO_SUCH_SETTING').send({ value: 'x' })).status).toBe(404);
    });

    it('returns 400 when setting is not editable', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put('/api/settings/SALE_NUMBER_PREFIX').send({ value: 'INV-' });
        expect(res.status).toBe(400);
    });

    it('returns 200 and updates an editable setting', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put('/api/settings/BUSINESS_NAME').send({ value: 'Test Store' });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('BUSINESS_NAME');
        expect(res.body.data.value).toBe('Test Store');
    });

    it('persists the updated value in the database', async () => {
        const row = await knex('settings').where({ name: 'BUSINESS_NAME' }).first();
        expect(row.value).toBe('Test Store');
    });
});
