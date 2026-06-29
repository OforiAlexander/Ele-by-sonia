import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });

  await knex('categories').insert([
    { name: 'Ladies Clothing' },
    { name: 'Gentlemen Clothing' },
    { name: 'Shoes' },
    { name: 'Bags' },
    { name: 'Cosmetics' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('categories');
}
