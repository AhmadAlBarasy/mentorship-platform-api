import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';

const getUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: SUCCESS,
    user: req.user,
  });
});

export { getUser };
