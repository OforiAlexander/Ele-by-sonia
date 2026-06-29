/**
 * Settings alignment tests.
 * Verify that settings endpoints return data matching the frontend Setting type
 * and that the PUT request shape the frontend sends is accepted.
 */
import request from 'supertest';
import { createApp } from '../server/createApp';
import type { AppSetting as Setting } from '../client/common/types';
import { settingSchema } from './schemas';
import {
    createTestUser, cleanupUser, loginAgent,
    connectDb, disconnectDb, TEST_PASS,
} from './align-helpers';
import knex from '../server/models/_config';

jest.mock('../server/services/recaptcha', () => ({
    verifyRecaptcha: jest.fn().mockResolvedValue(true),
}));

const app = createApp();
const EMAIL = 'settings-align@example.com';
let originalBusinessName = '';

beforeAll(async () => {
    await connectDb();
    await cleanupUser(EMAIL);
    await createTestUser({ email: EMAIL, password: TEST_PASS, is_owner: true });
    const row = await knex('settings').where({ name: 'BUSINESS_NAME' }).first();
    originalBusinessName = row?.value ?? 'Elegance by Sconia';
});

afterAll(async () => {
    await knex('settings').where({ name: 'BUSINESS_NAME' }).update({ value: originalBusinessName });
    await cleanupUser(EMAIL);
    await disconnectDb();
});

// ─── GET /api/settings — list shape ──────────────────────────────────────────

describe('GET /api/settings — response shape matches Setting[]', () => {
    it('returns 200 with an array', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/settings');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('every setting validates against settingSchema', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/settings');

        for (const item of res.body.data) {
            await expect(
                settingSchema.validate(item, { abortEarly: false }),
            ).resolves.toBeDefined();
        }
    });

    it('every setting has the required fields the frontend SettingsPage reads', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/settings');

        for (const item of res.body.data) {
            // Compile-time: TypeScript must agree this is assignable to Setting
            const setting: Setting = item as Setting;

            expect(setting.id).toBeDefined();
            expect(setting.name).toBeDefined();
            expect(setting.label).toBeDefined();       // human-readable label for the UI
            expect(setting.value).toBeDefined();       // current value shown in the input
            expect(setting.group).toBeDefined();       // used to group settings in the UI
            expect(typeof setting.editable).toBe('boolean'); // drives read-only vs editable input
        }
    });

    it('BUSINESS_NAME setting is present — required by the SettingsPage', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.get('/api/settings');

        const bizName = res.body.data.find((s: Setting) => s.name === 'BUSINESS_NAME');
        expect(bizName).toBeDefined();
        expect(bizName.editable).toBe(true);
    });
});

// ─── PUT /api/settings/:name — request shape the frontend sends ───────────────

describe('PUT /api/settings/:name — accepts {value} from the frontend input', () => {
    it('accepts {value: string} and returns updated setting', async () => {
        // Exactly what the SettingsPage PUT handler sends
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent
            .put('/api/settings/BUSINESS_NAME')
            .send({ value: 'Updated Store Name' });

        expect(res.status).toBe(200);
        // Response includes the updated setting — used to update UI optimistically
        await expect(
            settingSchema.validate(res.body.data, { abortEarly: false }),
        ).resolves.toBeDefined();
    });

    it('returns 422 when value is missing — frontend Yup schema catches this first', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.put('/api/settings/BUSINESS_NAME').send({});
        expect(res.status).toBe(422);
    });

    it('returns 422 when value is empty string', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.put('/api/settings/BUSINESS_NAME').send({ value: '' });
        expect(res.status).toBe(422);
    });

    it('returns 404 for unknown setting name', async () => {
        const { agent } = await loginAgent(app, EMAIL);
        const res = await agent.put('/api/settings/NONEXISTENT_SETTING').send({ value: 'x' });
        expect(res.status).toBe(404);
    });

    it('returns 401 when not authenticated — frontend redirect to login', async () => {
        const res = await request(app)
            .put('/api/settings/BUSINESS_NAME')
            .send({ value: 'Test' });
        expect(res.status).toBe(401);
    });
});
