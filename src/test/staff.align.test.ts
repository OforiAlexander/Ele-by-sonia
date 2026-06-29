/**
 * Staff alignment tests.
 * Verifies that every staff API endpoint accepts the exact request shape the
 * frontend sends, and returns data matching the StaffMember TypeScript type
 * in src/client/common/types/index.ts.
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { StaffMember } from '../client/common/types';
import { staffMemberSchema, paginatedStaffSchema } from './schemas';
import {
    createTestUser, cleanupUsersByEmailLike,
    createTestRole, cleanupTestRoles,
    loginAgent, connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';
import knex from '../server/models/_config';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));
jest.mock('../server/services/mail/send-mail', () => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

const OWNER_EMAIL = 'staff-align-owner@example.com';

let testRoleId: string;
let createdStaffId: string;

beforeAll(async () => {
    await connectDb();
    await cleanupUsersByEmailLike('staff-align-%@example.com');
    await cleanupTestRoles('Align%');
    await createTestUser({ email: OWNER_EMAIL, password: TEST_PASS, is_owner: true });
    const role = await createTestRole('Align Staff Role');
    testRoleId = role.id;
});

afterAll(async () => {
    await cleanupUsersByEmailLike('staff-align-%@example.com');
    await cleanupTestRoles('Align%');
    await disconnectDb();
});

// ─── POST /api/staff — request shape ─────────────────────────────────────────

describe('POST /api/staff — request shape the frontend sends', () => {
    it('accepts {name, email, role_id} — the minimum required payload', async () => {
        const email = `staff-align-min-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Min Staff', email, role_id: testRoleId });
        expect(res.status).toBe(201);
        await knex('users').where({ email }).delete();
    });

    it('accepts optional phone alongside the required fields', async () => {
        const email = `staff-align-full-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({
            name: 'Full Staff', email, phone: '0241234567', role_id: testRoleId,
        });
        expect(res.status).toBe(201);
        await knex('users').where({ email }).delete();
    });

    it('returns 422 when name is absent', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ email: 'noname@example.com', role_id: testRoleId });
        expect(res.status).toBe(422);
    });

    it('returns 422 when email is absent', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'No Email', role_id: testRoleId });
        expect(res.status).toBe(422);
    });

    it('returns 422 when email is malformed', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Bad Email', email: 'not-an-email', role_id: testRoleId });
        expect(res.status).toBe(422);
    });

    it('returns 422 when role_id is absent — role is required', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'No Role', email: `staff-align-norole-${Date.now()}@example.com` });
        expect(res.status).toBe(422);
        expect(res.body.field).toBe('role_id');
    });

    it('returns 422 when role_id is not a valid UUID', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Bad Role', email: `staff-align-badrole-${Date.now()}@example.com`, role_id: 'not-a-uuid' });
        expect(res.status).toBe(422);
    });

    it('returns 409 with field:email when email is already registered', async () => {
        const email = `staff-align-dup-email-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        await agent.post('/api/staff').send({ name: 'First', email, role_id: testRoleId });
        const res = await agent.post('/api/staff').send({ name: 'Second', email, role_id: testRoleId });
        expect(res.status).toBe(409);
        expect(res.body.field).toBe('email');
        await knex('users').where({ email }).delete();
    });

    it('returns 409 with field:phone when phone number is already in use', async () => {
        const phone = '0240000001';
        const email1 = `staff-align-dup-phone-a-${Date.now()}@example.com`;
        const email2 = `staff-align-dup-phone-b-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        await agent.post('/api/staff').send({ name: 'First', email: email1, phone, role_id: testRoleId });
        const res = await agent.post('/api/staff').send({ name: 'Second', email: email2, phone, role_id: testRoleId });
        expect(res.status).toBe(409);
        expect(res.body.field).toBe('phone');
        await knex('users').whereIn('email', [email1, email2]).delete();
    });
});

// ─── POST /api/staff — response shape ────────────────────────────────────────

describe('POST /api/staff — response shape matches StaffMember type', () => {
    it('response.data validates against staffMemberSchema', async () => {
        const email = `staff-align-shape-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Shape Check', email, role_id: testRoleId });
        expect(res.status).toBe(201);

        createdStaffId = res.body.data.id;

        await expect(
            staffMemberSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();

        const s: StaffMember = res.body.data as StaffMember;
        expect(s.id).toBeDefined();
        expect(s.email).toBe(email);
        expect(s.role_id).toBe(testRoleId);
    });

    it('must_change_password is true — backend sets this for every invitation', async () => {
        const email = `staff-align-invite-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Invite Check', email, role_id: testRoleId });
        expect(res.body.data.must_change_password).toBe(true);
        await knex('users').where({ email }).delete();
    });

    it('password_hash is stripped — never reaches the frontend', async () => {
        const email = `staff-align-strip-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Strip Check', email, role_id: testRoleId });
        expect(res.body.data).not.toHaveProperty('password_hash');
        expect(res.body.data).not.toHaveProperty('otp_code');
        await knex('users').where({ email }).delete();
    });
});

// ─── GET /api/staff — response shape ─────────────────────────────────────────

describe('GET /api/staff — response shape matches PaginatedStaff', () => {
    it('response.data validates against paginatedStaffSchema', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.get('/api/staff');
        expect(res.status).toBe(200);
        await expect(
            paginatedStaffSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('each item in the list validates against staffMemberSchema', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.get('/api/staff');
        for (const s of res.body.data.staff as StaffMember[]) {
            await expect(
                staffMemberSchema.validate(s, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('owners are excluded from the list', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.get('/api/staff');
        expect(res.body.data.staff.every((s: StaffMember) => !s.is_owner)).toBe(true);
    });

    it('password_hash is absent from every list item', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.get('/api/staff');
        res.body.data.staff.forEach((s: any) => {
            expect(s).not.toHaveProperty('password_hash');
        });
    });

    it('supports page and limit query params', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.get('/api/staff?page=1&limit=10');
        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limit).toBe(10);
    });
});

// ─── PUT /api/staff/:id — request and response shape ─────────────────────────

describe('PUT /api/staff/:id — request shape the frontend sends', () => {
    it('accepts {name, role_id} — minimum update payload (email not sent on edit)', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ name: 'Updated Staff', role_id: testRoleId });
        expect(res.status).toBe(200);
    });

    it('accepts optional phone on update', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({
            name: 'Updated Staff', phone: '0550000001', role_id: testRoleId,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.phone).toBe('0550000001');
    });

    it('returns 422 when name is absent', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ phone: '0550000001', role_id: testRoleId });
        expect(res.status).toBe(422);
    });

    it('returns 422 when role_id is absent', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ name: 'No Role' });
        expect(res.status).toBe(422);
        expect(res.body.field).toBe('role_id');
    });

    it('returns 409 with field:phone when phone is already used by another staff member', async () => {
        const takenPhone = '0240000099';
        const email = `staff-align-phone-holder-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        await agent.post('/api/staff').send({ name: 'Phone Holder', email, phone: takenPhone, role_id: testRoleId });
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ name: 'Updated', phone: takenPhone, role_id: testRoleId });
        expect(res.status).toBe(409);
        expect(res.body.field).toBe('phone');
        await knex('users').where({ email }).delete();
    });
});

describe('PUT /api/staff/:id — response shape matches StaffMember type', () => {
    it('response.data validates against staffMemberSchema', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ name: 'Final Name', role_id: testRoleId });
        expect(res.status).toBe(200);
        await expect(
            staffMemberSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
        const s: StaffMember = res.body.data as StaffMember;
        expect(s.name).toBe('Final Name');
    });

    it('password_hash is stripped from update response', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.put(`/api/staff/${createdStaffId}`).send({ name: 'Any Name', role_id: testRoleId });
        expect(res.body.data).not.toHaveProperty('password_hash');
    });
});

// ─── PATCH /api/staff/:id/deactivate ─────────────────────────────────────────

describe('PATCH /api/staff/:id/deactivate — response shape matches StaffMember type', () => {
    it('response.data validates against staffMemberSchema after deactivate', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.patch(`/api/staff/${createdStaffId}/deactivate`);
        expect(res.status).toBe(200);
        await expect(
            staffMemberSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
        const s: StaffMember = res.body.data as StaffMember;
        expect(s.is_active).toBe(false);
    });

    it('toggling again reactivates and still returns valid StaffMember shape', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.patch(`/api/staff/${createdStaffId}/deactivate`);
        expect(res.status).toBe(200);
        const s: StaffMember = res.body.data as StaffMember;
        expect(s.is_active).toBe(true);
    });

    it('password_hash is stripped from toggle response', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.patch(`/api/staff/${createdStaffId}/deactivate`);
        expect(res.body.data).not.toHaveProperty('password_hash');
        await agent.patch(`/api/staff/${createdStaffId}/deactivate`); // restore
    });
});

// ─── POST /api/staff/:id/resend-invitation ────────────────────────────────────

describe('POST /api/staff/:id/resend-invitation', () => {
    let pendingStaffId: string;
    const pendingEmail = `staff-align-resend-${Date.now()}@example.com`;

    beforeAll(async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff').send({ name: 'Resend Target', email: pendingEmail, role_id: testRoleId });
        pendingStaffId = res.body.data.id;
    });

    afterAll(async () => {
        await knex('users').where({ email: pendingEmail }).delete();
    });

    it('returns 200 and valid StaffMember shape for a pending staff member', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post(`/api/staff/${pendingStaffId}/resend-invitation`);
        expect(res.status).toBe(200);
        await expect(
            staffMemberSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
        const s: StaffMember = res.body.data as StaffMember;
        expect(s.must_change_password).toBe(true);
    });

    it('password_hash is stripped from resend response', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post(`/api/staff/${pendingStaffId}/resend-invitation`);
        expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('returns 409 when the invitation has already been accepted', async () => {
        await knex('users').where({ id: pendingStaffId }).update({ must_change_password: false });
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post(`/api/staff/${pendingStaffId}/resend-invitation`);
        expect(res.status).toBe(409);
        await knex('users').where({ id: pendingStaffId }).update({ must_change_password: true });
    });

    it('returns 404 when the staff member does not exist', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.post('/api/staff/00000000-0000-0000-0000-000000000000/resend-invitation');
        expect(res.status).toBe(404);
    });
});

// ─── DELETE /api/staff/:id (cancel invitation) ───────────────────────────────

describe('DELETE /api/staff/:id — cancel invitation', () => {
    it('returns 200 with INVITATION_CANCELLED code for a pending staff member', async () => {
        const email = `staff-align-cancel-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const create = await agent.post('/api/staff').send({ name: 'Cancel Target', email, role_id: testRoleId });
        const staffId = create.body.data.id;

        const res = await agent.delete(`/api/staff/${staffId}`);
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('INVITATION_CANCELLED');
    });

    it('staff no longer appears in GET /api/staff after cancel', async () => {
        const email = `staff-align-cancel-list-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const create = await agent.post('/api/staff').send({ name: 'Cancel List Check', email, role_id: testRoleId });
        const staffId = create.body.data.id;

        await agent.delete(`/api/staff/${staffId}`);

        const list = await agent.get('/api/staff');
        const ids = (list.body.data.staff as StaffMember[]).map((s) => s.id);
        expect(ids).not.toContain(staffId);
    });

    it('returns 409 when the invitation has already been accepted', async () => {
        const email = `staff-align-cancel-accepted-${Date.now()}@example.com`;
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const create = await agent.post('/api/staff').send({ name: 'Cancel Accepted', email, role_id: testRoleId });
        const staffId = create.body.data.id;

        await knex('users').where({ id: staffId }).update({ must_change_password: false });

        const res = await agent.delete(`/api/staff/${staffId}`);
        expect(res.status).toBe(409);

        await knex('users').where({ id: staffId }).delete();
    });

    it('returns 404 when the staff member does not exist', async () => {
        const { agent } = await loginAgent(app, OWNER_EMAIL);
        const res = await agent.delete('/api/staff/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });
});
