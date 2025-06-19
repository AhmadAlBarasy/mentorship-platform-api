import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import APIError from '../classes/APIError';
import errorHandler from '../utils/asyncErrorHandler';
import { decodeJwt } from '../utils/jwt';
// import { getUserService } from '../services/userService';
import prisma from '../db';

const authorizedRoles = (roles: Role[] | '*') => {
  return async(req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return next(new APIError(403, 'Forbidden'));
    }
    if (roles === '*'){
      return next();
    }
    if (!roles.includes(userRole)) {
      return next(new APIError(403, 'Forbidden: You are not authorized to do this action'));
    }
    next();
  };
};

const authenticateUser = errorHandler(
  async(req: Request, res: Response, next: NextFunction) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return next(new APIError(401, 'Unauthorized, No token provided'));
    }
    const payload = decodeJwt(token, next);
    // fetch the user from the database
    const user = await prisma.user.findFirst({
      omit: {
        password: true,
      },
      where: {
        id: payload?.sub,
      },
    });
    if (!user){
      return next(new APIError(401, 'Invalid JWT'))
    }
    req.user = user;
    next();
  },
);

const getTokenFromRequest = (req: Request): string | null => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    [, token] = authHeader.split(' ');
  }
  // If the authorization header doesn't exist, try getting it from the cookies
  if (!token) {
    token = req.cookies.token;
  }
  return token;
};

export { authorizedRoles, authenticateUser };
