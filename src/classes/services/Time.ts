export class Time {
  hour: number;
  minute: number;

  constructor(hour: number, minute: number, skipBoundaries: boolean = false){
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new Error('hour and minute must be integers');
    }

    if (!skipBoundaries && (hour < 0 || hour > 23)) {
      throw new Error('hour must be between 0 and 23');
    }

    if (!skipBoundaries && (minute < 0 || minute > 59)) {
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

  addMinutes(minutes: number, skipBoundaries: boolean): Time {
    const totalMinutes = this.hour * 60 + this.minute + minutes;

    if (skipBoundaries) {
    // Minutes always wrap at 60
      const newHour = Math.floor(totalMinutes / 60);
      const newMinute = ((totalMinutes % 60) + 60) % 60; // keep 0–59 range
      return new Time(newHour, newMinute, true);
    }

    // Normal mode: wrap around midnight (0–23 hours, 0–59 minutes)
    const wrappedMinutes =
    ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

    const newHour = Math.floor(wrappedMinutes / 60);
    const newMinute = wrappedMinutes % 60;

    return new Time(newHour, newMinute, false);
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

  isAfter(other: Time): boolean {
    return !this.isBefore(other) && !this.isEqual(other);
  }

  toString(): string {
    return `${this.hour.toString().padStart(2, '0')}:${this.minute
      .toString()
      .padStart(2, '0')}`;
  }
}
