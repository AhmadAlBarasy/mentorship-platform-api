import { NextFunction } from 'express';
import jwt, { JsonWebTokenError, JwtPayload, Secret, TokenExpiredError } from 'jsonwebtoken';
import APIError from '../classes/APIError';

const decodeJwt = (token: string, next: NextFunction) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as Secret) as JwtPayload;
    return payload;
  } catch (err){
    if (err instanceof TokenExpiredError){
      next(new APIError(401, 'JWT expired'));
    }
    if (err instanceof JsonWebTokenError){
      next(new APIError(401, 'Malformed JWT'));
    }
  }
};

export { decodeJwt };
