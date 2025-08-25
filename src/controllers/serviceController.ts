import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import {
  checkIfSlotLiesWithinAvailabilities,
  createAvailabilityExceptionInstances,
  createAvailabilityObjects,
  createDayAvailabilityInstances,
  createTimeSlotInstances,
  getAvailableSlotsForDate,
  prepareDateAvailabilitiesAndCheckForConflicts,
  prepareDayAvailabilitiesAndCheckForConflicts,
} from '../utils/availability/availabilityUtils';
import { getDayName, timeOnly, ymdDateString } from '../utils/availability/helpers';
import { DayAvailability } from '../classes/services/DayAvailability';
import { Time } from '../classes/services/Time';
import { AvailabilityException } from '../classes/services/AvailabilityException';
import { DateTime } from 'luxon';
import { TimeSlot } from '../classes/services/TimeSlot';
import { SessionStatus } from '@prisma/client';


const { PENDING, ACCEPTED } = SessionStatus;

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
      deletedAt: null,
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
      deletedAt: null,
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

const getServiceDetailsAndSlots = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: mentorId, serviceId } = req.params;
  const { id: menteeId, timezone: userTimeZone } = req.user;

  const daysHorizon = 30;

  // 1. check if both mentee and mentor are members of a common community
  const result: any[] = await prisma.$queryRaw`SELECT 1
  FROM participations p1
  JOIN participations p2
    ON p1.community_id = p2.community_id
  WHERE p1.user_id = ${menteeId} AND p2.user_id = ${mentorId}`;

  // if the result is an empty array, there are no common community between the mentee and the mentor
  if (result.length === 0){
    return next(new APIError(403, 'You are not allowed to perform this action'));
  }

  // 2. find the service
  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
      deletedAt: null,
    },
  });

  if (!service){
    return next(new APIError(404, 'Service not found'));
  }


  const today = DateTime.now();
  const oneMonthLater = today.plus({ days: 30 });

  const todayDateNoTimePart = new Date(ymdDateString(today.toJSDate()));
  const oneMonthLaterDateNoTimePart = new Date(ymdDateString(oneMonthLater.toJSDate()));

  // 3. Find the available slots for the upcoming 30 days, keeping in mind pending and accepted sessions for both the mentee
  // and the mentor, and reserved slots on both parties calendars
  const availabilityExceptions = await prisma.availabilityExceptions.findMany({
    where: {
      serviceId,
      mentorId,
      date: {
        gte: todayDateNoTimePart,
        lte: oneMonthLaterDateNoTimePart,
      },
    },
  });

  const exceptionDateSet = new Set(
    availabilityExceptions.map((ex) => ymdDateString(ex.date)), // "YYYY-MM-DD"
  );

  const dayAvailabilites = await prisma.dayAvailabilities.findMany({
    where: {
      serviceId,
      mentorId,
    },
  });

  const slotsForEachDate: Record<string, string[]> = {};

  for (let i = 0; i <= daysHorizon; i++) {
    const currentDate = (DateTime.fromJSDate(todayDateNoTimePart)).plus({ days: i });
    const currentDateString = ymdDateString(currentDate.toJSDate());

    let relevantAvailabilities;

    if (exceptionDateSet.has(currentDateString)) {
      relevantAvailabilities = availabilityExceptions.filter(
        (ex) => ymdDateString(ex.date) === currentDateString,
      );
    } else {
      const weekday = (currentDate.weekday - 1) % 7; // Monday = 0
      relevantAvailabilities = dayAvailabilites.filter(
        (a) => a.dayOfWeek === weekday,
      );
    }

    const slotsByDate = await getAvailableSlotsForDate(
      menteeId,
      mentorId,
      service,
      userTimeZone,
      currentDate,
      relevantAvailabilities,
    );

    for (const [dateStr, slotList] of Object.entries(slotsByDate)) {
      if (!slotsForEachDate[dateStr]) {
        slotsForEachDate[dateStr] = [];
      }
      slotsForEachDate[dateStr].push(...slotList);
    }
  }

  res.status(200).json({
    status: SUCCESS,
    service,
    slots: slotsForEachDate,
  });

});

const bookSlotFromService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: menteeId, timezone: userTimeZone } = req.user;
  const { id: mentorId, serviceId } = req.params;
  const { communityId } = req.query;
  const { startTime, date, agenda } = req.body;

  // check if both mentee and mentor are members of a common community
  const result: any[] = await prisma.$queryRaw`SELECT 1
  FROM participations p1
  JOIN participations p2
    ON p1.community_id = p2.community_id
  WHERE p1.user_id = ${menteeId} AND p2.user_id = ${mentorId}`;

  // if the result is an empty array, there are no common community between the mentee and the mentor
  if (result.length === 0){
    return next(new APIError(403, 'You are not allowed to perform this action'));
  }

  const bookDate = new Date(date);

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
      deletedAt: null,
    },
  });

  if (!service){
    return next(new APIError(404, 'Service not found'));
  }

  const slot = new TimeSlot(
    Time.fromString(startTime),
    service.sessionTime,
    bookDate,
  );

  slot.shiftToTimezone(userTimeZone, 'Etc/UTC'); // shift the slot to UTC for comparison

  const bookDateTime = DateTime.fromJSDate(bookDate);
  const previousBookDateTime = bookDateTime.minus({ days: 1 });
  const dayOfWeek = ((bookDateTime.weekday - 1) % 7);
  const previousDay = (((bookDateTime.weekday - 1) + 6) % 7);

  const slotDateAvailabilities = await prisma.availabilityExceptions.findMany({
    where: {
      date: {
        in: [
          bookDateTime.toJSDate(),
          previousBookDateTime.toJSDate(),
        ],
      },
      serviceId,
      mentorId,
    },
  });

  const slotDayAvailabilities = await prisma.dayAvailabilities.findMany({
    where: {
      dayOfWeek: {
        in: [dayOfWeek, previousDay],
      },
      serviceId,
      mentorId,
    },
  });

  if (slotDateAvailabilities.length === 0 && slotDayAvailabilities.length === 0){
    return next(new APIError(400, `No available slots found for ${date}`));
  }

  if (slotDateAvailabilities.length > 0){
    const availabilityExceptionInstances = createAvailabilityExceptionInstances(slotDateAvailabilities);
    const withinAvailableWindows = checkIfSlotLiesWithinAvailabilities(slot, availabilityExceptionInstances);

    if (!withinAvailableWindows){
      return next(new APIError(400, 'Invalid time slot: Slot doesn\'t lie within any of the available windows'));
    }

    const currentDate = DateTime.fromJSDate(bookDate);
    const previousDate = currentDate.minus({ days: 1 });
    const nextDate = currentDate.plus({ days: 1 });

    const existingTimeSlots = await prisma.sessionRequests.findMany({
      where: {
        status: { in: [PENDING, ACCEPTED] },
        date: {
          in: [
            previousDate.toJSDate(),
            currentDate.toJSDate(),
            nextDate.toJSDate(),
          ],
        },
        OR: [{ menteeId }, { mentorId }],
      },
    });

    const timeSlotInstances = createTimeSlotInstances(existingTimeSlots);

    for (const ts of timeSlotInstances){
      if (ts.conflictsWith(slot)){
        return next(new APIError(400, 'Unable to book a session: Slot conflicts with another slot'));
      }
    }

    await prisma.sessionRequests.create({
      data: {
        serviceId,
        menteeId,
        mentorId,
        status: PENDING,
        date: currentDate.toJSDate(),
        agenda,
        communityId: communityId !== null ? communityId?.toString() : null,
        startTime: timeOnly(slot.startTime.hour, slot.startTime.minute),
        duration: slot.duration,
      },
    });

  } else if (slotDayAvailabilities.length > 0){
    const dayAvailabilityInstances = createDayAvailabilityInstances(slotDayAvailabilities);
    const withinAvailableWindows = checkIfSlotLiesWithinAvailabilities(slot, dayAvailabilityInstances);

    if (!withinAvailableWindows){
      return next(new APIError(400, 'Invalid time slot: Slot doesn\'t lie within any of the available windows'));
    }

    const currentDate = DateTime.fromJSDate(bookDate);
    const previousDate = currentDate.minus({ days: 1 });
    const nextDate = currentDate.plus({ days: 1 });

    const existingTimeSlots = await prisma.sessionRequests.findMany({
      where: {
        status: { in: [PENDING, ACCEPTED] },
        date: {
          in: [
            previousDate.toJSDate(),
            currentDate.toJSDate(),
            nextDate.toJSDate(),
          ],
        },
        OR: [{ menteeId }, { mentorId }],
      },
    });

    const timeSlotInstances = createTimeSlotInstances(existingTimeSlots);

    for (const ts of timeSlotInstances){
      if (ts.conflictsWith(slot)){
        return next(new APIError(400, 'Unable to book a session: Slot conflicts with another slot'));
      }
    }

    await prisma.sessionRequests.create({
      data: {
        serviceId,
        menteeId,
        mentorId,
        status: PENDING,
        date: currentDate.toJSDate(),
        agenda,
        communityId: communityId !== null ? communityId?.toString() : null,
        startTime: timeOnly(slot.startTime.hour, slot.startTime.minute),
        duration: slot.duration,
      },
    });
  }

  res.status(201).json({
    status: SUCCESS,
    message: 'Slot booked successfully',
  });

});

const deleteService = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { id: mentorId } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      mentorId,
      id,
      deletedAt: null,
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

  await prisma.services.updateMany({
    where: {
      id,
      mentorId,
    },
    data: {
      id: `${mentorId}-del-${Date.now()}`,
      deletedId: service.id,
      deletedAt: DateTime.now().toJSDate(),
    },
  });

  res.status(204).json({});

});

export {
  createService,
  getServiceById,
  getMentorServices,
  updateService,
  getServiceDetailsAndSlots,
  bookSlotFromService,
  deleteService,
};
