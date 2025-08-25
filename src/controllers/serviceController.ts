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
import { DayAvailability } from '../classes/services/DayAvailability';
import { Time } from '../classes/services/Time';
import { AvailabilityException } from '../classes/services/AvailabilityException';
import { SessionStatus } from '@prisma/client';

const { PENDING } = SessionStatus;

const createService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const dayAvailabilities = [];
  const availabilityExceptions = [];

  const { id: mentorId, timezone: userTimeZone } = req.user;
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
    const oneDayAvailability = createAvailabilityObjects(day, days[day], sessionTime, userTimeZone);
    dayAvailabilities.push(oneDayAvailability);
  }
  // 3. Check for conflicts in the availability exceptions for each date (overlapping time windows)
  for (const date of Object.keys(exceptions)){
    const oneDateAvailability = createAvailabilityObjects(date, exceptions[date], sessionTime, userTimeZone);
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
  const { id: mentorId, timezone: userTimeZone } = req.user;

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

  const days: Record<string, { startTime: string; duration: number, id?: string }[]> = {};
  const exceptions: Record<string, { startTime: string; duration: number, id?: string }[]> = {};

  // Transform day availabilities into grouped-by-day object
  for (const avail of service.dayAvailabilites) {

    const dayAvailability = new DayAvailability(
      Time.fromString(avail.startTime.toISOString().slice(11, 16)), // HH:MM
      avail.duration,
      avail.dayOfWeek,
      avail.id,
    );

    dayAvailability.shiftToTimezone('Etc/UTC', userTimeZone); // shift the window back to the user time zone

    const day = getDayName(dayAvailability.dayOfWeek); // 0 = Monday, 6 = Sunday

    if (!days[day]) {
      days[day] = [];
    }

    days[day].push({
      startTime: dayAvailability.startTime.toString(),
      duration: dayAvailability.duration,
      id: dayAvailability.id,
    });

  }

  // Transform availability exceptions into grouped-by-date object
  for (const ex of service.availabilityExceptions) {

    let dateKey = ex.date.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const availabilityException = new AvailabilityException(
      Time.fromString(ex.startTime.toISOString().slice(11, 16)), // HH:MM
      ex.duration,
      new Date(dateKey),
      ex.id,
    );

    availabilityException.shiftToTimezone('Etc/UTC', userTimeZone);

    dateKey = availabilityException.formatDate(); // update the dateKey value to insert avs into the right object

    if (!exceptions[dateKey]) {
      exceptions[dateKey] = [];
    }

    exceptions[dateKey].push({
      startTime: availabilityException.startTime.toString(),
      duration: availabilityException.duration,
      id: availabilityException.id,
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

const updateService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const {
    type,
    description,
    sessionTime,
  } = req.body;
  const { id } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      mentorId,
      id,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${id}`));
  }

  if (sessionTime){
    const dayWindowsWithTimeLessThanSessionTime = await prisma.dayAvailabilities.findMany({
      where: {
        mentorId,
        serviceId: id,
        duration: {
          lt: sessionTime,
        },
      },
    });
    if (dayWindowsWithTimeLessThanSessionTime.length !== 0){
      return next(new APIError(400, 'The new session time is greater than at least one of the day availability windows'));
    }
    const dateWindowsWithTimeLessThanSessionTime = await prisma.availabilityExceptions.findMany({
      where: {
        mentorId,
        id,
        duration: {
          lt: sessionTime,
        },
      },
    });
    if (dateWindowsWithTimeLessThanSessionTime.length !== 0){
      return next(new APIError(400, 'The new session time is greater than at least one of the date availability windows'));
    }
  }

  await prisma.services.updateMany({
    where: {
      mentorId,
      id,
    },
    data: {
      type,
      description,
      sessionTime,
    },
  })

  res.status(200).json({
    status: SUCCESS,
    message: 'Service updated successfully',
  })

});

const deleteService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      mentorId,
      id,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${id}`));
  }

  const pendingSessionRequests = await prisma.sessionRequests.findMany({
    where: {
      serviceId: id,
      mentorId,
      status: PENDING,
    },
  });

  if (pendingSessionRequests.length !== 0){
    return next(new APIError(400, 'Pending session requests must be resolved before deleting the service'));
  }

});

export {
  createService,
  getServiceById,
  getMentorServices,
  updateService,
  deleteService,
};

