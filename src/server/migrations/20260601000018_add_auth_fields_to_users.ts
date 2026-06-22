import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('must_change_password').notNullable().defaultTo(false);
        table.string('otp_code', 6).nullable();
        table.timestamp('otp_expires_at', { useTz: true }).nullable();
        table.integer('otp_attempts').notNullable().defaultTo(0);
        table.string('reset_token', 64).nullable();
        table.timestamp('reset_token_expires_at', { useTz: true }).nullable();
        table.timestamp('sessions_invalidated_at', { useTz: true }).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('must_change_password');
        table.dropColumn('otp_code');
        table.dropColumn('otp_expires_at');
        table.dropColumn('otp_attempts');
        table.dropColumn('reset_token');
        table.dropColumn('reset_token_expires_at');
        table.dropColumn('sessions_invalidated_at');
    });
}
