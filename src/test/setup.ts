import knex from '../server/models/_config';
import redisClient from '../server/services/redis/client';

beforeAll(async () => {
    await redisClient.connect().catch(() => undefined);
});

afterAll(async () => {
    await knex.destroy();
    await redisClient.quit().catch(() => undefined);
});
