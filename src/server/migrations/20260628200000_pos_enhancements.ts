import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('sales', (t) => {
        t.string('customer_phone', 20).nullable();
        t.string('momo_provider', 10).nullable();
    });

    await knex.schema.table('sales', (t) => {
        t.index('created_at',        'idx_sales_created_at');
        t.index('staff_id',          'idx_sales_staff_id');
        t.index('payment_status',    'idx_sales_payment_status');
        t.index('paystack_reference','idx_sales_paystack_reference');
    });

    await knex.schema.table('sale_items', (t) => {
        t.index('sale_id',    'idx_sale_items_sale_id');
        t.index('variant_id', 'idx_sale_items_variant_id');
    });

    await knex.schema.createTable('sale_returns', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('sale_id').notNullable().references('id').inTable('sales').onDelete('RESTRICT');
        t.uuid('processed_by_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
        t.text('note').nullable();
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('sale_return_items', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('return_id').notNullable().references('id').inTable('sale_returns').onDelete('CASCADE');
        t.uuid('sale_item_id').notNullable().references('id').inTable('sale_items').onDelete('RESTRICT');
        t.integer('quantity').notNullable();
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.table('sale_returns', (t) => {
        t.index('sale_id', 'idx_sale_returns_sale_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('sale_return_items');
    await knex.schema.dropTableIfExists('sale_returns');

    await knex.schema.table('sale_items', (t) => {
        t.dropIndex([], 'idx_sale_items_variant_id');
        t.dropIndex([], 'idx_sale_items_sale_id');
    });

    await knex.schema.table('sales', (t) => {
        t.dropIndex([], 'idx_sales_paystack_reference');
        t.dropIndex([], 'idx_sales_payment_status');
        t.dropIndex([], 'idx_sales_staff_id');
        t.dropIndex([], 'idx_sales_created_at');
        t.dropColumn('momo_provider');
        t.dropColumn('customer_phone');
    });
}
