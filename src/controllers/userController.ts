import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import APIError from '../classes/APIError';
import { Role } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

const getUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = await prisma.users.findFirst({
    where: {
      id,
    },
    omit: {
      password: true,
    },
  });
  if (!user){
    return next(new APIError(404, 'User not found'));
  }
  res.status(200).json({
    status: SUCCESS,
    user,
  });
});

const getAuthenticatedUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: SUCCESS,
    user: req.user,
  });
});

const updateUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { user: requestUser } = req;
  // admins have full control over the system
  if (requestUser.id !== id && requestUser.role !== Role.ADMIN){
    return next(new APIError(403, 'You are not allowed to preform this action'));
  }
  const user = await prisma.users.update({
    omit: {
      password: true,
    },
    where: {
      id,
    },
    data: req.body,
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'User updated successfully',
    user,

  });
});

const getUserSkills = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = await prisma.users.findFirst({
    where: {
      id,
    },
    omit: {
      password: true,
    },
  });
  if (!user){
    return next(new APIError(404, 'User not found'));
  }
  res.status(200).json({
    status: SUCCESS,
    skills: user.skills,
  });
});

const updateUserSkills = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { skills } = req.body;
  const { id } = req.params;
  const { user: requestUser } = req;
  const userSkills = (await prisma.users.findFirst({
    where: {
      id,
    },
    select: {
      skills: true,
    },
  }))?.skills as Array<JsonValue>;
  Array.from(skills).forEach((skill: any) => {
    if (skill.add === true && !userSkills.includes(skill.name)){
      userSkills.push(skill.name);
    }
    if (skill.add === false && userSkills.includes(skill.name)){
      const index = userSkills.indexOf(skill.name);
      userSkills.splice(index, 1);
    }
  });
  if (requestUser.id !== id && requestUser.role !== Role.ADMIN){
    return next(new APIError(403, 'You are not allowed to preform this action'));
  }
  res.status(200).json({
    status: SUCCESS,
    skills: userSkills,
  });
});

export {
  getUser,
  getAuthenticatedUser,
  updateUser,
  getUserSkills,
  updateUserSkills,
};
