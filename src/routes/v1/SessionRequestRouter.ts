// src/routes/v1/SessionRequestRouter.ts
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { createSessionRequestSchema } from '../../validators/validate.sessionRequest';
import requestValidator from '../../middlewares/requestValidator';
import { createSessionRequest } from '../../controllers/sessionRequestsController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { Role } from '@prisma/client';



const SessionRequestRouter = Router();
const { MENTEE } = Role;


SessionRequestRouter.route('/')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    requestValidator({ bodySchema: createSessionRequestSchema }),
    createSessionRequest,
  )
  .all(notAllowedMethod);

export default SessionRequestRouter;
