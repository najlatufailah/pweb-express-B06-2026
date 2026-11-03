import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/HttpError.js';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new HttpError(404, `Endpoint tidak ditemukan - ${req.originalUrl}`));
};