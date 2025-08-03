export class Time {
  hour: number;
  minute: number;

  constructor(hour: number, minute: number){
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new Error('hour and minute must be integers');
    }

    if (hour < 0 || hour > 23) {
      throw new Error('hour must be between 0 and 23');
    }

    if (minute < 0 || minute > 59) {
      throw new Error('minute must be between 0 and 59');
    }

    this.hour = hour;
    this.minute = minute;
  }

  static fromString(timeString: string): Time {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!regex.test(timeString)) {
      throw new Error(`Invalid time format: "${timeString}". Expected format is HH:MM in 24-hour format.`);
    }

    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    return new Time(hour, minute);
  }

  isBefore(other: Time): boolean {
    return (
      this.hour < other.hour ||
      (this.hour === other.hour && this.minute < other.minute)
    );
  }

  isEqual(other: Time): boolean {
    return this.hour === other.hour && this.minute === other.minute;
  }

  toString(): string {
    return `${this.hour.toString().padStart(2, '0')}:${this.minute
      .toString()
      .padStart(2, '0')}`;
  }
}
