import { NextFunction, Request, Response } from 'express';
import APIError from '../classes/APIError';
import { FAIL } from '../constants/responseConstants';
import logger from '../loggers/appLogger';
import { MulterError } from 'multer';

export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof APIError){
    res.status(err.statusCode).json({
      status: FAIL,
      message: err.message,
    });
  } else {
    console.log(err)
    logger.error(err.message);
    if (err instanceof SyntaxError){
      return res.status(400).json({
        status: FAIL,
        message: 'Invalid JSON payload passed.',
      });
    }
    if (err instanceof MulterError){
      return multerErrorsHanlder(err, res);
    }
    res.status(500).json({
      status: FAIL,
      message: 'Something went wrong.',
    });
  }
};

function multerErrorsHanlder(err: MulterError, res: Response) {
  if (err.code === 'LIMIT_FILE_SIZE'){
    return res.status(400).json({
      status: FAIL,
      message: 'Image size too large',
    });
  }
};
