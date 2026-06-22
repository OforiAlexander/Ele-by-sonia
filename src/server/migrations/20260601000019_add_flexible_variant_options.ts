import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('product_option_types', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
        table.string('name', 50).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.unique(['product_id', 'name']);
    });

    await knex.schema.createTable('product_option_values', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('option_type_id').notNullable().references('id').inTable('product_option_types').onDelete('CASCADE');
        table.string('value', 100).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.unique(['option_type_id', 'value']);
    });

    await knex.schema.createTable('variant_option_values', (table) => {
        table.uuid('variant_id').notNullable().references('id').inTable('product_variants').onDelete('CASCADE');
        table.uuid('option_value_id').notNullable().references('id').inTable('product_option_values').onDelete('RESTRICT');
        table.primary(['variant_id', 'option_value_id']);
    });

    await knex.schema.alterTable('product_variants', (table) => {
        table.dropColumn('size');
        table.dropColumn('colour');
        table.dropColumn('style');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('variant_option_values');
    await knex.schema.dropTableIfExists('product_option_values');
    await knex.schema.dropTableIfExists('product_option_types');

    await knex.schema.alterTable('product_variants', (table) => {
        table.string('size', 30).nullable();
        table.string('colour', 50).nullable();
        table.string('style', 50).nullable();
    });
}
