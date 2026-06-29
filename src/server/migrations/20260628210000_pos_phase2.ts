import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('sale_items', (t) => {
        t.decimal('original_price', 12, 2).nullable();
        t.decimal('price_override', 12, 2).nullable();
    });

    await knex.schema.table('sales', (t) => {
        t.decimal('levy_amount', 12, 2).notNullable().defaultTo(0);
    });

    await knex.schema.table('sale_returns', (t) => {
        t.string('refund_method', 20).notNullable().defaultTo('cash');
    });

    await knex.schema.createTable('sale_payments', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('sale_id').notNullable().references('id').inTable('sales').onDelete('RESTRICT');
        t.string('payment_method', 10).notNullable();
        t.decimal('amount', 12, 2).notNullable();
        t.decimal('amount_tendered', 12, 2).nullable();
        t.decimal('change_given', 12, 2).nullable();
        t.string('customer_phone', 20).nullable();
        t.string('momo_provider', 10).nullable();
        t.string('paystack_reference', 100).nullable();
        t.string('payment_status', 20).notNullable().defaultTo('paid');
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.index('sale_id', 'idx_sale_payments_sale_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('sale_payments');

    await knex.schema.table('sale_returns', (t) => {
        t.dropColumn('refund_method');
    });

    await knex.schema.table('sales', (t) => {
        t.dropColumn('levy_amount');
    });

    await knex.schema.table('sale_items', (t) => {
        t.dropColumn('price_override');
        t.dropColumn('original_price');
    });
}
