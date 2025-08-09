import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { DayAvailability } from '../classes/services/DayAvailability';
import { Time } from '../classes/services/Time';
import { createDayAvailabilityInstances } from '../utils/availability/availabilityUtils';
import { validDays } from '../validators/validator.custom';
import { timeOnly } from '../utils/availability/helpers';


const deleteDayAvailability = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId, avId: availabilityId } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  const deletionCount = await prisma.dayAvailabilities.deleteMany({
    where: {
      id: availabilityId,
      mentorId,
      serviceId,
    },
  });

  if (deletionCount.count === 0){
    return next(new APIError(404, `Day Availability with an ID of ${availabilityId} was not found`));
  }

  res.status(204).json({});

});

const addDayAvailability = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId } = req.params;
  const { id: mentorId, timezone: userTimeZone } = req.user;
  const { startTime, duration, dayOfWeek } = req.body;

  const dayAvailabilityInstance = new DayAvailability(
    Time.fromString(startTime),
    duration,
    validDays.indexOf(dayOfWeek),
  );

  dayAvailabilityInstance.shiftToTimezone(userTimeZone, 'Etc/UTC');

  const possiblyConflictingAvailabilities = await prisma.dayAvailabilities.findMany({
    where: {
      mentorId,
      serviceId,
      dayOfWeek: {
        in: [ // possibly conflicting ones are the ones in the same day or in adjacent days
          dayAvailabilityInstance.dayOfWeek,
          (dayAvailabilityInstance.dayOfWeek - 1 % 7),
          (dayAvailabilityInstance.dayOfWeek + 1 % 7)],
      },
    },
  });

  const possiblyConflictingAvailabilitiesInstances = createDayAvailabilityInstances(possiblyConflictingAvailabilities);

  for (const availabilityInstance of possiblyConflictingAvailabilitiesInstances) {
    if (dayAvailabilityInstance.conflictsWith(availabilityInstance)){
      return next(new APIError(
        400,
        `Conflict between newly created availability on ${validDays[dayAvailabilityInstance.dayOfWeek]} ` +
        `and other availability on ${validDays[availabilityInstance.dayOfWeek]}:` +
        `[${dayAvailabilityInstance.startTime.toString()} - ${dayAvailabilityInstance.getEndTime(false).toString()}] conflicts with` +
        `[${availabilityInstance.startTime.toString()} - ${availabilityInstance.getEndTime(false).toString()}]`,
      ));
    }
  }

  await prisma.dayAvailabilities.create({
    data: {
      serviceId,
      mentorId,
      dayOfWeek: dayAvailabilityInstance.dayOfWeek,
      duration: dayAvailabilityInstance.duration,
      startTime: timeOnly(dayAvailabilityInstance.startTime.hour, dayAvailabilityInstance.startTime.minute),
    },
  });

  res.status(201).json({
    status: SUCCESS,
    message: 'Day availability added successfully',
  });

});

const updateDayAvailability = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId, avId: availabilityId } = req.params;
  const { id: mentorId, timezone: userTimeZone } = req.user;
  const { startTime, duration } = req.body;

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  const dayAv = await prisma.dayAvailabilities.findFirst({
    where: {
      id: availabilityId,
      mentorId,
      serviceId,
    },
  });

  if (!dayAv){
    return next(new APIError(404, `Day availability with an ID of ${availabilityId} was not found`));
  }

  const dayAvailabilityInstance = new DayAvailability(
    Time.fromString(dayAv.startTime.toISOString().slice(11, 16)), // HH:MM
    dayAv.duration,
    dayAv.dayOfWeek,
    dayAv.id,
  );

  dayAvailabilityInstance.shiftToTimezone('Etc/UTC', userTimeZone);

  if (duration){
    dayAvailabilityInstance.duration = duration;

  }
  if (startTime){
    dayAvailabilityInstance.startTime = Time.fromString(startTime);
  }

  dayAvailabilityInstance.shiftToTimezone(userTimeZone, 'Etc/UTC');

  const possiblyConflictingAvailabilities = await prisma.dayAvailabilities.findMany({
    where: {
      id: {
        not: availabilityId,
      },
      mentorId,
      serviceId,
      dayOfWeek: {
        in: [ // possibly conflicting ones are the ones in the same day or in adjacent days
          dayAvailabilityInstance.dayOfWeek,
          (dayAvailabilityInstance.dayOfWeek - 1 % 7),
          (dayAvailabilityInstance.dayOfWeek + 1 % 7)],
      },
    },
  });

  const possiblyConflictingAvailabilitiesInstances = createDayAvailabilityInstances(possiblyConflictingAvailabilities);

  for (const availabilityInstance of possiblyConflictingAvailabilitiesInstances) {
    if (dayAvailabilityInstance.conflictsWith(availabilityInstance)){
      return next(new APIError(
        400,
        `Conflict between updated availability on ${validDays[dayAvailabilityInstance.dayOfWeek]} ` +
        `and other availability on ${validDays[availabilityInstance.dayOfWeek]}:` +
        `[${dayAvailabilityInstance.startTime.toString()} - ${dayAvailabilityInstance.getEndTime(false).toString()}] conflicts with` +
        `[${availabilityInstance.startTime.toString()} - ${availabilityInstance.getEndTime(false).toString()}]`,
      ));
    }
  }

  await prisma.dayAvailabilities.update({
    where: {
      id: availabilityId,
    },
    data: {
      startTime: timeOnly(dayAvailabilityInstance.startTime.hour, dayAvailabilityInstance.startTime.minute),
      duration: dayAvailabilityInstance.duration,
      dayOfWeek: dayAvailabilityInstance.dayOfWeek,
    },
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Day availability updated successfully',
  });

});

const deleteAvailabilityException = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId, avId: availabilityId } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  const deletionCount = await prisma.availabilityExceptions.deleteMany({
    where: {
      id: availabilityId,
      mentorId,
      serviceId,
    },
  });

  if (deletionCount.count === 0){
    return next(new APIError(404, `Day Availability with an ID of ${availabilityId} was not found`));
  }

  res.status(204).json({});

});

export {
  deleteDayAvailability,
  updateDayAvailability,
  addDayAvailability,
  deleteAvailabilityException,
}
