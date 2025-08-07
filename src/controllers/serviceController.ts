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
import { getDayName } from '../utils/availability/helpers';

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


const getServiceById = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      id,
      mentorId,
    },
    include: {
      dayAvailabilites: true,
      availabilityExceptions: true,
    },
  });

  if (!service) {
    return next(new APIError(404, `No service found with ID '${id}' for this mentor`));
  }

  // Transform day availabilities into grouped-by-day object
  const days: Record<string, { startTime: string; duration: number }[]> = {};
  for (const avail of service.dayAvailabilites) {
    const day = getDayName(avail.dayOfWeek); // 0 = Sunday, 6 = Saturday
    if (!days[day]) {
      days[day] = [];
    }
    days[day].push({
      startTime: avail.startTime.toISOString().slice(11, 16), // "HH:mm"
      duration: avail.duration,
    });
  }

  // Transform availability exceptions into grouped-by-date object
  const exceptions: Record<string, { startTime: string; duration: number }[]> = {};
  for (const ex of service.availabilityExceptions) {
    const dateKey = ex.date.toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (!exceptions[dateKey]) {
      exceptions[dateKey] = [];
    }
    exceptions[dateKey].push({
      startTime: ex.startTime.toISOString().slice(11, 16), // "HH:mm"
      duration: ex.duration,
    });
  }

  res.status(200).json({
    status: SUCCESS,
    message: 'Service fetched successfully',
    data: {
      id: service.id,
      type: service.type,
      description: service.description,
      sessionTime: service.sessionTime,
      days,
      exceptions,
    },
  });
});

const getMentorServices = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const { id: mentorId } = req.user;

  const services = await prisma.services.findMany({
    where: {
      mentorId,
      deletedAt: null, // Exclude deleted services
    },
    omit: {
      deletedAt: true,
    },
    include: {
      requests: {
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'ACCEPTED' },
          ],
          mentorId,
        },
        select: {
          status: true,
        },
      },
    },
  });

  const structuredServices = services.map((service) => {
    const pendingRequestsCount = service.requests.filter(
      (r) => r.status === 'PENDING',
    ).length;

    const acceptedRequestsCount = service.requests.filter(
      (r) => r.status === 'ACCEPTED',
    ).length;

    return {
      id: service.id,
      type: service.type,
      description: service.description,
      sessionTime: service.sessionTime,
      createdAt: service.createdAt,
      active: true,
      pendingRequestsCount,
      acceptedRequestsCount,
    };
  });

  res.status(200).json({
    status: SUCCESS,
    services: structuredServices,
  });

});

export {
  createService,
  getServiceById,
  getMentorServices,
};

