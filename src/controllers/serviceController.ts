import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { checkForAvailabilityWindowsConflictsOnCreate } from '../utils/availability/checkForAvailabilityConflicts';
import { timeOnly } from '../utils/availability/helpers';

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
    const oneDayAvailability = checkForAvailabilityWindowsConflictsOnCreate(day, days[day], sessionTime);
    dayAvailabilities.push(oneDayAvailability);
  }
  // 3. Check for conflicts in the availability exceptions for each date (overlapping time windows)
  for (const date of Object.keys(exceptions)){
    const oneDateAvailability = checkForAvailabilityWindowsConflictsOnCreate(date, exceptions[date], sessionTime);
    availabilityExceptions.push(oneDateAvailability);
  }

  // 5. create the service and structure the availabilites for insertion in the database
  const dayAvailabilitiesToInsert: any = [];
  const availabilityExceptionsToInsert: any = [];

  dayAvailabilities.forEach((oneDayAvailability) => {
    oneDayAvailability.map((availability) => {
      dayAvailabilitiesToInsert.push({
        mentorId,
        serviceId: id,
        startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
        endTime: timeOnly(availability.endTime.hour, availability.endTime.minute),
        dayOfWeek: availability.dayOfWeek,
      });
    });
  });

  availabilityExceptions.forEach((oneDateAvailability) => {
    oneDateAvailability.map((availability) => {
      availabilityExceptionsToInsert.push({
        mentorId,
        serviceId: id,
        startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
        endTime: timeOnly(availability.endTime.hour, availability.endTime.minute),
        date: availability.date,
      });
    });
  });

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

