import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { getServiceSessionRequests, updateSessionRequest } from '../../controllers/sessionRequestController';
import requestValidator from '../../middlewares/requestValidator';
import { updateSessionRequestSchema } from '../../validators/validate.service';

const authenticatedMentorSessionRequestsRouter = Router({ mergeParams: true });

const { MENTOR } = Role;

authenticatedMentorSessionRequestsRouter.route('/session-requests/:requestId')
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    requestValidator({ bodySchema: updateSessionRequestSchema }),
    updateSessionRequest,
  )
  .all(notAllowedMethod);

authenticatedMentorSessionRequestsRouter.route('/session-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    getServiceSessionRequests,
  )
  .all(notAllowedMethod);

export default authenticatedMentorSessionRequestsRouter;
