import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('sales', (table) => {
        table.decimal('discount', 12, 2).notNullable().defaultTo(0);
        table.text('note').nullable();
        table.timestamp('voided_at', { useTz: true }).nullable();
        table.uuid('voided_by_id').nullable().references('id').inTable('users').onDelete('RESTRICT');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('sales', (table) => {
        table.dropColumn('voided_by_id');
        table.dropColumn('voided_at');
        table.dropColumn('note');
        table.dropColumn('discount');
    });
}
