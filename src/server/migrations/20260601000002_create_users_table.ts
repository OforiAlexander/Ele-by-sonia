import type { Knex } from 'knex';

// Users table is created before roles to break the circular FK dependency.
// role_id FK constraint is added in migration 20260601000003 after roles exist.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 191).notNullable().unique();
    table.string('name', 120).notNullable();
    table.string('phone', 30).notNullable().defaultTo('');
    table.string('password_hash', 255).notNullable();
    table.uuid('role_id').nullable(); // FK added after roles table exists
    table.boolean('is_owner').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
