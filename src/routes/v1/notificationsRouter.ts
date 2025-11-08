import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddlewares';
import { getUserNotifications } from '../../controllers/notificationsController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';

const notificationsRouter = Router();

notificationsRouter.route('/')
  .get(
    authenticate({ access: 'full' }),
    getUserNotifications,
  )
  .all(notAllowedMethod);

export default notificationsRouter;

