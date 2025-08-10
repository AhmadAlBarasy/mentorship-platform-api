// src/routes/v1/SessionRequestRouter.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddlewares';
import { createSessionRequestSchema } from '../../validators/validate.sessionRequest';
import requestValidator from '../../middlewares/requestValidator';
import { createSessionRequest } from '../../controllers/sessionRequestsController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';



const SessionRequestRouter = Router();


SessionRequestRouter.route('/')
  .post(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: createSessionRequestSchema }),
    createSessionRequest,
  )
  .all(notAllowedMethod);

export default SessionRequestRouter;
