import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('users', (t) => {
        t.integer('failed_login_attempts').notNullable().defaultTo(0);
        t.timestamp('locked_until', { useTz: true }).nullable();
        t.timestamp('last_password_change_at', { useTz: true }).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('users', (t) => {
        t.dropColumn('last_password_change_at');
        t.dropColumn('locked_until');
        t.dropColumn('failed_login_attempts');
    });
}
