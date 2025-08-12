import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { getServiceSessionRequests } from '../../controllers/sessionRequestController';

const authenticatedMentorSessionRequestsRouter = Router({ mergeParams: true });

const { MENTOR } = Role;

authenticatedMentorSessionRequestsRouter.route('/session-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTOR]),
    getServiceSessionRequests,
  )
  .all(notAllowedMethod);

export default authenticatedMentorSessionRequestsRouter;
