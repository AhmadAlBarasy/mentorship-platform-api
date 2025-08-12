import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { getMentorServices, getServiceById, updateService } from '../../controllers/serviceController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import requestValidator from '../../middlewares/requestValidator';
import { updateServiceSchema } from '../../validators/validate.service';
import authenticatedUserServicesAvsRouter from './authenticatedUserServicesAvsRouter';
import authenticatedMentorSessionRequestsRouter from './authenticatedMentorSessionRequestsRouter';

const { MENTOR } = Role;

const authenticatedUserServicesRouter = Router();

authenticatedUserServicesRouter.use('/:id', authenticatedUserServicesAvsRouter);
authenticatedUserServicesRouter.use('/:id', authenticatedMentorSessionRequestsRouter);

authenticatedUserServicesRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    getServiceById,
  )
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: updateServiceSchema }),
    updateService,
  )
  .all(notAllowedMethod);

authenticatedUserServicesRouter.route('/')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    getMentorServices,
  )
  .all(notAllowedMethod);

export default authenticatedUserServicesRouter;
