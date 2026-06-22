import type { Knex } from 'knex';

// Phase 2 — delivery zones for online orders
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('delivery_zones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.decimal('fee', 10, 2).notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('delivery_zones');
}
