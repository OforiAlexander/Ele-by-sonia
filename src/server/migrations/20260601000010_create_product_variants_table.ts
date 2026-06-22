import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('product_variants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    table.string('size', 30).nullable();
    table.string('colour', 50).nullable();
    table.string('style', 50).nullable();
    table.decimal('cost_price', 12, 2).notNullable();
    table.decimal('selling_price', 12, 2).notNullable();
    table.integer('stock').notNullable().defaultTo(0);
    table.integer('low_stock_threshold').notNullable().defaultTo(5);
    table.string('sku', 80).nullable().unique();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('product_variants');
}
