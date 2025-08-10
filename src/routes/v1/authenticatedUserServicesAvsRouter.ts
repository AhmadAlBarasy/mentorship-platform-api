import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import {
  addDayAvailability,
  deleteAvailabilityException,
  deleteDayAvailability,
  updateDayAvailability,
  updateAvailabilityException,
} from '../../controllers/AvailabilityController';
import requestValidator from '../../middlewares/requestValidator';
import { addDayAvailabilitySchema, updateAvailabilitySchema } from '../../validators/validate.availability';

const { MENTOR } = Role;

const authenticatedUserServicesAvsRouter = Router({ mergeParams: true });

authenticatedUserServicesAvsRouter.route('/day-availabilities/:avId')
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: updateAvailabilitySchema }),
    updateDayAvailability,
  )
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    deleteDayAvailability,
  )
  .all(notAllowedMethod);


authenticatedUserServicesAvsRouter.route('/day-availabilities/')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: addDayAvailabilitySchema }),
    addDayAvailability,
  )
  .all(notAllowedMethod);


authenticatedUserServicesAvsRouter.route('/availability-exceptions/:avId')
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: updateAvailabilitySchema }),
    updateAvailabilityException,
  )
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    deleteAvailabilityException,
  )
  .all(notAllowedMethod);

authenticatedUserServicesAvsRouter.route('/availability-exceptions')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
  )

export default authenticatedUserServicesAvsRouter;
