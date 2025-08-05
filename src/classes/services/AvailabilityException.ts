import { Availability } from './Availability';
import { Time } from './Time';

export class AvailabilityException extends Availability {
  date: Date;

  constructor(startTime: Time, duration: number, date: Date){
    super(startTime, duration);
    this.date = date;
  }

  conflictsWith(availability: AvailabilityException): boolean {
    let endTime = this.getEndTime(true);
    let otherEndTime = availability.getEndTime(true);

    // Case 1: Same date → standard overlap
    if (this.isSameDate(this.date, availability.date)) {
      return (
        this.startTime.isBefore(otherEndTime) &&
      availability.startTime.isBefore(endTime)
      );
    }

    // Case 2: Adjacent days
    if (this.areAdjacentDaysWith(availability)) {

      endTime = this.getEndTime(false);
      otherEndTime = availability.getEndTime(false);
      const thisIsEarlier = this.date < availability.date;

      // if 'this' date is the one that comes before, check if it overflows into the next day
      if (thisIsEarlier){
        // Check if this crosses into the next day
        if (endTime.isBefore(this.startTime) || endTime.isEqual(this.startTime)) {
          // "After midnight" portion overlaps with other day's availability
          if (availability.startTime.isBefore(endTime)) {
            return true;
          }
        }
      } else {
      // Check if the other crosses into the next day
        if (otherEndTime.isBefore(availability.startTime) || otherEndTime.isEqual(availability.startTime)) {
          if (this.startTime.isBefore(otherEndTime)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isSameDate(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  getEndTime(skipBoundaries: boolean = false): Time {
    return this.startTime.addMinutes(this.duration, skipBoundaries);
  }

  areAdjacentDaysWith(availability: AvailabilityException): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diffDays = Math.abs(
      Math.floor(this.date.getTime() / oneDayMs) -
    Math.floor(availability.date.getTime() / oneDayMs),
    );
    return diffDays === 1;
  }

  formatDate(): string {
    return new Intl.DateTimeFormat('en-CA').format(this.date);
  }

};
