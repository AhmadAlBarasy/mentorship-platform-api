import { DateTime } from 'luxon';
import { Availability } from './Availability';
import { Time } from './Time';

export class DayAvailability extends Availability {
  dayOfWeek: number;

  constructor(startTime: Time, duration: number, dayOfWeek: number){
    if (dayOfWeek < 0 || dayOfWeek > 6){
      throw new Error('Invalid class usage: dayOfWeek must be between 0 and 6');
    }
    super(startTime, duration);
    this.dayOfWeek = dayOfWeek;
  }

  conflictsWith(availability: DayAvailability): boolean {
    let endTime = this.getEndTime(true);
    let otherEndTime = availability.getEndTime(true);

    // if both availabilities start at the same day
    if (this.dayOfWeek === availability.dayOfWeek){
      return (
        this.startTime.isBefore(otherEndTime) &&
            availability.startTime.isBefore(endTime)
      )
    } else if (this.areAdjacentDaysWith(availability)){
      // if availabilities start at an adjacent days
      endTime = this.getEndTime(false);
      otherEndTime = availability.getEndTime(false);
      const thisIsEarlier = (this.dayOfWeek < availability.dayOfWeek || (this.dayOfWeek === 6 && availability.dayOfWeek === 0));
      // If this day flows into the next day

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
        if (otherEndTime.isBefore(availability.startTime) || otherEndTime.isEqual(availability.startTime)){
          if (this.startTime.isBefore(otherEndTime)) {
            return true;
          }
        }
      }

    }
    return false;
  }

  getEndTime(skipBoundaries: boolean = false): Time {
    return this.startTime.addMinutes(this.duration, skipBoundaries);
  }

  areAdjacentDaysWith(availability: DayAvailability): boolean {
    const diff = Math.abs(this.dayOfWeek - availability.dayOfWeek);
    return diff === 1 || diff === 6;
  }

  shiftToTimezone(currentTimezone: string, targetTimezone: string): void {
    // Use an arbitrary date (e.g., 2025-01-06 is a Monday)
    const referenceDate = DateTime.fromObject({
      year: 2025,
      month: 1,
      day: 6 + this.dayOfWeek, // Ensures correct weekday
      hour: this.startTime.hour,
      minute: this.startTime.minute,
    },
    {
      zone: currentTimezone,
    });

    const shifted = referenceDate.setZone(targetTimezone);

    // Update time
    this.startTime = new Time(shifted.hour, shifted.minute);

    // Update dayOfWeek if the weekday changed
    const newWeekday = ((shifted.weekday - 1) % 7); // Luxon: 1 = Monday, 7 = Sunday
    this.dayOfWeek = newWeekday;
  }

};
