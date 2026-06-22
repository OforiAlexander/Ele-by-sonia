import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stock_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('variant_id').notNullable().references('id').inTable('product_variants').onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    table.text('note').nullable();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('stock_entries');
}
