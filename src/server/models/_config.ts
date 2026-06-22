import Knex from 'knex';
import { Model } from 'objection';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
        directory: './src/server/migrations',
        extension: 'ts',
    },
});

Model.knex(knex);

export default knex;
