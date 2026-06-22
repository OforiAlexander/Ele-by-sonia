import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sale_number', 20).notNullable().unique();
    table.uuid('staff_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('payment_method', 20).notNullable(); // 'cash' | 'momo'
    table.string('payment_status', 20).notNullable().defaultTo('pending'); // 'pending' | 'paid' | 'failed'
    table.decimal('amount_due', 12, 2).notNullable();
    table.decimal('amount_tendered', 12, 2).nullable();
    table.decimal('change_given', 12, 2).nullable();
    table.string('paystack_reference', 120).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('sales');
}
