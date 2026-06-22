import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import RedisStore from 'connect-redis';
import rateLimit from 'express-rate-limit';
import { escape, trim } from 'validator';

import redisClient from './services/redis/client';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes/api';

if (!process.env.BASE_URL) throw new Error('BASE_URL is not set');
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');

const BASE_URL = process.env.BASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

function sanitiseValue(val: unknown): unknown {
    if (typeof val === 'string') return escape(trim(val));
    if (Array.isArray(val)) return val.map(sanitiseValue);
    if (val !== null && typeof val === 'object') {
        return Object.fromEntries(
            Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, sanitiseValue(v)])
        );
    }
    return val;
}

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: BASE_URL, credentials: true }));
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
