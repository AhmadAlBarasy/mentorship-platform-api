import { Time } from '../services/Time';
import { AvailabilityException } from '../services/AvailabilityException';
import { DayAvailability } from '../services/DayAvailability';
import { getDayIndexFromDate, getDayName } from '../../utils/availability/helpers';

export type ExistingSession = {
  date: Date;
  startTime: Time;
  duration: number;
};

export class SessionRequestAvailabilityChecker {
  constructor(
    private exceptions: AvailabilityException[],
    private dayAvailabilities: DayAvailability[],
    private sessionDuration: number
  ) {}

  private isSameDate(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  canBook(requestStartDate: Date): boolean {
    const reqStart = requestStartDate;
    const reqEnd = new Date(reqStart.getTime() + this.sessionDuration * 60000);


    // 2) Check date-specific exceptions
    const exceptionsForDate = this.exceptions.filter((ex) =>
      this.isSameDate(ex.date, requestStartDate)
    );

    if (exceptionsForDate.length > 0) {
      for (const ex of exceptionsForDate) {
        const exStart = new Date(
          ex.date.getFullYear(),
          ex.date.getMonth(),
          ex.date.getDate(),
          ex.startTime.hour,
          ex.startTime.minute
        );
        const exEnd = new Date(exStart.getTime() + ex.duration * 60000);

        if (reqStart >= exStart && reqEnd <= exEnd) {
          return true;
        }
      }
      return false;
    }

    // 3) Check normal day availabilities (including previous-day overflow past midnight)
    const requestWeekday = getDayIndexFromDate(reqStart);

    const prevWeekday = (requestWeekday + 6) % 7;

    const candidates = this.dayAvailabilities.filter(
      (d) => d.dayOfWeek === requestWeekday || d.dayOfWeek === prevWeekday
    );


    for (const avail of candidates) {
      let availStartDate: Date;

      if (avail.dayOfWeek === requestWeekday) {
        availStartDate = new Date(
          reqStart.getFullYear(),
          reqStart.getMonth(),
          reqStart.getDate(),
          avail.startTime.hour,
          avail.startTime.minute
        );
      } else {
        availStartDate = new Date(
          reqStart.getFullYear(),
          reqStart.getMonth(),
          reqStart.getDate() - 1,
          avail.startTime.hour,
          avail.startTime.minute
        );

        // Only allow if it actually passes midnight into the request date
        const availEnd = new Date(availStartDate.getTime() + avail.duration * 60000);
        if (availEnd.getDate() === availStartDate.getDate()) {
          continue; // doesn't cross midnight, skip
        }
      }

      const availEndDate = new Date(availStartDate.getTime() + avail.duration * 60000);

      if (reqStart >= availStartDate && reqEnd <= availEndDate) {
        
        return true;
      }
    }

    return false;
  }
}
