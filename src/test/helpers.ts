import bcrypt from 'bcryptjs';
import knex from '../server/models/_config';

export async function createTestUser(overrides: Partial<{
    email: string;
    name: string;
    password: string;
    is_active: boolean;
    is_owner: boolean;
    must_change_password: boolean;
}> = {}) {
    const password = overrides.password ?? 'TestPass123!';
    const [user] = await knex('users').insert({
        email: overrides.email ?? `test-${Date.now()}@example.com`,
        name: overrides.name ?? 'Test User',
        phone: '',
        password_hash: await bcrypt.hash(password, 10),
        is_owner: overrides.is_owner ?? false,
        is_active: overrides.is_active ?? true,
        must_change_password: overrides.must_change_password ?? false,
        otp_attempts: 0,
    }).returning('*');
    return { user, password };
}

export async function cleanupUser(email: string) {
    const user = await knex('users').where({ email }).first();
    if (user) {
        await knex('audit_logs').where({ user_id: user.id }).delete();
        await knex('users').where({ id: user.id }).delete();
    }
}

export async function cleanupUsersByEmailLike(pattern: string) {
    const users = await knex('users').where('email', 'like', pattern).select('id');
    if (users.length > 0) {
        await knex('audit_logs').whereIn('user_id', users.map((u) => u.id)).delete();
        await knex('users').whereIn('id', users.map((u) => u.id)).delete();
    }
}
