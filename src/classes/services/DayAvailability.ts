import { Availability } from './Availability';
import { Time } from './Time';

export class DayAvailability extends Availability {
  dayOfWeek: number;

  constructor(startTime: Time, endTime: Time, dayOfWeek: number){
    super(startTime, endTime);
    this.dayOfWeek = dayOfWeek;
  }
};
