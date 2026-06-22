import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
    development: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: { directory: './src/server/migrations', extension: 'ts' }
    },

    staging: {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        migrations: { tableName: 'knex_migrations', directory: './src/server/migrations', extension: 'ts' },
        pool: { min: 2, max: 10 }
    },

    production: {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        migrations: { tableName: 'knex_migrations', directory: './src/server/migrations', extension: 'ts' },
        pool: { min: 2, max: 10 }
    }
};

export default config;
