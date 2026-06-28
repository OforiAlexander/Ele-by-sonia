import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import RedisStore from 'connect-redis';
import rateLimit from 'express-rate-limit';
import { trim } from 'validator';
import logger from './services/logger';

import redisClient from './services/redis/client';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes/api';
import paystackWebhook from './routes/webhooks/paystack';

if (!process.env.BASE_URL) throw new Error('BASE_URL is not set');
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');

const BASE_URL = process.env.BASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

function sanitiseValue(val: unknown): unknown {
    if (typeof val === 'string') return trim(val);
    if (Array.isArray(val)) return val.map(sanitiseValue);
    if (val !== null && typeof val === 'object') {
        return Object.fromEntries(
            Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, sanitiseValue(v)])
        );
    }
    return val;
}

const SLOW_REQUEST_MS = 1000;

// Paths that generate too much noise to log individually
const SILENT_PREFIXES = ['/uploads/', '/account/', '/inventory/'];
const SILENT_EXTENSIONS = /\.(js|css|ico|png|jpg|jpeg|svg|woff2?|ttf|map)$/i;

function statusColor(code: number): string {
    if (code >= 500) return '\x1b[31m';   // red
    if (code >= 400) return '\x1b[33m';   // yellow
    if (code >= 300) return '\x1b[36m';   // cyan
    return '\x1b[32m';                     // green
}
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';
const BOLD  = '\x1b[1m';

function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    const originalEnd = res.end.bind(res) as typeof res.end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = (...args: Parameters<typeof res.end>) => {
        const ms      = Number(process.hrtime.bigint() - start) / 1_000_000;
        const rounded = Math.round(ms);

        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${rounded}ms`);
        }

        const skip =
            SILENT_EXTENSIONS.test(req.path) ||
            SILENT_PREFIXES.some((p) => req.path.startsWith(p));

        if (!skip) {
            const sc   = res.statusCode;
            const col  = statusColor(sc);
            const slow = rounded >= SLOW_REQUEST_MS ? ` ${BOLD}\x1b[33m⚠ SLOW${RESET}` : '';
            const method = req.method.padEnd(6);
            logger.http(`${BOLD}${method}${RESET} ${req.path} ${DIM}→${RESET} ${col}${sc}${RESET} ${DIM}${rounded}ms${RESET}${slow}`);
        }

        return originalEnd(...args);
    };

    next();
}

export function createApp() {
    const app = express();

    app.use(requestLoggerMiddleware);

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: [
                        "'self'", 'data:', 'blob:',
                        'https://www.gstatic.com',
                        'https://*.r2.dev',
                        ...(process.env.R2_PUBLIC_URL ? [process.env.R2_PUBLIC_URL] : []),
                    ],
                    frameSrc: ["'self'", 'https://www.google.com', 'https://recaptcha.net'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                },
            },
        })
    );
    app.use(cors({ origin: BASE_URL, credentials: true }));

    app.use('/webhooks/paystack', express.raw({ type: 'application/json' }), paystackWebhook);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(
        session({
            store: new RedisStore({ client: redisClient }),
            secret: SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            },
        })
    );

    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 300,
            standardHeaders: true,
            legacyHeaders: false,
            message: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        })
    );

    app.use((req: Request, _res: Response, next: NextFunction) => {
        if (req.body) req.body = sanitiseValue(req.body);
        if (req.query) req.query = sanitiseValue(req.query) as typeof req.query;
        if (req.params) req.params = sanitiseValue(req.params) as typeof req.params;
        next();
    });

    app.use(express.static('public'));
    app.use('/uploads', express.static('uploads'));
    app.use('/api', apiRoutes);
    app.get('/', (_req, res) => res.redirect('/account/'));
    app.get('/account', (_req, res) => res.redirect('/account/'));
    app.get('/account/*', (_req: Request, res: Response) =>
        res.sendFile(path.resolve('public/account/index.html')));

    app.get('/inventory', (_req, res) => res.redirect('/inventory/'));
    app.get('/inventory/*', (_req: Request, res: Response) =>
        res.sendFile(path.resolve('public/inventory/index.html')));

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
