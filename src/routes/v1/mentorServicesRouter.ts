import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { bookSlotFromService, getServiceDetailsAndSlots } from '../../controllers/serviceController';
import { Role } from '@prisma/client';
import { serviceBookingSchema } from '../../validators/validate.service';

const mentorServicesRouter = Router({ mergeParams: true });

const { MENTEE } = Role;

mentorServicesRouter.route('/:serviceId')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getServiceDetailsAndSlots,
  )
  .all(notAllowedMethod);

mentorServicesRouter.route('/:serviceId/book')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    requestValidator({ bodySchema: serviceBookingSchema }),
    bookSlotFromService,
  )
  .all(notAllowedMethod);

export default mentorServicesRouter;
