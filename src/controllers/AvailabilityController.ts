import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { DayAvailability } from '../classes/services/DayAvailability';
import { Time } from '../classes/services/Time';
import { createAvailabilityExceptionInstances, createDayAvailabilityInstances } from '../utils/availability/availabilityUtils';
import { validDays } from '../validators/validator.custom';
import { timeOnly, ymdDateString } from '../utils/availability/helpers';
import { AvailabilityException } from '../classes/services/AvailabilityException';


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

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  if (duration < service.sessionTime){
    return next(new APIError(400, 'duration value is less than the specified session time for the service'));
  }

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

  const newRecord = await prisma.dayAvailabilities.create({
    data: {
      serviceId,
      mentorId,
      dayOfWeek: dayAvailabilityInstance.dayOfWeek,
      duration: dayAvailabilityInstance.duration,
      startTime: timeOnly(dayAvailabilityInstance.startTime.hour, dayAvailabilityInstance.startTime.minute),
    },
  });

  dayAvailabilityInstance.shiftToTimezone('Etc/UTC', userTimeZone); // shift back to user timezone to return the newly created record

  res.status(201).json({
    status: SUCCESS,
    message: 'Day availability added successfully',
    newAvailability: {
      id: newRecord.id,
      dayOfWeek: dayAvailabilityInstance.dayOfWeek,
      startTime: dayAvailabilityInstance.startTime.toString(),
      duration: dayAvailabilityInstance.duration,
    },
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
    if (duration < service.sessionTime){
      return next(new APIError(400, 'new duration value is less than the specified session time for the service'));
    }
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

const updateAvailabilityException = errorHandler(async(req: Request, res: Response, next: NextFunction)=>{
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

  const avilabilityEx = await prisma.availabilityExceptions.findFirst({
    where: {
      id: availabilityId,
      mentorId,
      serviceId,
    },
  });

  if (!avilabilityEx){
    return next(new APIError(404, `Availability exception with an ID of ${availabilityId} was not found`));
  }

  const availabilityExceptionInstance = new AvailabilityException(
    Time.fromString(avilabilityEx.startTime.toISOString().slice(11, 16)), // HH:MM
    avilabilityEx.duration,
    new Date(ymdDateString(avilabilityEx.date)),
    avilabilityEx.id,
  );

  availabilityExceptionInstance.shiftToTimezone('Etc/UTC', userTimeZone);

  if (startTime){
    availabilityExceptionInstance.startTime = Time.fromString(startTime);
  }
  if (duration){
    if (duration < service.sessionTime){
      return next(new APIError(400, 'new duration value is less than the specified session time for the service'));
    }
    availabilityExceptionInstance.duration = duration;
  }

  availabilityExceptionInstance.shiftToTimezone(userTimeZone, 'Etc/UTC');

  const prevDate = new Date(availabilityExceptionInstance.date);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  const nextDate = new Date(availabilityExceptionInstance.date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);


  const possiblyConflictingAvailabilities = await prisma.availabilityExceptions.findMany({
    where: {
      mentorId,
      serviceId,
      id: {
        not: availabilityId,
      },
      date: {
        in: [ // the ones that are would possibly conflict with the one to update is either in the same date or in an adjacent one
          availabilityExceptionInstance.date,
          prevDate,
          nextDate,
        ],
      },
    },
  });

  const possiblyConflictingAvailabilitiesInstances = createAvailabilityExceptionInstances(possiblyConflictingAvailabilities);

  for (const availabilityInstance of possiblyConflictingAvailabilitiesInstances) {
    if (availabilityExceptionInstance.conflictsWith(availabilityInstance)){
      return next(new APIError(
        400,
        `Conflict between updated availability on ${availabilityExceptionInstance.formatDate()} ` +
        `and other availability on ${availabilityInstance.formatDate()}:` +
        `[${availabilityExceptionInstance.startTime.toString()} - ${availabilityExceptionInstance.getEndTime(false).toString()}] conflicts with` +
        `[${availabilityInstance.startTime.toString()} - ${availabilityInstance.getEndTime(false).toString()}]`,
      ));
    }
  }

  await prisma.availabilityExceptions.update({
    where: {
      id: availabilityId,
    },
    data: {
      startTime: timeOnly(availabilityExceptionInstance.startTime.hour, availabilityExceptionInstance.startTime.minute),
      duration: availabilityExceptionInstance.duration,
      date: new Date(ymdDateString(availabilityExceptionInstance.date)),
    },
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Availability Exception updated successfully',
  });

});

const addAvailabilityException = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId } = req.params;
  const { id: mentorId, timezone: userTimeZone } = req.user;
  const { startTime, duration, date } = req.body;

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  if (duration < service.sessionTime){
    return next(new APIError(400, 'duration value is less than the specified session time for the service'));
  }

  const availabilityExceptionInstance = new AvailabilityException(
    Time.fromString(startTime),
    duration,
    new Date(date),
  );

  availabilityExceptionInstance.shiftToTimezone(userTimeZone, 'Etc/UTC');

  const prevDate = new Date(availabilityExceptionInstance.date);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  const nextDate = new Date(availabilityExceptionInstance.date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const possiblyConflictingAvailabilities = await prisma.availabilityExceptions.findMany({
    where: {
      mentorId,
      serviceId,
      date: {
        in: [ // the ones that are would possibly conflict with the one to update is either in the same date or in an adjacent one
          availabilityExceptionInstance.date,
          prevDate,
          nextDate,
        ],
      },
    },
  });

  const possiblyConflictingAvailabilitiesInstances = createAvailabilityExceptionInstances(possiblyConflictingAvailabilities);

  for (const availabilityInstance of possiblyConflictingAvailabilitiesInstances) {
    if (availabilityExceptionInstance.conflictsWith(availabilityInstance)){
      return next(new APIError(
        400,
        `Conflict between newly created availability on ${availabilityExceptionInstance.formatDate()} ` +
        `and other availability on ${availabilityInstance.formatDate()}:` +
        `[${availabilityExceptionInstance.startTime.toString()} - ${availabilityExceptionInstance.getEndTime(false).toString()}] conflicts with` +
        `[${availabilityInstance.startTime.toString()} - ${availabilityInstance.getEndTime(false).toString()}]`,
      ));
    }
  }

  const newRecord = await prisma.availabilityExceptions.create({
    data: {
      serviceId,
      mentorId,
      duration: availabilityExceptionInstance.duration,
      startTime: timeOnly(availabilityExceptionInstance.startTime.hour, availabilityExceptionInstance.startTime.minute),
      date: new Date(ymdDateString(availabilityExceptionInstance.date)),
    },
  });

  availabilityExceptionInstance.shiftToTimezone('Etc/UTC', userTimeZone); // shift back to user timezone to return the newly created record

  res.status(201).json({
    status: SUCCESS,
    message: 'Availability Exception created successfully',
    newAvailability: {
      id: newRecord.id,
      date: availabilityExceptionInstance.formatDate(),
      startTime: availabilityExceptionInstance.startTime.toString(),
      duration: availabilityExceptionInstance.duration,
    },
  });

});

export {
  deleteDayAvailability,
  updateDayAvailability,
  addDayAvailability,
  deleteAvailabilityException,
  updateAvailabilityException,
  addAvailabilityException,
}
