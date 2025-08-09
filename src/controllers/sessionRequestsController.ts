import { Request, Response, NextFunction } from 'express';
import APIError from '../classes/APIError';
import errorHandler from '../utils/asyncErrorHandler';
import { SUCCESS } from '../constants/responseConstants';
import { getSessionRequestByFieldService } from '../services/sessionRequestsService';

const getMenteeSessionRequests = errorHandler( async (req: Request, res: Response, next: NextFunction) => {
    const menteeId = req.user.id;

    const sessionRequests = await getSessionRequestByFieldService({
      searchBy: { menteeId },
      includeService: false,
      includeMentee: false,
    });

    if (!sessionRequests || sessionRequests.length === 0) {
      return next(new APIError(404, 'No session requests found for this mentee'));
    }

    res.status(200).json({
      status: SUCCESS,
      message: 'Mentee session requests retrieved successfully',
      data: sessionRequests,
    });
  }
);

export {
  getMenteeSessionRequests,
};
