
import APIError from '../APIError';
import { Time } from './Time';

export class Availability {
  startTime: Time;
  endTime: Time;
  dayOfWeek?: number | null;
  date?: Date | null;

  constructor(startTime: Time, endTime: Time, options?: { dayOfWeek?: number; date?: Date }) {

    if (!startTime.isBefore(endTime)){
      throw new APIError(400, 'startTime must be before endTime');
    }
    if (startTime.isEqual(endTime)){
      throw new APIError(400, 'startTime and endTime cannot be the same');
    }
    if (options && options.date && options.dayOfWeek){
      throw new Error('Invalid class usage: can\'t combine between date and dayOfWeek');
    }
    this.startTime = startTime;
    this.endTime = endTime;

    this.date = options?.date;
    this.dayOfWeek = options?.dayOfWeek;
  }

  conflictsWith(availability: Availability): boolean {
    return (
      (
        this.startTime.isBefore(availability.endTime) &&
      availability.startTime.isBefore(this.endTime)
      ) ||
    this.equalTo(availability)
    );
  }

  equalTo(availability: Availability): boolean {
    return (
      this.startTime.isEqual(availability.startTime) &&
      this.endTime.isEqual(availability.endTime)
    );
  }

  timeInMinutes(): number {
    const startMinutes = this.startTime.hour * 60 + this.startTime.minute;
    const endMinutes = this.endTime.hour * 60 + this.endTime.minute;
    return endMinutes - startMinutes;
  }

}
