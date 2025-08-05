import APIError from '../../classes/APIError';
import { AvailabilityException } from '../../classes/services/AvailabilityException';
import { DayAvailability } from '../../classes/services/DayAvailability';
import { Time } from '../../classes/services/Time';
import { validDays } from '../../validators/validator.custom';
import { timeOnly } from './helpers';


function createAvailabilityObjects(dayOrDate: string, availabilities: any[], sessionTime: number) {

  const result: any[] = [];

  const dayProvided = validDays.indexOf(dayOrDate) !== -1; // checks if the dayOrDate parameter contains a date or a day of the week

  availabilities.forEach((availability) => {
    let newAvailability;
    if (dayProvided){
      newAvailability = new DayAvailability(
        Time.fromString(availability.startTime),
        availability.duration,
        validDays.indexOf(dayOrDate),
      );
    } else {
      newAvailability = new AvailabilityException(
        Time.fromString(availability.startTime),
        availability.duration,
        new Date(dayOrDate),
      );
    }

    // check if the session time is greater than the new availability time window
    if (sessionTime > newAvailability.timeInMinutes()){
      throw new APIError(
        400,
        `Invalid time window on ${dayOrDate}: ` +
        `[${newAvailability.startTime.toString()} - ${newAvailability.getEndTime().toString()}] is less than the specified session time of ` +
        `${sessionTime} miuntes`,
      );
    }

    result.forEach((av) => {
      if (newAvailability.conflictsWith(av)){
        throw new APIError(400, `Conflict on ${dayOrDate}: [${newAvailability.startTime.toString()} - ${newAvailability.getEndTime().toString()}] ` +
        `overlaps with [${av.startTime.toString()} - ${av.getEndTime().toString()}]`);
      }
    });

    result.push(newAvailability);
  });

  return result;
};

function prepareDayAvailabilitiesAndCheckForConflicts(
  mentorId: string,
  serviceId: string,
  availabilities: DayAvailability[][],
) {
  const availabilityInstances: DayAvailability[] = []; // For conflict checking
  const dayAvailabilitiesToInsert: any[] = []; // For DB insertion

  availabilities.forEach((oneDayAvailability) => {
    oneDayAvailability.forEach((availability) => {
      // Check against existing availability instances
      availabilityInstances.forEach((av) => {
        if (av.conflictsWith(availability)) {
          throw new APIError(
            400,
            `Conflict between ${validDays[av.dayOfWeek]} and ${validDays[availability.dayOfWeek]}: [${availability.startTime.toString()} - ` +
            `${availability.getEndTime().toString()}] overlaps with [${av.startTime.toString()} - ${av.getEndTime().toString()}]`,
          );
        }
      });

      // Keep the original object for future conflict checks
      availabilityInstances.push(availability);

      // Add the plain object for DB insert
      dayAvailabilitiesToInsert.push({
        mentorId,
        serviceId,
        startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
        duration: availability.duration,
        dayOfWeek: availability.dayOfWeek,
      });
    });
  });

  return dayAvailabilitiesToInsert;
}

function prepareDateAvailabilitiesAndCheckForConflicts(
  mentorId: string,
  serviceId: string,
  availabilities: AvailabilityException[][],
) {
  const availabilityInstances: AvailabilityException[] = []; // For conflict checking
  const dateAvailabilitiesToInsert: any[] = []; // For DB insertion

  availabilities.forEach((oneDayAvailability) => {
    oneDayAvailability.forEach((availability) => {
      // Check against existing availability instances
      availabilityInstances.forEach((av) => {
        if (av.conflictsWith(availability)) {
          throw new APIError(
            400,
            `Conflict between ${av.formatDate()} and ${availability.formatDate()}: [${availability.startTime.toString()} - ` +
            `${availability.getEndTime().toString()}] overlaps with [${av.startTime.toString()} - ${av.getEndTime().toString()}]`,
          );
        }
      });

      // Keep the instance for future checks
      availabilityInstances.push(availability);

      // Push plain object for DB insert
      dateAvailabilitiesToInsert.push({
        mentorId,
        serviceId,
        startTime: timeOnly(availability.startTime.hour, availability.startTime.minute),
        duration: availability.duration,
        date: availability.date,
      });
    });
  });

  return dateAvailabilitiesToInsert;
}

export {
  createAvailabilityObjects,
  prepareDayAvailabilitiesAndCheckForConflicts,
  prepareDateAvailabilitiesAndCheckForConflicts,
}
