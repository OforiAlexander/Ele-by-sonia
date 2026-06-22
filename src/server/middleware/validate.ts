import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CODES } from '../codes';

export function checkForValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    res.status(422).json({
      code: CODES.VALIDATION_ERROR,
      message: first.msg,
      field: 'path' in first ? first.path : undefined,
    });
    return;
  }

  next();
}
