import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import {
  createAvailabilityObjects,
  prepareDateAvailabilitiesAndCheckForConflicts,
  prepareDayAvailabilitiesAndCheckForConflicts,
} from '../utils/availability/availabilityUtils';

const createService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const dayAvailabilities = [];
  const availabilityExceptions = [];

  const { id: mentorId } = req.user;
  const {
    id,
    type,
    days,
    exceptions,
    sessionTime,
    description,
  } = req.body;

  // 1. check if the ID has already been used before for this mentor
  const serviceExists = await prisma.services.findFirst({
    where: {
      mentorId,
      id,
    },
  });

  if (serviceExists){
    return next(new APIError(409, `You already have a service with an ID of ${id}`));
  }

  // 2. Check for conflicts in the day availabilities for each day (overlapping time windows)
  for (const day of Object.keys(days)){
    const oneDayAvailability = createAvailabilityObjects(day, days[day], sessionTime);
    dayAvailabilities.push(oneDayAvailability);
  }
  // 3. Check for conflicts in the availability exceptions for each date (overlapping time windows)
  for (const date of Object.keys(exceptions)){
    const oneDateAvailability = createAvailabilityObjects(date, exceptions[date], sessionTime);
    availabilityExceptions.push(oneDateAvailability);
  }

  // 5. create the service and structure the availabilites for insertion in the database
  const dayAvailabilitiesToInsert = prepareDayAvailabilitiesAndCheckForConflicts(mentorId, id, dayAvailabilities);
  const availabilityExceptionsToInsert = prepareDateAvailabilitiesAndCheckForConflicts(mentorId, id, availabilityExceptions);

  await prisma.services.create({
    data: {
      id,
      type,
      description,
      mentorId,
      sessionTime,
    },
  });

  await prisma.dayAvailabilities.createMany({
    data: dayAvailabilitiesToInsert,
  });

  await prisma.availabilityExceptions.createMany({
    data: availabilityExceptionsToInsert,
  });

  res.status(201).json({
    status: SUCCESS,
    message: 'Service created successfully',
  });
});

export {
  createService,
};

