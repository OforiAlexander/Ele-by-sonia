import Knex from 'knex';
import { Model } from 'objection';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

// __filename ends with .ts when running via ts-node, .js when running compiled output
const runningAsTs = __filename.endsWith('.ts');

const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
        directory: runningAsTs ? './src/server/migrations' : './dist/server/migrations',
        extension:  runningAsTs ? 'ts' : 'js',
    },
});

Model.knex(knex);

export default knex;
