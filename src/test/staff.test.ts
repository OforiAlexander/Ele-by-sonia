import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUser, cleanupUsersByEmailLike } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

jest.mock('../server/services/mail/send-mail', () => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

const OWNER_EMAIL = 'staff-owner@example.com';
const MANAGER_EMAIL = 'staff-manager@example.com';
const VIEWER_EMAIL = 'staff-viewer@example.com';
const PASS = 'TestPass123!';

let managerRoleId: string;
let viewerRoleId: string;
let createdStaffEmail: string;
let createdStaffId: string;

async function login(email: string, password = PASS) {
    const s = request.agent(app);
    await s.post('/api/auth/login').send({ email, password, recaptchaToken: 'test' });
    return s;
}

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);

    await cleanupUsersByEmailLike('staff-%@example.com');
    await knex('roles').where('name', 'like', 'Staff Test%').delete();

    const [canView] = await knex('permissions').select('id').where({ name: 'staff.view' });
    const [canCreate] = await knex('permissions').select('id').where({ name: 'staff.create' });
    const [canUpdate] = await knex('permissions').select('id').where({ name: 'staff.update' });
    const [canDeactivate] = await knex('permissions').select('id').where({ name: 'staff.deactivate' });

    const [managerRole] = await knex('roles').insert({ name: 'Staff Test Manager' }).returning('id');
    managerRoleId = managerRole.id;
    await knex('role_permissions').insert([
        { role_id: managerRoleId, permission_id: canView.id },
        { role_id: managerRoleId, permission_id: canCreate.id },
        { role_id: managerRoleId, permission_id: canUpdate.id },
        { role_id: managerRoleId, permission_id: canDeactivate.id },
    ]);

    const [viewerRole] = await knex('roles').insert({ name: 'Staff Test Viewer' }).returning('id');
    viewerRoleId = viewerRole.id;
    await knex('role_permissions').insert({ role_id: viewerRoleId, permission_id: canView.id });

    await createTestUser({ email: OWNER_EMAIL, password: PASS, is_owner: true });
    await createTestUser({ email: MANAGER_EMAIL, password: PASS });
    await knex('users').where({ email: MANAGER_EMAIL }).update({ role_id: managerRoleId });
    await createTestUser({ email: VIEWER_EMAIL, password: PASS });
    await knex('users').where({ email: VIEWER_EMAIL }).update({ role_id: viewerRoleId });
});

afterAll(async () => {
    await cleanupUsersByEmailLike('staff-%@example.com');
    await knex('roles').where('name', 'like', 'Staff Test%').delete();
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});

// ─── POST /api/staff ──────────────────────────────────────────────────────────

describe('POST /api/staff', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).post('/api/staff').send({ name: 'X', email: 'x@x.com' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_create_staff', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.post('/api/staff').send({ name: 'X', email: 'x@x.com' })).status).toBe(403);
    });

    it('returns 422 when name is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/staff').send({ email: 'new@example.com' })).status).toBe(422);
    });

    it('returns 422 when email is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/staff').send({ name: 'New Staff' })).status).toBe(422);
    });

    it('returns 422 when email is invalid', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.post('/api/staff').send({ name: 'New Staff', email: 'not-an-email' })).status).toBe(422);
    });

    it('returns 201 and creates a staff member', async () => {
        createdStaffEmail = `staff-new-${Date.now()}@example.com`;
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/staff').send({ name: 'New Staff', email: createdStaffEmail, phone: '0241234567', role_id: viewerRoleId });
        expect(res.status).toBe(201);
        expect(res.body.data.email).toBe(createdStaffEmail);
        expect(res.body.data.name).toBe('New Staff');
        expect(res.body.data.is_active).toBe(true);
        expect(res.body.data.must_change_password).toBe(true);
        expect(res.body.data.password_hash).toBeUndefined();
        createdStaffId = res.body.data.id;
    });

    it('returns 409 when email already exists', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.post('/api/staff').send({ name: 'Dupe', email: createdStaffEmail });
        expect(res.status).toBe(409);
    });

    it('returns 201 when created by a manager (can_create_staff)', async () => {
        const email = `staff-bymanager-${Date.now()}@example.com`;
        const s = await login(MANAGER_EMAIL);
        const res = await s.post('/api/staff').send({ name: 'By Manager', email });
        expect(res.status).toBe(201);
        await knex('users').where({ email }).delete();
    });
});

// ─── GET /api/staff ───────────────────────────────────────────────────────────

describe('GET /api/staff', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get('/api/staff')).status).toBe(401);
    });

    it('returns 403 when user lacks can_view_staff', async () => {
        const { user: plain } = await createTestUser({ email: 'staff-plain@example.com', password: PASS });
        const ps = await login('staff-plain@example.com');
        expect((await ps.get('/api/staff')).status).toBe(403);
        await knex('audit_logs').where({ user_id: plain.id }).delete();
        await knex('users').where({ id: plain.id }).delete();
    });

    it('returns 200 with paginated staff (no owners)', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get('/api/staff');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.staff)).toBe(true);
        expect(res.body.data.staff.every((u: any) => !u.is_owner)).toBe(true);
        expect(res.body.data.staff.every((u: any) => u.password_hash === undefined)).toBe(true);
        expect(typeof res.body.data.total).toBe('number');
    });

    it('returns 200 for user with can_view_staff', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.get('/api/staff')).status).toBe(200);
    });
});

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────

describe('GET /api/staff/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).get(`/api/staff/${createdStaffId}`)).status).toBe(401);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.get('/api/staff/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    });

    it('returns 200 with staff data', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.get(`/api/staff/${createdStaffId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(createdStaffId);
        expect(res.body.data.password_hash).toBeUndefined();
    });
});

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────

describe('PUT /api/staff/:id', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).put(`/api/staff/${createdStaffId}`).send({ name: 'X' })).status).toBe(401);
    });

    it('returns 403 when user lacks can_update_staff', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.put(`/api/staff/${createdStaffId}`).send({ name: 'X' })).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put('/api/staff/00000000-0000-0000-0000-000000000000').send({ name: 'X' })).status).toBe(404);
    });

    it('returns 422 when name is missing', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.put(`/api/staff/${createdStaffId}`).send({})).status).toBe(422);
    });

    it('returns 200 and updates the staff member', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.put(`/api/staff/${createdStaffId}`).send({ name: 'Updated Name', phone: '0550000000', role_id: managerRoleId });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated Name');
        expect(res.body.data.phone).toBe('0550000000');
    });
});

// ─── PATCH /api/staff/:id/deactivate ─────────────────────────────────────────

describe('PATCH /api/staff/:id/deactivate', () => {
    it('returns 401 when not logged in', async () => {
        expect((await request(app).patch(`/api/staff/${createdStaffId}/deactivate`)).status).toBe(401);
    });

    it('returns 403 when user lacks can_deactivate_staff', async () => {
        const s = await login(VIEWER_EMAIL);
        expect((await s.patch(`/api/staff/${createdStaffId}/deactivate`)).status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
        const s = await login(OWNER_EMAIL);
        expect((await s.patch('/api/staff/00000000-0000-0000-0000-000000000000/deactivate')).status).toBe(404);
    });

    it('returns 400 when trying to deactivate the owner', async () => {
        const s = await login(OWNER_EMAIL);
        const owner = await knex('users').where({ email: OWNER_EMAIL }).select('id').first();
        const res = await s.patch(`/api/staff/${owner.id}/deactivate`);
        expect(res.status).toBe(400);
    });

    it('returns 200 and deactivates the staff member', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/staff/${createdStaffId}/deactivate`);
        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(false);
    });

    it('returns 200 and reactivates the staff member', async () => {
        const s = await login(OWNER_EMAIL);
        const res = await s.patch(`/api/staff/${createdStaffId}/deactivate`);
        expect(res.status).toBe(200);
        expect(res.body.data.is_active).toBe(true);
    });
});
