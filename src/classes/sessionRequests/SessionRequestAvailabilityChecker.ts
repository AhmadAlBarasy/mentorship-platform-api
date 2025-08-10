// classes/sessionRequests/SessionRequestAvailabilityChecker.ts
import { DateTime } from 'luxon';
import { Time } from '../services/Time';
import { AvailabilityException } from '../services/AvailabilityException';
import { DayAvailability } from '../services/DayAvailability';

// shape of an existing SessionRequest row converted to your classes
export type ExistingSession = {
  date: Date;        // date-only (DB Date)
  startTime: Time;   // Time instance from your Time class
  duration: number;  // in minutes
};

export class SessionRequestAvailabilityChecker {
  constructor(
    private exceptions: AvailabilityException[],      // all exceptions for the mentor/service
    private dayAvailabilities: DayAvailability[],     // all day availabilities for the mentor/service
    private existingRequests: ExistingSession[],     // existing session requests (mentor)
    private sessionDuration: number                  // service.sessionTime (minutes)
  ) {}

  private isSameDate(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Returns true if the given requestStart (Date) can be booked.
   * timezone is optional (Luxon zone string). If omitted it uses system zone.
   */
  canBook(requestStartDate: Date, timezone?: string): boolean {
    const zone =  'UTC';

    // Request start & end DateTimes
    const reqStart = DateTime.fromJSDate(requestStartDate, { zone }).toUTC();
    const reqEnd = reqStart.plus({ minutes: this.sessionDuration });


    // ---------- 1) check existing session requests overlap ----------
    for (const existing of this.existingRequests) {
      const existingStart = DateTime.fromObject(
        {
          year: existing.date.getFullYear(),
          month: existing.date.getMonth() + 1,
          day: existing.date.getDate(),
          hour: existing.startTime.hour,
          minute: existing.startTime.minute,
        },
        { zone },
      );
      const existingEnd = existingStart.plus({ minutes: existing.duration });

      const overlap =
        reqStart.toMillis() < existingEnd.toMillis() &&
        existingStart.toMillis() < reqEnd.toMillis();

      if (overlap) {
        return false; // already booked or overlaps an existing session
      }
    }

    // ---------- 2) availability exceptions (date-specific) ----------
    // If there is any exception for the same date -> exceptions *override* day availability.
    const exceptionsForDate = this.exceptions.filter((ex) =>
      this.isSameDate(ex.date, requestStartDate),
    );

    if (exceptionsForDate.length > 0) {
      // must fit inside one of these exception intervals
      for (const ex of exceptionsForDate) {
        const exStart = DateTime.fromObject(
          {
            year: ex.date.getFullYear(),
            month: ex.date.getMonth() + 1,
            day: ex.date.getDate(),
            hour: ex.startTime.hour,
            minute: ex.startTime.minute,
          },
          { zone },
        );
        const exEnd = exStart.plus({ minutes: ex.duration });

        // request must be fully inside the exception window
        if (
          reqStart.toMillis() >= exStart.toMillis() &&
          reqEnd.toMillis() <= exEnd.toMillis()
        ) {
          return true;
        }
      }
      // there were exceptions but none fit -> cannot book (exception overrides day availability)
      return false;
    }

    // ---------- 3) no exceptions for the date -> check day availabilities ----------
    // We need to check:
    //  - availabilities that start the same weekday as requestDate
    //  - availabilities that start the *previous* weekday and overflow into requestDate
    const requestWeekday = requestStartDate.getDay(); // 0 = Sunday .. 6 = Saturday
    const prevWeekday = (requestWeekday + 6) % 7;

    const candidates = this.dayAvailabilities.filter(
      (d) => d.dayOfWeek === requestWeekday || d.dayOfWeek === prevWeekday,
    );

    for (const avail of candidates) {
      // compute the actual availability start DateTime (use requestDate or requestDate - 1 day)
      let availStartDate: DateTime;
      if (avail.dayOfWeek === requestWeekday) {
        availStartDate = DateTime.fromJSDate(requestStartDate, { zone }).set({
          hour: avail.startTime.hour,
          minute: avail.startTime.minute,
          second: 0,
          millisecond: 0,
        });
      } else {
        // availability started previous calendar day and may overflow into the request date
        availStartDate = DateTime.fromJSDate(requestStartDate, { zone })
          .minus({ days: 1 })
          .set({
            hour: avail.startTime.hour,
            minute: avail.startTime.minute,
            second: 0,
            millisecond: 0,
          });
      }

      const availEndDate = availStartDate.plus({ minutes: avail.duration });

      // request must be fully inside the availability window
      if (
        reqStart.toMillis() >= availStartDate.toMillis() &&
        reqEnd.toMillis() <= availEndDate.toMillis()
      ) {
        return true;
      }
    }

    // no matching availability found
    return false;
  }
}
