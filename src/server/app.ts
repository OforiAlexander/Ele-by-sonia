import './services/redis/client';
import { createApp } from './createApp';
import { runStartupSequence } from './startup';
import logger from './services/logger';
import redisClient from './services/redis/client';

if (!process.env.PORT) throw new Error('PORT is not set');
const PORT = Number(process.env.PORT);

const app = createApp();

redisClient.connect().catch((err) => logger.error('Redis connection error:', err));

runStartupSequence(() => {
    app.listen(PORT, () => {
        logger.info(`Elegance by Sconia server running on http://localhost:${PORT}`);
    });
}).catch((err) => {
    logger.error('Startup failed:', err);
    process.exit(1);
});

export default app;
