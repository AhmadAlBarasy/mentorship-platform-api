import { Router } from "express";
import { notAllowedMethod } from "../../middlewares/notAllowedHandler";
import authenticatedUserSessionRequestRouter from "./authenticatedUserSessionRequestRouter";


const SessionRequestRouter = Router();

SessionRequestRouter.use('/my', authenticatedUserSessionRequestRouter);

//to be done
SessionRequestRouter.route('/')
  .all(notAllowedMethod);


export default SessionRequestRouter;
