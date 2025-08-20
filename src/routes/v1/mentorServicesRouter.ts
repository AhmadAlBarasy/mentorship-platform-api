import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { getServiceDetailsAndSlots } from '../../controllers/serviceController';
import { Role } from '@prisma/client';

const mentorServicesRouter = Router({ mergeParams: true });

const { MENTEE } = Role;

mentorServicesRouter.route('/:serviceId')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getServiceDetailsAndSlots,
  )
  .all(notAllowedMethod);

export default mentorServicesRouter;
