import { Availability } from './Availability';
import { Time } from './Time';

export class AvailabilityException extends Availability {
  date: Date;

  constructor(startTime: Time, endTime: Time, date: Date){
    super(startTime, endTime);
    this.date = date;
  }
};
