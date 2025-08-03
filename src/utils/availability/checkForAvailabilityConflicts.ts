import APIError from '../../classes/APIError';
import { Availability } from '../../classes/services/Availability';
import { Time } from '../../classes/services/Time';
import { validDays } from '../../validators/validator.custom';


function checkForAvailabilityWindowsConflictsOnCreate(dayOrDate: string, availabilities: any[], sessionTime: number) {

  const result: Availability[] = [];

  const dayProvided = validDays.indexOf(dayOrDate); // checks if the dayOrDate parameter contains a date or a day of the week

  availabilities.forEach((availability) => {

    const newAvailability = new Availability(
      Time.fromString(availability.startTime),
      Time.fromString(availability.endTime),
      {
        dayOfWeek: dayProvided !== -1 ? dayProvided : undefined,
        date: dayProvided === -1 ? new Date(dayOrDate) : undefined,
      },
    );

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
