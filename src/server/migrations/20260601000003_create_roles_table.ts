import type { Knex } from 'knex';

// Creates roles and adds the FK constraint for users.role_id → roles
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 80).notNullable().unique();
    table.text('description').nullable();
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).nullable();
  });

  // Add the FK now that roles table exists
  await knex.schema.alterTable('users', (table) => {
    table.foreign('role_id').references('id').inTable('roles').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropForeign(['role_id']);
  });
  await knex.schema.dropTable('roles');
}
