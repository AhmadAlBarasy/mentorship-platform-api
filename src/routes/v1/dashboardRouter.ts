import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { getDashboardMenteeSessionRequests, searchUsersAndCommunities } from '../../controllers/dashboardController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { Role } from '@prisma/client';
import requestValidator from '../../middlewares/requestValidator';
import { searchQuerySchema } from '../../validators/validate.common';
import rateLimit from 'express-rate-limit';

const dashboardRouter = Router();
const { MENTEE } = Role;

dashboardRouter.route('/search')
  .get(
    rateLimit({
      windowMs: 1000,
      limit: 50,
    }),
    authenticate({ access: 'full' }),
    requestValidator({ querySchema: searchQuerySchema }),
    searchUsersAndCommunities,
  )
  .all(notAllowedMethod);

dashboardRouter.route('/mentee/session-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getDashboardMenteeSessionRequests,
  )
  .all(notAllowedMethod);
export default dashboardRouter;
