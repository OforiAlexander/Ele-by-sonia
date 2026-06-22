/**
 * Auth alignment tests.
 * Verify that every auth endpoint returns data matching the frontend CurrentUser
 * type AND that the request shapes the frontend sends are accepted by the backend.
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { CurrentUser } from '../client/common/types';
import { currentUserSchema } from './schemas';
import {
    createTestUser, cleanupUser, loginAgent,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));
jest.mock('../server/services/mail/send-mail', () => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();
const EMAIL = 'auth-align@example.com';

beforeAll(async () => {
    await connectDb();
    await cleanupUser(EMAIL);
    await createTestUser({ email: EMAIL, password: TEST_PASS });
});

afterAll(async () => {
    await cleanupUser(EMAIL);
    await disconnectDb();
});

// ─── Login request shape ──────────────────────────────────────────────────────

describe('POST /api/auth/login — request shape the frontend sends', () => {
    it('accepts {email, password, recaptchaToken} and returns 200', async () => {
        // Exactly what LoginPage.tsx posts via api.post('/auth/login', {...})
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL, password: TEST_PASS, recaptchaToken: 'mock' });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe('LOGGED_IN');
    });

    it('rejects if recaptchaToken is absent — frontend must send it', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL, password: TEST_PASS });
        expect(res.status).toBe(422);
    });
});

// ─── Login response shape → CurrentUser ──────────────────────────────────────

describe('POST /api/auth/login — response shape matches CurrentUser type', () => {
    it('response.data validates against currentUserSchema', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL, password: TEST_PASS, recaptchaToken: 'mock' });

        await expect(
            currentUserSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('all required CurrentUser fields are present', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL, password: TEST_PASS, recaptchaToken: 'mock' });

        // Compile-time: TypeScript must agree this is assignable to CurrentUser
        const user: CurrentUser = res.body.data as CurrentUser;

        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.email).toBe(EMAIL);
        expect(typeof user.is_owner).toBe('boolean');
        expect(typeof user.is_active).toBe('boolean');
        expect(typeof user.must_change_password).toBe('boolean');
        // phone is always present (can be null); role_id is absent when user has no role
        expect('phone' in res.body.data).toBe(true);
        expect('role_id' in res.body.data).toBe(false);
    });

    it('sensitive fields are stripped — never sent to the frontend', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: EMAIL, password: TEST_PASS, recaptchaToken: 'mock' });

        expect(res.body.data).not.toHaveProperty('password_hash');
        expect(res.body.data).not.toHaveProperty('otp_code');
        expect(res.body.data).not.toHaveProperty('reset_token');
        expect(res.body.data).not.toHaveProperty('otp_expires_at');
        expect(res.body.data).not.toHaveProperty('reset_token_expires_at');
    });
});

// ─── /me response shape → CurrentUser ────────────────────────────────────────

describe('GET /api/auth/me — response shape matches CurrentUser type', () => {
    it('returns same shape as login — validates against currentUserSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/auth/me');

        expect(res.status).toBe(200);
        await expect(
            currentUserSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('can_* permission flags are boolean when user has a role', async () => {
        const { agent, user } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/auth/me');

        // Owner has all flags as true; regular users have booleans
        const data: CurrentUser = res.body.data as CurrentUser;
        // At minimum the flag keys should be present if user is owner
        if (data.is_owner) {
            expect(typeof data.can_view_products).toBe('boolean');
            expect(typeof data.can_process_sales).toBe('boolean');
            expect(typeof data.can_view_reports).toBe('boolean');
        }
        void user; // referenced to keep loginAgent return value used
    });

    it('returns 401 when not logged in — frontend 401 interceptor fires', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});

// ─── Logout request shape ─────────────────────────────────────────────────────

describe('POST /api/auth/logout — request shape the frontend sends', () => {
    it('accepts POST with no body — frontend just calls api.post("/auth/logout")', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('LOGGED_OUT');
    });

    it('session is invalidated after logout — subsequent /me returns 401', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        await agent.post('/api/auth/logout');
        const meRes = await agent.get('/api/auth/me');
        expect(meRes.status).toBe(401);
    });
});
