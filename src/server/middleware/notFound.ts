import { Request, Response } from 'express';
import { CODES } from '../codes';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    code: CODES.NOT_FOUND,
    message: 'The requested resource was not found.',
  });
}
