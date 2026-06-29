import request from 'supertest';
import { Express } from 'express';
import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

export { createTestUser, cleanupUser, cleanupUsersByEmailLike } from './helpers';

export const TEST_PASS = 'AlignTest123!';

/** Returns a supertest agent that carries the session cookie. */
export async function loginAgent(app: Express, email: string, password = TEST_PASS) {
    const agent = request.agent(app);
    const res = await agent
        .post('/api/auth/login')
        .send({ email, password, recaptchaToken: 'mock-token' });
    if (res.status !== 200) {
        throw new Error(`loginAgent: expected 200 got ${res.status} — ${JSON.stringify(res.body)}`);
    }
    return { agent, user: res.body.data };
}

/** Create a minimal product and return its id. */
export async function createTestProduct(overrides: Partial<{
    name: string; category: string; created_by: string;
}> = {}, userId: string) {
    const [product] = await knex('products').insert({
        name: overrides.name ?? `Align Product ${Date.now()}`,
        category: overrides.category ?? 'Shoes',
        brand: null,
        description: null,
        created_by: userId,
    }).returning('*');
    return product as { id: string; name: string; category: string; created_at: string };
}

/** Delete a product and cascade dependants. */
export async function cleanupTestProduct(productId: string) {
    const variantIds = knex('product_variants').where({ product_id: productId }).select('id');
    await knex('stock_entries').whereIn('variant_id', variantIds).delete();
    await knex('variant_option_values').whereIn('variant_id', variantIds).delete();
    await knex('product_variants').where({ product_id: productId }).delete();
    await knex('product_option_values')
        .whereIn('option_type_id', knex('product_option_types').where({ product_id: productId }).select('id'))
        .delete();
    await knex('product_option_types').where({ product_id: productId }).delete();
    await knex('product_images').where({ product_id: productId }).delete();
    await knex('products').where({ id: productId }).delete();
}

/**
 * Drop all products created by this user (cascade), then delete the user.
 * Use this instead of cleanupUser() in alignment tests because they call
 * API endpoints that create products linked via created_by FK.
 */
export async function cleanupUserCascade(email: string) {
    const user = await knex('users').where({ email }).first();
    if (!user) return;
    const products = await knex('products').where({ created_by: user.id }).select('id');
    for (const p of products) {
        await cleanupTestProduct(p.id).catch(() => undefined);
    }
    await knex('audit_logs').where({ user_id: user.id }).delete().catch(() => undefined);
    await knex('users').where({ id: user.id }).delete();
}

/** Insert a minimal role and return its record. */
export async function createTestRole(name: string) {
    const [role] = await knex('roles').insert({ name }).returning('*');
    return role as { id: string; name: string; created_at: string };
}

/** Delete all roles whose name matches the given pattern, along with their permissions. */
export async function cleanupTestRoles(namePattern: string) {
    const roles = await knex('roles').where('name', 'like', namePattern).select('id');
    for (const r of roles) {
        await knex('role_permissions').where({ role_id: r.id }).delete().catch(() => undefined);
        await knex('roles').where({ id: r.id }).delete().catch(() => undefined);
    }
}

export async function connectDb() {
    await redisClient.connect().catch(() => undefined);
}

export async function disconnectDb() {
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
}
