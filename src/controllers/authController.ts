import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';

import errorHandler from "../utils/asyncErrorHandler";
import APIError from '../types/classes/APIError';

export const login = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: SUCCESS,
    message: 'Successfully logged in.'
  });
});