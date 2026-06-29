import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('notifications', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('type', 50).notNullable();
        table.string('title', 255).notNullable();
        table.text('body').nullable();
        table.jsonb('data').nullable();
        table.timestamp('read_at', { useTz: true }).nullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.table('notifications', (table) => {
        table.index(['user_id', 'read_at'], 'idx_notifications_user_unread');
        table.index(['type', 'created_at'], 'idx_notifications_type_date');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('notifications');
}
