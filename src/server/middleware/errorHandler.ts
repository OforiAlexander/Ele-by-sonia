import { Request, Response, NextFunction } from 'express';
import { CODES } from '../codes';
import logger from '../services/logger';

interface AppError extends Error {
    status?: number;
    code?: string;
}

export function errorHandler(
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const status = err.status ?? 500;
    const code = err.code ?? CODES.SERVER_ERROR;

    if (status >= 500) {
        logger.error(err.message, { stack: err.stack });
    }

    res.status(status).json({
        code,
        message: status >= 500 ? 'An unexpected error occurred. Please try again.' : err.message,
    });
}
