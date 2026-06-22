import request from 'supertest';
import { createApp } from '../server/createApp';
import { createTestUser, cleanupUser } from './helpers';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

jest.mock('../server/services/mail/send-mail', () => ({
    sendMail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();
const TEST_EMAIL = 'auth-test@example.com';
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

function agent() {
    return request.agent(app);
}

describe('POST /api/auth/login', () => {
    it('returns 422 when email is missing', async () => {
        const res = await request(app).post('/api/auth/login').send({ password: TEST_PASS, recaptchaToken: 'tok' });
        expect(res.status).toBe(422);
    });

    it('returns 422 when password is missing', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, recaptchaToken: 'tok' });
        expect(res.status).toBe(422);
    });

    it('returns 422 when recaptchaToken is missing', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS });
        expect(res.status).toBe(422);
    });

    it('returns 401 INVALID_CREDENTIALS when email not found', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'no@one.com', password: TEST_PASS, recaptchaToken: 'tok' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 INVALID_CREDENTIALS when password is wrong', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'WrongPass!', recaptchaToken: 'tok' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 200 LOGGED_IN with user on success', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('LOGGED_IN');
        expect(res.body.data.email).toBe(TEST_EMAIL);
        expect(res.body.data.password_hash).toBeUndefined();
    });

    it('sets a session cookie on success', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 403 ACCOUNT_INACTIVE for deactivated account', async () => {
        const email = 'inactive-auth@example.com';
        await cleanupUser(email);
        await createTestUser({ email, password: TEST_PASS, is_active: false });
        const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASS, recaptchaToken: 'tok' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_INACTIVE');
        await cleanupUser(email);
    });
});

describe('POST /api/auth/logout', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.status).toBe(401);
    });

    it('returns 200 LOGGED_OUT when logged in', async () => {
        const session = agent();
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        const res = await session.post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('LOGGED_OUT');
    });
});

describe('GET /api/auth/me', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('returns 200 with user when logged in', async () => {
        const session = agent();
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        const res = await session.get('/api/auth/me');
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(TEST_EMAIL);
        expect(res.body.data.password_hash).toBeUndefined();
    });
});

describe('POST /api/auth/change-password', () => {
    it('returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/auth/change-password').send({ currentPassword: TEST_PASS, newPassword: 'NewPass123!' });
        expect(res.status).toBe(401);
    });

    it('returns 422 when currentPassword is missing', async () => {
        const session = agent();
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        const res = await session.post('/api/auth/change-password').send({ newPassword: 'NewPass123!' });
        expect(res.status).toBe(422);
    });

    it('returns 422 when newPassword is too short', async () => {
        const session = agent();
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        const res = await session.post('/api/auth/change-password').send({ currentPassword: TEST_PASS, newPassword: 'short' });
        expect(res.status).toBe(422);
    });

    it('returns 401 when currentPassword is wrong', async () => {
        const session = agent();
        await session.post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS, recaptchaToken: 'tok' });
        const res = await session.post('/api/auth/change-password').send({ currentPassword: 'WrongPass!', newPassword: 'NewPass123!' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 200 PASSWORD_CHANGED on success', async () => {
        const email = 'change-pw@example.com';
        const pass = 'OriginalPass1!';
        await cleanupUser(email);
        await createTestUser({ email, password: pass });
        const session = agent();
        await session.post('/api/auth/login').send({ email, password: pass, recaptchaToken: 'tok' });
        const res = await session.post('/api/auth/change-password').send({ currentPassword: pass, newPassword: 'NewPass999!' });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('PASSWORD_CHANGED');
        await cleanupUser(email);
    });
});

describe('POST /api/auth/forgot-password', () => {
    it('returns 422 when identifier is missing', async () => {
        const res = await request(app).post('/api/auth/forgot-password').send({ recaptchaToken: 'tok' });
        expect(res.status).toBe(422);
    });

    it('returns 200 RESET_CODE_SENT even when user not found (prevents enumeration)', async () => {
        const res = await request(app).post('/api/auth/forgot-password').send({ identifier: 'nobody@nowhere.com', recaptchaToken: 'tok' });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('RESET_CODE_SENT');
    });

    it('returns 200 RESET_CODE_SENT and sends OTP when user found', async () => {
        const { sendMail } = jest.requireMock('../server/services/mail/send-mail');
        sendMail.mockClear();
        const res = await request(app).post('/api/auth/forgot-password').send({ identifier: TEST_EMAIL, recaptchaToken: 'tok' });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('RESET_CODE_SENT');
        expect(sendMail).toHaveBeenCalledTimes(1);
    });
});

describe('POST /api/auth/verify-code', () => {
    it('returns 422 when identifier or code is missing', async () => {
        const res = await request(app).post('/api/auth/verify-code').send({ identifier: TEST_EMAIL });
        expect(res.status).toBe(422);
    });

    it('returns 400 when code is invalid', async () => {
        const res = await request(app).post('/api/auth/verify-code').send({ identifier: TEST_EMAIL, code: '000000' });
        expect(res.status).toBe(400);
    });

    it('returns 200 CODE_VERIFIED with reset token when code is correct', async () => {
        const otp = '123456';
        await knex('users').where({ email: TEST_EMAIL }).update({
            otp_code: otp,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            otp_attempts: 0,
        });
        const res = await request(app).post('/api/auth/verify-code').send({ identifier: TEST_EMAIL, code: otp });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('CODE_VERIFIED');
        expect(res.body.data.resetToken).toBeDefined();
    });
});

describe('POST /api/auth/reset-password', () => {
    it('returns 422 when token or password is missing', async () => {
        const res = await request(app).post('/api/auth/reset-password').send({ newPassword: 'NewPass123!' });
        expect(res.status).toBe(422);
    });

    it('returns 400 when token is invalid', async () => {
        const res = await request(app).post('/api/auth/reset-password').send({ token: 'bad-token', newPassword: 'NewPass123!' });
        expect(res.status).toBe(400);
    });

    it('returns 200 PASSWORD_UPDATED with a valid token', async () => {
        const token = 'valid-reset-token-abc123';
        await knex('users').where({ email: TEST_EMAIL }).update({
            reset_token: token,
            reset_token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        const res = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'BrandNew999!' });
        expect(res.status).toBe(200);
        expect(res.body.code).toBe('PASSWORD_UPDATED');
        await knex('users').where({ email: TEST_EMAIL }).update({ password_hash: await (await import('bcryptjs')).hash(TEST_PASS, 10) });
    });
});
