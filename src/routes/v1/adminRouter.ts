import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { Role } from '@prisma/client';
import { getBannedUsers, getUserReports, liftUserBan, resolveUserReport, getUserFullInformation, banUser } from '../../controllers/adminController';
import requestValidator from '../../middlewares/requestValidator';
import { banUserSchema, resolveUserReportSchema } from '../../validators/validate.admin';
import { limitResultsSchema } from '../../validators/validate.common';

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
    requestValidator({ querySchema: limitResultsSchema(5, 20) }),
    getUserReports,
  )
  .all(notAllowedMethod);

adminRouter.route('/user-preview/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    getUserFullInformation,
  )
  .all(notAllowedMethod);

adminRouter.route('/banned-users/:id')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    requestValidator({ bodySchema: banUserSchema }),
    banUser,
  )
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    liftUserBan,
  )
  .all(notAllowedMethod);

adminRouter.route('/banned-users')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([ADMIN]),
    requestValidator({ querySchema: limitResultsSchema(5, 20) }),
    getBannedUsers,
  )
  .all(notAllowedMethod);

export default adminRouter;
