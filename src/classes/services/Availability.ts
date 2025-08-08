import { Time } from './Time';

export abstract class Availability {
  startTime: Time;
  duration: number;
  id?: string;

  constructor(startTime: Time, duration: number) {
    if (duration < 10 || duration > 360){
      throw new Error('Invalid class usage: Availability window duration must be between 10 and 360 minutes');
    }

    this.startTime = startTime;
    this.duration = duration;
  }

  abstract conflictsWith(availability: Availability): boolean;

  abstract shiftToTimezone(currentTimezone: string, targetTimezone: string): void;

  // abstract equalTo(availability: Availability): boolean;


  timeInMinutes(): number {
    return this.duration;
  }

}
