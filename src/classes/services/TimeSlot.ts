import { DateTime } from 'luxon';
import { Time } from './Time';
import { AvailabilityException } from './AvailabilityException';
import { DayAvailability } from './DayAvailability';

export class TimeSlot {
  date: Date;
  startTime: Time;
  duration: number;
  id?: string;



  constructor(startTime: Time, duration: number, date: Date, id?: string){
    this.startTime = startTime;
    this.date = date;
    this.duration = duration;
    if (id){
      this.id = id;
    }
  }

  // signature overloading
  liesWithin(availability: DayAvailability): boolean;
  liesWithin(availability: AvailabilityException): boolean;
  liesWithin(availability: DayAvailability | AvailabilityException): boolean;

  liesWithin(availability: AvailabilityException | DayAvailability): boolean {
    if (availability instanceof AvailabilityException){
      const slotEnd = this.getEndTime(true);
      const availabilityEnd = availability.getEndTime(true);

      // Case 1: Same date (normal window)
      if (this.isSameDate(this.date, availability.date)) {
        return (
          !this.startTime.isBefore(availability.startTime) &&
      !slotEnd.isAfter(availabilityEnd)
        );
      } else {
        // add 24 hours for both the start and end time of the slot to compare them to the day availablity from the previous day
        const slotStartTimeForComparison = this.startTime.addMinutes(1440, true);
        const slotEndTimeForComparison = slotEnd.addMinutes(1440, true);
        return (
          !slotStartTimeForComparison.isBefore(availability.startTime) &&
          !slotEndTimeForComparison.isAfter(availabilityEnd)
        );
      }
    } else {
      const slotDay = (this.date.getDay() + 6) % 7; // sunday -> 0
      const slotEnd = this.getEndTime(true);
      const availabilityEnd = availability.getEndTime(true);

      // Case 1: Slot and availability are on same day
      if (slotDay === availability.dayOfWeek) {
        return (
          !this.startTime.isBefore(availability.startTime) &&
      !slotEnd.isAfter(availabilityEnd)
        );
      }

      // Case 2: Availability is from previous day and crosses past midnight
      const previousDay = (slotDay + 6) % 7; // one day before
      if (availability.dayOfWeek === previousDay) {
        // add 24 hours for both the start and end time of the slot to compare them to the day availablity from the previous day
        const slotStartTimeForComparison = this.startTime.addMinutes(1440, true);
        const slotEndTimeForComparison = slotEnd.addMinutes(1440, true);
        return (
          !slotStartTimeForComparison.isBefore(availability.startTime) &&
          !slotEndTimeForComparison.isAfter(availabilityEnd)
        );
      }
      return false;
    }
  }

  conflictsWith(slot: TimeSlot): boolean {
    let endTime = this.getEndTime(true);
    let otherEndTime = slot.getEndTime(true);

    // Case 1: Same date → standard overlap
    if (this.isSameDate(this.date, slot.date)) {
      return (
        this.startTime.isBefore(otherEndTime) &&
      slot.startTime.isBefore(endTime)
      );
    }

    // Case 2: Adjacent days
    if (this.areAdjacentDaysWith(slot)) {

      endTime = this.getEndTime(false);
      otherEndTime = slot.getEndTime(false);
      const thisIsEarlier = this.date < slot.date;

      // if 'this' date is the one that comes before, check if it overflows into the next day
      if (thisIsEarlier){
        // Check if this crosses into the next day
        if (endTime.isBefore(this.startTime) || endTime.isEqual(this.startTime)) {
          // "After midnight" portion overlaps with other day's availability
          if (slot.startTime.isBefore(endTime)) {
            return true;
          }
        }
      } else {
      // Check if the other crosses into the next day
        if (otherEndTime.isBefore(slot.startTime) || otherEndTime.isEqual(slot.startTime)) {
          if (this.startTime.isBefore(otherEndTime)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  areAdjacentDaysWith(slot: TimeSlot): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diffDays = Math.abs(
      Math.floor(this.date.getTime() / oneDayMs) -
    Math.floor(slot.date.getTime() / oneDayMs),
    );
    return diffDays === 1;
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

  formatDate(): string {
    return new Intl.DateTimeFormat('en-CA').format(this.date);
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

};
