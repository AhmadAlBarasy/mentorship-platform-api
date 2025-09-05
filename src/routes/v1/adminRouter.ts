import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { Role } from '@prisma/client';
import { getBannedUsers, getUserReports, resolveUserReport } from '../../controllers/adminController';
import requestValidator from '../../middlewares/requestValidator';
import { resolveUserReportSchema } from '../../validators/validate.admin';

const { ADMIN } = Role;

const adminRouter = Router();

adminRouter.route('/user-reports/:id')
  .put(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    requestValidator({ bodySchema: resolveUserReportSchema }),
    resolveUserReport,
  )
  .all(notAllowedMethod);

adminRouter.route('/user-reports')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    getUserReports,
  )
  .all(notAllowedMethod);

adminRouter.route('/banned-users')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    getBannedUsers,
  )
  .all(notAllowedMethod);

export default adminRouter;
