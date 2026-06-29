import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('sales', (t) => {
        t.decimal('vat_amount',        12, 2).notNullable().defaultTo(0);
        t.decimal('nhil_amount',       12, 2).notNullable().defaultTo(0);
        t.decimal('getfund_amount',    12, 2).notNullable().defaultTo(0);
        t.decimal('covid_levy_amount', 12, 2).notNullable().defaultTo(0);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('sales', (t) => {
        t.dropColumn('covid_levy_amount');
        t.dropColumn('getfund_amount');
        t.dropColumn('nhil_amount');
        t.dropColumn('vat_amount');
    });
}
