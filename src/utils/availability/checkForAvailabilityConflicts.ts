import APIError from '../../classes/APIError';
import { AvailabilityException } from '../../classes/services/AvailabilityException';
import { DayAvailability } from '../../classes/services/DayAvailability';
import { Time } from '../../classes/services/Time';
import { validDays } from '../../validators/validator.custom';


function checkForAvailabilityWindowsConflictsOnCreate(dayOrDate: string, availabilities: any[], sessionTime: number) {

  const result: any[] = [];

  const dayProvided = validDays.indexOf(dayOrDate) !== -1; // checks if the dayOrDate parameter contains a date or a day of the week

  availabilities.forEach((availability) => {
    let newAvailability;
    if (dayProvided){
      newAvailability = new DayAvailability(
        Time.fromString(availability.startTime),
        Time.fromString(availability.endTime),
        validDays.indexOf(dayOrDate),
      );
    } else {
      newAvailability = new AvailabilityException(
        Time.fromString(availability.startTime),
        Time.fromString(availability.endTime),
        new Date(dayOrDate),
      );
    }

    // check if the session time is greater than the new availability time window
    if (sessionTime > newAvailability.timeInMinutes()){
      throw new APIError(
        400,
        `Invalid time window on ${dayOrDate}: ` +
        `[${newAvailability.startTime.toString()} - ${newAvailability.endTime.toString()}] is less than the specified session time of ` +
        `${sessionTime} miuntes`,
      );
    }

    result.forEach((av) => {
      if (newAvailability.conflictsWith(av)){
        throw new APIError(400, `Conflict on ${dayOrDate}: [${newAvailability.startTime.toString()} - ${newAvailability.endTime.toString()}] ` +
        `overlaps with [${av.startTime.toString()} - ${av.endTime.toString()}]`);
      }
    });

    result.push(newAvailability);
  });

  return result;
};

export {
  checkForAvailabilityWindowsConflictsOnCreate,
}
