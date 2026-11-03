import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/HttpError.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ status: false, message: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ status: false, message: 'Body JSON tidak valid' });
  }
  console.error(err);
  res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server' });
};