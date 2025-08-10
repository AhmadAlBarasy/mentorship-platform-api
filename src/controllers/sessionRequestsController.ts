import { Request, Response, NextFunction } from 'express';

import { DateTime } from 'luxon';

import { SUCCESS } from '../constants/responseConstants';
import APIError from '../classes/APIError';
import prisma from '../db';
import { Time } from '../classes/services/Time';
import { createAvailabilityExceptionInstances, createDayAvailabilityInstances } from '../utils/availability/availabilityUtils';
import { timeOnly, ymdDateString } from '../utils/availability/helpers';
import { SessionRequestAvailabilityChecker, ExistingSession } from '../classes/sessionRequests/SessionRequestAvailabilityChecker';
import errorHandler from '../utils/asyncErrorHandler';


/**
 * POST /v1/SessionRequest
 * Body:
 *  { serviceId, date: "YYYY-MM-DD", startTime: "HH:mm", communityId, agenda? }
 *
 * Assumptions:
 *  - req.user contains { id: string, timezone: string }
 *  - serviceId identifies the service; mentorId is read from service row
 *  - All DB timestamps/stored times are in UTC
 */
const createSessionRequest = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const menteeId: string = req.user.id;
  const userTimeZone: string = req.user.timezone || 'UTC';

  const { serviceId, date, startTime, communityId, agenda } = req.body as {
    serviceId: string,
    date: string,
    startTime: string,
    communityId: string,
    agenda?: string
  };

  // 1) Load service
  const service = await prisma.services.findFirst({
    where: { id: serviceId },
  });

  if (!service) {
    return next(new APIError(404, `Service with id ${serviceId} was not found`));
  }

  const mentorId = service.mentorId;
  const sessionDuration = service.sessionTime; // minutes

  // 2) Check both mentor and mentee are participants of the community
  const participations = await prisma.participations.findMany({
    where: {
      communityId,
      userId: {
        in: [mentorId, menteeId],
      },
    },
  });

  if (participations.length < 2) {
    // 403: the request is logically forbidden because membership is required
    return next(new APIError(403, 'Both mentor and mentee must be members of the provided community'));
  }

  // 3) Parse the provided date + startTime in the user's timezone, then convert to UTC
  const [hourStr, minuteStr] = startTime.split(':');
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  const day = parseInt(date.slice(8, 10), 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const localStart = DateTime.fromObject(
    { year, month, day, hour, minute },
    { zone: userTimeZone }
  );

  if (!localStart.isValid) {
    return next(new APIError(400, 'Invalid date/time for the provided timezone'));
  }

  const utcStart = localStart.toUTC(); // DateTime in UTC
  const nowUtc = DateTime.utc();

  // 4) Reject past bookings
  if (utcStart <= nowUtc) {
    return next(new APIError(400, 'Cannot book a session in the past'));
  }

  // 5) Prepare DB-friendly date & time
  // date should be a date-only UTC (YYYY-MM-DD -> Date)
  const dateUtc = new Date(ymdDateString(utcStart.toJSDate())); // matches your helpers' usage
  const startTimeForDB = timeOnly(utcStart.hour, utcStart.minute); // helper returns DB time value you use elsewhere

  // 6) Immediate exact-duplicate check (same mentor, service, date, start_time)
  const existingExact = await prisma.sessionRequests.findFirst({
    where: {
      mentorId,
      serviceId,
      date: dateUtc,
      startTime: startTimeForDB,
      NOT: {
        status: {
          in: ['REJECTED', 'CANCELLED'],
        },
      },
    },
  });


  if (existingExact) {
    return next(new APIError(409, 'That exact slot is already booked'));
  }

  // ---------- Prepare data for availability check ----------
  // prevDate and nextDate (Date objects)
  const prevDate = new Date(dateUtc);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  const nextDate = new Date(dateUtc);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  // 7) Load availability exceptions for date, prevDate, nextDate (exceptions override day availabilities)
  const exceptionsRows = await prisma.availabilityExceptions.findMany({
    where: {
      mentorId,
      serviceId,
      date: { in: [dateUtc, prevDate, nextDate] },
    },
  });

  // 8) Load day availabilities for the same weekday or previous weekday (to consider overflow)
  const requestWeekday = dateUtc.getUTCDay(); // 0..6
  const prevWeekday = (requestWeekday + 6) % 7;

  const dayAvailRows = await prisma.dayAvailabilities.findMany({
    where: {
      mentorId,
      serviceId,
      dayOfWeek: {
        in: [requestWeekday, prevWeekday],
      },
    },
  });

  // 9) Load existing session requests for the mentor that may overlap
  // Include the service relation to get session duration for each existing request
  //even though the mentor is not allowed natrally to add diferent serivce at the same time it's good practice to include in the future 
  const existingRequestsRows = await prisma.sessionRequests.findMany({
    where: {
      mentorId,
      date: { in: [dateUtc, prevDate] }, // previous date may overflow into requested date
    },
    include: {
      service: true,
    },
  });

  // 10) Convert DB rows into the classes/form expected by the checker
  const exceptions = createAvailabilityExceptionInstances(exceptionsRows); // AvailabilityException[]
  const dayAvailabilities = createDayAvailabilityInstances(dayAvailRows);  // DayAvailability[]

  // Map existing requests to the simple type Expected by checker
  const existingSessions: ExistingSession[] = existingRequestsRows.map((r) => {
    // r.startTime is a time-only Date; convert to HH:MM using toISOString slice like other code
    const hhmm = r.startTime.toISOString().slice(11, 16);
    return {
      date: r.date, // date-only field
      startTime: Time.fromString(hhmm),
      duration: r.service ? r.service.sessionTime : sessionDuration, // fall back to current service.sessionTime if include failed
    };
  });

  // 11) Run the availability checker
  const checker = new SessionRequestAvailabilityChecker(
    exceptions,
    dayAvailabilities,
    existingSessions,
    sessionDuration,
  );

  // The checker expects a Date in UTC (we'll pass utcStart.toJSDate())
  const canBook = checker.canBook(utcStart.toJSDate(), 'UTC');

  if (!canBook) {
    return next(new APIError(400, 'Requested time is not available for booking'));
  }

  // 12) Create the session request. Guard against a rare race with DB unique constraint.
  try {
    const created = await prisma.sessionRequests.create({
      data: {
        serviceId,
        menteeId,
        mentorId,
        startTime: startTimeForDB,
        date: dateUtc,
        communityId,
        agenda: agenda ?? null,
        // status will default to PENDING as per schema
      },
    });

    res.status(200).json({
      status: SUCCESS,
      message: 'Session request created successfully',
      data: {
        id: created.id,
      },
    });
  } catch (err: any) {
    // Prisma unique constraint error code for duplicate key is P2002.
    // If you later add a DB unique index on (mentor_id, service_id, date, start_time),
    // this will catch concurrent attempts and return a clear 409 conflict.
    if (err.code === 'P2002') {
      return next(new APIError(409, 'That exact slot was just booked by someone else'));
    }
    // unknown error -> forward
    throw err;
  }
});

export {
  createSessionRequest,
};
