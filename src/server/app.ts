import './services/redis/client';
import { runStartupSetup, getSessionMaxAgeMs, runStartupSequence } from './startup';
import { createApp } from './createApp';
import { registerJobs } from './jobs/scheduler';
import logger from './services/logger';
import redisClient from './services/redis/client';

if (!process.env.PORT) throw new Error('PORT is not set');
const PORT = Number(process.env.PORT);

const r2Public = process.env.R2_PUBLIC_URL;
if (r2Public) {
    logger.info(`[S3] R2_PUBLIC_URL: ${r2Public}`);
} else {
    logger.warn('[S3] R2_PUBLIC_URL is NOT set — uploads will be stored with the private API endpoint URL and will not load in browsers. Set R2_PUBLIC_URL in nodemon.json and restart.');
}

(async () => {
    try {
        redisClient.connect().catch((err) => logger.error('Redis connection error:', err));

        // Load settings from DB before creating the Express app so SESSION_TIMEOUT_MINUTES
        // is available for the session cookie maxAge (restart_required setting).
        await runStartupSetup();

        const sessionMaxAgeMs = getSessionMaxAgeMs();
        const app = createApp(sessionMaxAgeMs);

        await registerJobs();

        app.listen(PORT, () => {
            logger.info(`Elegance by Sconia server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error('Startup failed:', err);
        process.exit(1);
    }
})();
