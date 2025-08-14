import { DateTime } from 'luxon';
import { Time } from './Time';

export class SessionRequest {
  startTime: Time;
  duration: number;
  date: Date;
  id?: string;

  constructor(startTime: Time, duration: number, date: Date, id?: string) {
    if (duration < 10 || duration > 360){
      throw new Error('Invalid class usage: Session Request duration must be between 10 and 360 minutes');
    }

    this.startTime = startTime;
    this.duration = duration;
    this.date = date;

    if (id){
      this.id = id;
    }
  }

  shiftToTimezone(currentTimezone: string, targetTimezone: string): void {
    const dtStart = DateTime.fromObject(
      {
        year: this.date.getFullYear(),
        month: this.date.getMonth() + 1,
        day: this.date.getDate(),
        hour: this.startTime.hour,
        minute: this.startTime.minute,
      },
      { zone: currentTimezone },
    );

    const shifted = dtStart.setZone(targetTimezone);

    // Update date and time using the shifted DateTime
    this.date = new Date(`${shifted.year}-${shifted.month.toString().padStart(2, '0')}-${shifted.day.toString().padStart(2, '0')}`);
    this.startTime = new Time(shifted.hour, shifted.minute);
  }

  formatDate(): string {
    return new Intl.DateTimeFormat('en-CA').format(this.date);
  }

  getStartDateTime(timezone: string = 'UTC'): string {
    const dt = DateTime.fromObject(
      {
        year: this.date.getFullYear(),
        month: this.date.getMonth() + 1,
        day: this.date.getDate(),
        hour: this.startTime.hour,
        minute: this.startTime.minute,
      },
      { zone: timezone },
    );
    return dt.toISO()!; // ISO string with timezone offset
  }

  getEndDateTime(timezone: string = 'UTC'): string {
    const dt = DateTime.fromObject(
      {
        year: this.date.getFullYear(),
        month: this.date.getMonth() + 1,
        day: this.date.getDate(),
        hour: this.startTime.hour,
        minute: this.startTime.minute,
      },
      { zone: timezone },
    ).plus({ minutes: this.duration });

    return dt.toISO()!;
  }

  timeInMinutes(): number {
    return this.duration;
  }

  // conflictsWith(sessionRequest: SessionRequest): boolean;

}
