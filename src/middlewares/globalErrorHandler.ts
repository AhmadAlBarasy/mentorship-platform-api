import { NextFunction, Request, Response } from 'express';
import APIError from '../classes/APIError';
import { FAIL } from '../constants/responseConstants';
import logger from '../loggers/appLogger';

export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof APIError){
    res.status(err.statusCode).json({
      status: FAIL,
      message: err.message,
    });
  } else {
    logger.error(err.message);
    if (err instanceof SyntaxError){
      return res.status(400).json({
        status: FAIL,
        message: 'Invalid JSON payload passed.',
      });
    }
    if ((err as any).code === 'EBADCSRFTOKEN') {
      return res.status(401).json({
        status: FAIL,
        message: 'Invalid or missing CSRF token.',
      });
    }
    res.status(500).json({
      status: FAIL,
      message: 'Something went wrong.',
    });
  }
};
