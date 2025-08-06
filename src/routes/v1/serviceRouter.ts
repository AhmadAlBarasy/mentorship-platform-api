import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { Role } from '@prisma/client';
import { createService } from '../../controllers/serviceController';
import { createServiceSchema } from '../../validators/validate.service';
import authenticatedUserServicesRouter from './authenticatedUserServicesRouter';

const { MENTOR } = Role;

const serviceRouter = Router();

serviceRouter.use('/my', authenticatedUserServicesRouter);

serviceRouter.route('/')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: createServiceSchema }),
    createService,
  )
  .all(notAllowedMethod);


export default serviceRouter;
