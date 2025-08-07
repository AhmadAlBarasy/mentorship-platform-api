import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { getServiceById } from '../../controllers/serviceController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';

const { MENTOR } = Role;

const authenticatedUserServicesRouter = Router();

authenticatedUserServicesRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    getServiceById,
  )
  .all(notAllowedMethod);

export default authenticatedUserServicesRouter;
