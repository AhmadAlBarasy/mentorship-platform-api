// src/controllers/sessionRequestsController.ts
import { Request, Response, NextFunction } from 'express';
import { DateTime } from 'luxon';

import { SUCCESS } from '../constants/responseConstants';
import APIError from '../classes/APIError';
import prisma from '../db';
import { Time } from '../classes/services/Time';
import { createAvailabilityExceptionInstances, createDayAvailabilityInstances } from '../utils/availability/availabilityUtils';
import { SessionRequestAvailabilityChecker, ExistingSession } from '../classes/sessionRequests/SessionRequestAvailabilityChecker';
import errorHandler from '../utils/asyncErrorHandler';
import { timeOnly, ymdDateString } from '../utils/availability/helpers';


const createSessionRequest = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const menteeId: string = req.user.id;
  const userTimeZone: string = req.user.timezone || 'UTC';

  const { serviceId, date, startTime, communityId, agenda } = req.body as {
    serviceId: string,
    date: string,         // "YYYY-MM-DD"
    startTime: string,    // "HH:mm"
    communityId: string,
    agenda?: string
  };

  const dateStr=date;
  const startTimeStr=startTime;
  // 1) Load service
  const service = await prisma.services.findFirst({ where: { id: serviceId } });
  if (!service) {
    return next(new APIError(404, `Service with id ${serviceId} was not found`));
  }
  const mentorId = service.mentorId;
  const sessionDuration = service.sessionTime;

  // 2) Community membership check
  const participations = await prisma.participations.findMany({
    where: { communityId, userId: { in: [mentorId, menteeId] } },
  });
  if (participations.length < 2) {
    return next(new APIError(403, 'Both mentor and mentee must be members of the provided community'));
  }

  const dtLocal = DateTime.fromObject(
  {
    year: Number(dateStr.slice(0,4)),
    month: Number(dateStr.slice(5,7)),
    day: Number(dateStr.slice(8,10)),
    hour: Number(startTimeStr.slice(0,2)),
    minute: Number(startTimeStr.slice(3,5)),
  },
  { zone: userTimeZone },
);

if (!dtLocal.isValid) {
  return next(new APIError(400, 'Invalid date or startTime provided'));
}

const dtUtc = dtLocal.setZone('Etc/UTC');

// Time object in UTC
const requestedStartTimeUtc = new Time(dtUtc.hour, dtUtc.minute);

// Full UTC Date objects (safe: toJSDate always returns a Date)
const startDateTimeUtc: Date = dtUtc.toJSDate();
const dtEndUtc = dtUtc.plus({ minutes: sessionDuration });
const endDateTimeUtc: Date = dtEndUtc.toJSDate();


const dateForDB: Date = new Date(Date.UTC(dtUtc.year, dtUtc.month - 1, dtUtc.day));
const startTimeForDB = timeOnly(requestedStartTimeUtc.hour, requestedStartTimeUtc.minute);
 

const dateForRawsql = new Date(Date.UTC(dtUtc.year, dtUtc.month - 1, dtUtc.day));
const startTimeForRawsql = `${String(dtUtc.hour).padStart(2, '0')}:${String(dtUtc.minute).padStart(2, '0')}:00`;

const exactRow = await prisma.$queryRawUnsafe(
  `SELECT *
   FROM session_requests
   WHERE service_id = ?
     AND mentor_id = ?
     AND date = ?
     AND start_time = ?
     AND status IN ('PENDING', 'ACCEPTED')
   LIMIT 1`,
  serviceId,
  mentorId,
  dateForRawsql,
  startTimeForRawsql,
);


  // $queryRaw returns an array of rows for SELECT; treat any row as conflict
  if (Array.isArray(exactRow) && exactRow.length > 0) {
    return next(new APIError(409, 'That exact slot is already booked'));
  }

  // requestDay is already derived from the booking request in UTC:
const requestDay = new Date(Date.UTC(dtUtc.year, dtUtc.month - 1, dtUtc.day)); 

// Previous day
const prevDay = new Date(requestDay);
prevDay.setUTCDate(prevDay.getUTCDate() - 1);

// Next day
const nextDay = new Date(requestDay);
nextDay.setUTCDate(nextDay.getUTCDate() + 1);

const exceptionsRows = await prisma.availabilityExceptions.findMany({
  where: {
    mentorId,
    serviceId,
    date: { in: [prevDay, requestDay, nextDay] },
  },
});


  const requestWeekdayProject = requestDay.getUTCDay(); // 0-6 (Sun-Sat)

// Previous weekday
const prevDate = new Date(requestDay);
prevDate.setUTCDate(prevDate.getUTCDate() - 1);
const prevWeekdayProject = prevDate.getUTCDay();

// Next weekday
const nextDate = new Date(requestDay);
nextDate.setUTCDate(nextDate.getUTCDate() + 1);
const nextWeekdayProject = nextDate.getUTCDay();


  const dayAvailRows = await prisma.dayAvailabilities.findMany({
  where: {
    mentorId,
    serviceId,
    dayOfWeek: { in: [prevWeekdayProject, requestWeekdayProject, nextWeekdayProject] },
  },
});


  const exceptions = createAvailabilityExceptionInstances(exceptionsRows); // AvailabilityException[]
  const dayAvailabilities = createDayAvailabilityInstances(dayAvailRows);  // DayAvailability[]


  // 11) Run availability checker (checker expects JS Date in UTC)
  const checker = new SessionRequestAvailabilityChecker(
    exceptions,
    dayAvailabilities,
    sessionDuration,
  );


  const canBook = checker.canBook(startDateTimeUtc); // pass JS Date in UTC
  if (!canBook) {
    return next(new APIError(400, 'Requested time is not available for booking'));
  }

  try {
    const created = await prisma.sessionRequests.create({
      data: {
        serviceId,
        menteeId,
        mentorId,
        // date is DATE column -> use JS Date for midnight UTC of requested day
        date: dateForDB,
        // startTime is TIME column -> provide a JS Date set to epoch + the time (UTC)
        startTime: startTimeForDB,
        communityId,
        agenda: agenda ?? null,
      },
    });

    res.status(201).json({
      status: SUCCESS,
      message: 'Session request created successfully',
      data: { serviceId: created.serviceId , menteeId:created.menteeId, mentorId:created.mentorId,startTime:startTimeForRawsql,date:dateForRawsql,
      },
    });
    return;
  } catch (err: any) {
    // handle unique-constraint race if you later add DB index
    if (err?.code === 'P2002') {  
      return next(new APIError(409, 'That exact slot was just booked by someone else'));
    }
    throw err;
  }
});

export {
  createSessionRequest,
};
