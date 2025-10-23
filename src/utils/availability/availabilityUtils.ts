import { DateTime } from 'luxon';
import APIError from '../../classes/APIError';
import { AvailabilityException } from '../../classes/services/AvailabilityException';
import { DayAvailability } from '../../classes/services/DayAvailability';
import { Time } from '../../classes/services/Time';
import prisma from '../../db';
import { validDays } from '../../validators/validator.custom';
import { timeOnly, ymdDateString } from './helpers';

import { SessionStatus } from '@prisma/client';
import { TimeSlot } from '../../classes/services/TimeSlot';
import { Availability } from '../../classes/services/Availability';


const { PENDING, ACCEPTED } = SessionStatus;

function createAvailabilityObjects(dayOrDate: string, availabilities: any[], sessionTime: number) {

  const result: any[] = [];

  const dayProvided = validDays.indexOf(dayOrDate) !== -1; // checks if the dayOrDate parameter contains a date or a day of the week

  availabilities.forEach((availability) => {
    let newAvailability;
    if (dayProvided){
      newAvailability = new DayAvailability(
        Time.fromString(availability.startTime),
        availability.duration,
        validDays.indexOf(dayOrDate),
      );
    } else {
      newAvailability = new AvailabilityException(
        Time.fromString(availability.startTime),
        availability.duration,
        new Date(dayOrDate),
      );
    }

    if (newAvailability.overflowsToNextDay()){
      throw new APIError(400, 'The start time must be less than end time for all specified availabilities');
    }

    // check if the session time is greater than the new availability time window
    if (sessionTime > newAvailability.timeInMinutes()){
      throw new APIError(
        400,
        `Invalid time window on ${dayOrDate}: ` +
        `[${newAvailability.startTime.toString()} - ${newAvailability.getEndTime().toString()}] is less than the specified session time of ` +
        `${sessionTime} miuntes`,
      );
    }

    result.forEach((av) => {
      if (newAvailability.conflictsWith(av)){
        throw new APIError(400, `Conflict on ${dayOrDate}: [${newAvailability.startTime.toString()} - ${newAvailability.getEndTime().toString()}] ` +
        `overlaps with [${av.startTime.toString()} - ${av.getEndTime().toString()}]`);
      }
    });

    result.push(newAvailability);
  });

  return result;
};

function prepareDayAvailabilitiesForCreation(
  mentorId: string,
  serviceId: string,
  availabilities: DayAvailability[],
) {
  const dayAvailabilitiesToInsert: any[] = []; // For DB insertion

  availabilities.forEach((availability) => {
    // Add the plain object for DB insert
    dayAvailabilitiesToInsert.push({
      mentorId,
      serviceId,
      startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
      duration: availability.duration,
      dayOfWeek: availability.dayOfWeek,
    });
  });

  return dayAvailabilitiesToInsert;
}

function prepareDateAvailabilitiesForCreation(
  mentorId: string,
  serviceId: string,
  availabilities: AvailabilityException[],
) {
  const dateAvailabilitiesToInsert: any[] = []; // For DB insertion

  availabilities.forEach((availability) => {
    // Push plain object for DB insert
    dateAvailabilitiesToInsert.push({
      mentorId,
      serviceId,
      startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
      duration: availability.duration,
      date: availability.date,
    });
  });

  return dateAvailabilitiesToInsert;
}

function createDayAvailabilityInstances(dayAvailabilities: any[]): DayAvailability[] {

  const result = dayAvailabilities.map((availability) => {

    return new DayAvailability(
      Time.fromString(availability.startTime.toISOString().slice(11, 16)), // HH:MM
      availability.duration,
      availability.dayOfWeek,
      availability.id,
    );
  });

  return result;
}

function createAvailabilityExceptionInstances(availabilityExceptions: any[]): AvailabilityException[] {

  const result = availabilityExceptions.map((availability) => {

    return new AvailabilityException(
      Time.fromString(availability.startTime.toISOString().slice(11, 16)), // HH:MM
      availability.duration,
      new Date(ymdDateString(availability.date)),
      availability.id,
    );
  });

  return result;
}

async function getAvailableSlotsForDate(
  menteeId: string,
  mentorId: string,
  service: any,
  userTimeZone: string,
  mentorTimeZone: string,
  currentDate: DateTime,
  availabilities: Availability[],
): Promise<Record<string, string[]>> {

  const mentorLocalDate = DateTime.fromObject(
    {
      year: currentDate.year,
      month: currentDate.month,
      day: currentDate.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    { zone: mentorTimeZone },
  );

  const previousDate = currentDate.minus({ days: 1 });
  const nextDate = currentDate.plus({ days: 1 });

  const sessionRequests = await prisma.sessionRequests.findMany({
    where: {
      service: {
        deletedAt: null, // exclude session requests from deleted services
      },
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
    include: {
      service: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  const sessionRequestsInstances = createTimeSlotInstances(sessionRequests);

  for (const sessionRequest of sessionRequestsInstances){
    sessionRequest.shiftToTimezone('Etc/UTC', mentorTimeZone);
  }

  const busyIntervals = sessionRequestsInstances.map((req) => {

    const time = req.startTime;

    const date = DateTime.fromJSDate(req.date);

    const start = DateTime.fromObject(
      {
        year: date.year,
        month: date.month,
        day: date.day,
        hour: time.hour,
        minute: time.minute,
        second: 0,
        millisecond: 0,
      },
      { zone: mentorTimeZone },
    );

    return {
      start,
      end: start.plus({ minutes: req.duration }),
    };

  });

  const windows = availabilities.map((a) => {

    const time = a.startTime;

    const start = mentorLocalDate.set({
      hour: time.hour,
      minute: time.minute,
      second: 0,
      millisecond: 0,
    });

    return { start, end: start.plus({ minutes: a.duration }) };
  });

  // Remove busy overlaps from windows
  let remainingWindows = windows;
  for (const { start: busyStart, end: busyEnd } of busyIntervals) {
    const updated: typeof remainingWindows = [];

    for (const window of remainingWindows) {
      if (busyEnd <= window.start || busyStart >= window.end) {
        updated.push(window);
      } else if (busyStart <= window.start && busyEnd >= window.end) {
        continue;
      } else if (busyStart > window.start && busyEnd < window.end) {
        updated.push(
          { start: window.start, end: busyStart },
          { start: busyEnd, end: window.end },
        );
      } else if (busyStart <= window.start) {
        updated.push({ start: busyEnd, end: window.end });
      } else {
        updated.push({ start: window.start, end: busyStart });
      }
    }

    remainingWindows = updated;
  }

  // Slice remaining availability windows into slots
  const step = service.sessionTime;
  const duration = service.sessionTime;
  const slotsByDate: Record<string, string[]> = {};

  for (const { start, end } of remainingWindows) {
    let cursor = start;

    while (cursor.plus({ minutes: duration }) <= end) {

      const local = cursor.setZone(userTimeZone);
      const localDate = local.toISODate()!; // e.g. "2025-08-20"
      const localTime = local.toFormat('HH:mm'); // e.g. "01:30"

      if (!slotsByDate[localDate]) {
        slotsByDate[localDate] = [];
      }

      slotsByDate[localDate].push(localTime);
      cursor = cursor.plus({ minutes: step });
    }
  }

  return slotsByDate;
}

function checkIfSlotLiesWithinAvailabilities(slot: TimeSlot, availabilites: (DayAvailability | AvailabilityException)[]): boolean{
  for (const availability of availabilites){
    if (slot.liesWithin(availability)){
      return true;
    }
  }
  return false;
}

function createTimeSlotInstances(timeslots: any[]): TimeSlot[]{

  const result = timeslots.map((timeslot) => {

    return new TimeSlot(
      Time.fromString(timeslot.startTime.toISOString().slice(11, 16)),
      timeslot.duration,
      new Date(ymdDateString(timeslot.date)),
      timeslot.id,
    );
  });

  return result;
}

export {
  createAvailabilityObjects,
  prepareDayAvailabilitiesForCreation,
  prepareDateAvailabilitiesForCreation,
  createDayAvailabilityInstances,
  createAvailabilityExceptionInstances,
  getAvailableSlotsForDate,
  checkIfSlotLiesWithinAvailabilities,
  createTimeSlotInstances,
}
