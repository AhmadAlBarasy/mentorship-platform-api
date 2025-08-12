import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { SessionStatus } from '@prisma/client';
import { SessionRequest } from '../classes/services/SessionRequest';
import { Time } from '../classes/services/Time';
import { ymdDateString } from '../utils/availability/helpers';

const { PENDING, ACCEPTED, REJECTED, CANCELLED } = SessionStatus;

const getServiceSessionRequests = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId } = req.params;
  const { id: mentorId, timezone: userTimeZone } = req.user;

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  const result = await prisma.sessionRequests.findMany({
    where: {
      serviceId,
      mentorId,
    },
    include: {
      mentee: {
        select: {
          name: true,
        },
      },
    },
  });

  const sessionRequests: Record<string, any[]> = {};

  for (const request of result){

    const sessionRequest = new SessionRequest(
      Time.fromString(request.startTime.toISOString().slice(11, 16)), // HH:MM
      request.duration,
      new Date(ymdDateString(request.date)),
      request.id,
    );

    const sessionStatus = request.status;

    sessionRequest.shiftToTimezone('Etc/UTC', userTimeZone);

    if (!sessionRequests[sessionStatus]){
      sessionRequests[sessionStatus] = [];
    }

    sessionRequests[sessionStatus].push({
      id: request.id,
      startTime: sessionRequest.startTime.toString(),
      duration: sessionRequest.duration,
      date: sessionRequest.formatDate(),
      agenda: request.agenda,
      communityId: request.communityId,
      menteeId: request.menteeId,
      menteeName: request.mentee.name,
      createdAt: request.createdAt,
      rejectionReason: request.rejectionReason,
    });
  }

  res.status(200).json({
    status: SUCCESS,
    sessionRequests,
  });

});

export {
  getServiceSessionRequests,
};
