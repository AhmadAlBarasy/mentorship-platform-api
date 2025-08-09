
import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { getMenteeSessionRequests } from '../../controllers/sessionRequestsController';

const { MENTEE } = Role;

const authenticatedUserSessionRequestRouter = Router();

authenticatedUserSessionRequestRouter.route('/mentee-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getMenteeSessionRequests,
  )
  .all(notAllowedMethod);


export default authenticatedUserSessionRequestRouter;