import { NextFunction, Request, Response } from 'express';

const errorHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch((err: Error) => next(err));
  };

export default errorHandler;
