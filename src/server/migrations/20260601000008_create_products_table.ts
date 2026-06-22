import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 191).notNullable();
    table.text('description').nullable();
    table.string('category', 100).notNullable();
    table.string('brand', 100).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('products');
}
