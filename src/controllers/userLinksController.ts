import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import APIError from '../classes/APIError';


const getAuthenticatedUserLinks = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const links = await prisma.userLinks.findMany({
    where: {
      userId: user.id,
    },
  });
  res.status(200).json({
    status: SUCCESS,
    links,
  });
});

const addAuthenticatedUserLinks = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  await prisma.userLinks.create({
    data: {
      ...(req.body),
      userId: user.id,
    },
  });
  res.status(201).json({
    status: SUCCESS,
    message: 'Link added successfully',
  })
});

const updateAuthenticatedUserLink = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, params } = req;
  const { id } = params;
  const link = await prisma.userLinks.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });
  if (!link){
    return next(new APIError(404, 'Link not found'));
  }
  const updatedLink = await prisma.userLinks.update({
    where: {
      id,
    },
    data: req.body,
  });
  res.status(200).json({
    status: SUCCESS,
    message: 'Link updated Successfully',
    link: updatedLink,
  });
});

const deleteAuthenticatedUserLink = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const { params } = req;
  const deletedLink = await prisma.userLinks.deleteMany({
    where: {
      id: params.id,
      userId: user.id,
    },
  });
  if (deletedLink.count === 0){
    return next(new APIError(404, 'Link not found'))
  }
  res.status(204).json({
    status: SUCCESS,
  });
});

export {
  getAuthenticatedUserLinks,
  addAuthenticatedUserLinks,
  updateAuthenticatedUserLink,
  deleteAuthenticatedUserLink,
}
