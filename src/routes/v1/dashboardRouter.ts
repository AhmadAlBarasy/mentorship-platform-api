import { Router } from "express";
import { authenticate, authorizedRoles } from "../../middlewares/authMiddlewares";
import { getDashboardMenteeSessionRequests } from "../../controllers/dashboardController";
import { notAllowedMethod } from "../../middlewares/notAllowedHandler";
import { Role } from "@prisma/client";

const dashboardRouter = Router();
const { MENTEE } = Role;

dashboardRouter.route('/mentee/session-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getDashboardMenteeSessionRequests,
  )
  .all(notAllowedMethod);
export default dashboardRouter;