import type { Knex } from 'knex';

// Phase 2 — online customer orders
// customer_id FK is added in migration 017 after the customers table exists.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('order_number', 20).notNullable().unique();
    table.uuid('customer_id').notNullable(); // FK added in migration 017
    table.string('status', 30).notNullable().defaultTo('pending');
    table.string('payment_status', 20).notNullable().defaultTo('pending');
    table.string('delivery_type', 20).notNullable(); // 'delivery' | 'pickup'
    table.uuid('delivery_zone_id').nullable().references('id').inTable('delivery_zones').onDelete('SET NULL');
    table.text('delivery_address').nullable();
    table.decimal('delivery_fee', 10, 2).notNullable().defaultTo(0);
    table.string('handler_type', 20).nullable(); // 'owner' | 'courier'
    table.string('handler_name', 120).nullable();
    table.string('handler_phone', 30).nullable();
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('total', 12, 2).notNullable();
    table.string('paystack_reference', 120).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('orders');
}
