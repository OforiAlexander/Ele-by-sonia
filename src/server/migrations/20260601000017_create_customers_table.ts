import type { Knex } from 'knex';

// Phase 2 — online store customer accounts (separate from staff users)
// Also adds the customer_id FK to orders, which was deferred from migration 015.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 191).notNullable().unique();
    table.string('name', 120).notNullable();
    table.string('phone', 30).notNullable().defaultTo('');
    table.string('password_hash', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });

  await knex.schema.alterTable('orders', (table) => {
    table.foreign('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (table) => {
    table.dropForeign(['customer_id']);
  });
  await knex.schema.dropTable('customers');
}
