import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { SessionStatus } from '@prisma/client';
import { SessionRequest } from '../classes/services/SessionRequest';
import { Time } from '../classes/services/Time';
import { ymdDateString } from '../utils/availability/helpers';
import { DateTime } from 'luxon';
import { cancelCalendarEvent, createCalendarEvent } from '../services/sessionRequestService';

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

const updateSessionRequest = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: serviceId, requestId: id } = req.params;
  const { id: mentorId, name: mentorName } = req.user;
  const { agenda, rejectionReason } = req.body;
  let { status } = req.body;
  status = status.toUpperCase();

  const service = await prisma.services.findFirst({
    where: {
      id: serviceId,
      mentorId,
    },
  });

  if (!service){
    return next(new APIError(404, `You don't have a service with an ID of ${serviceId}`));
  }

  const { type: summary } = service;

  const sessionRequest = await prisma.sessionRequests.findFirst({
    where: {
      id,
      mentorId,
    },
    include: {
      mentee: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!sessionRequest){
    return next(new APIError(404, 'Session request not found'));
  }

  const sessionRequestInstance = new SessionRequest(
    Time.fromString(sessionRequest.startTime.toISOString().slice(11, 16)), // HH:MM
    sessionRequest.duration,
    new Date(ymdDateString(sessionRequest.date)),
    sessionRequest.id,
  );

  if (agenda && sessionRequest.status !== PENDING){
    return next(new APIError(400, `You are not allowed update a session agenda unless its status is ${PENDING}`));
  }

  if (status === ACCEPTED){
    if (sessionRequest.status !== PENDING){
      return next(new APIError(400, `You can't change the state to ${ACCEPTED}`));
    }

    const {
      email: alternativeMenteeEmail,
      name: menteeName,
      id: menteeId,
    } = sessionRequest.mentee;

    const menteeCalendarConnection = await prisma.appTokens.findFirst({
      where: {
        userId: menteeId,
        name: 'GoogleCalendar',
      },
    });

    const menteeEmail = menteeCalendarConnection?.emailOrId;

    const attendees = [menteeEmail || alternativeMenteeEmail];

    const eventCreationResult = await createCalendarEvent(
      mentorName,
      menteeName,
      mentorId,
      summary,
      sessionRequest.agenda || '',
      sessionRequestInstance.getStartDateTime(),
      sessionRequestInstance.getEndDateTime(),
      attendees,
    );

    await prisma.sessionRequests.updateMany({
      where: {
        id,
        mentorId,
      },
      data: {
        eventId: eventCreationResult.id,
        status: ACCEPTED,
      },
    });

  } else if (status === REJECTED){
    if (sessionRequest.status !== PENDING){
      return next(new APIError(400, `You can't change the state to ${REJECTED}`));
    }
    await prisma.sessionRequests.updateMany({
      where: {
        id,
      },
      data: {
        status,
        rejectionReason,
      },
    });
  } else if (status === CANCELLED){
    if (sessionRequest.status !== ACCEPTED){
      return next(new APIError(400, `You can't change the state to ${CANCELLED}`));
    }

    const startTime: Time = Time.fromString(sessionRequest.startTime.toISOString().slice(11, 16));

    const startDateAndTime = DateTime.fromObject({
      year: sessionRequest.date.getFullYear(),
      month: sessionRequest.date.getMonth() + 1, // JavaScript dates start from 0. Luxon starts from 1
      day: sessionRequest.date.getDate(),
      hour: startTime.hour,
      minute: startTime.minute,
    });

    const now = DateTime.now();
    const hoursLeft = startDateAndTime.diff(now, 'hours').hours;

    // Check if it's less than 6 hours away
    if (hoursLeft < 6) {
      return next(new APIError(400, 'You cannot cancel a session less than 6 hours before it starts'));
    }

    await cancelCalendarEvent(sessionRequest.eventId!, mentorId);

    await prisma.sessionRequests.updateMany({
      where: {
        id,
      },
      data: {
        status,
        rejectionReason,
      },
    });

  } else if (sessionRequest.status === PENDING){
    await prisma.sessionRequests.updateMany({
      where: {
        id,
      },
      data: {
        agenda,
      },
    });
  }
  res.status(200).json({
    status: SUCCESS,
    message: 'Session request has been updated successfully',
  });
});

const getMenteeSessionRequests = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: menteeId, timezone: userTimeZone } = req.user;

  const result = await prisma.sessionRequests.findMany({
    where: {
      menteeId,
    },
    include: {
      service: {
        include: {
          mentor: {
            select: {
              name: true,
            },
          },
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
      mentorName: request.service.mentor.name,
      mentorId: request.service.mentorId,
      serviceId: request.serviceId,
      serviceType: request.service.type,
      communityId: request.communityId,
      createdAt: request.createdAt,
      rejectionReason: request.rejectionReason,
    });
  }

  res.status(200).json({
    status: SUCCESS,
    sessionRequests,
  });

});

const withDrawSessionRequest = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { id: menteeId } = req.user;

  const sessionRequest = await prisma.sessionRequests.findFirst({
    where: {
      id,
      menteeId,
    },
  });

  if (!sessionRequest){
    return next(new APIError(404, `No session request was found with an ID of ${id}`));
  }

  if (sessionRequest.status !== PENDING){
    return next(new APIError(400, `You can't withdraw a session request with status other than ${PENDING}`));
  }

  await prisma.sessionRequests.deleteMany({
    where: {
      id,
    },
  });

  res.status(204).json({});

});

const updateSessionAgenda = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: menteeId } = req.user;
  const { agenda } = req.body;
  const { id } = req.params;

  const sessionRequest = await prisma.sessionRequests.findFirst({
    where: {
      id,
      menteeId,
    },
  });

  if (!sessionRequest){
    return next(new APIError(404, 'Session request was not found'));
  }

  if (sessionRequest.status !== PENDING){
    return next(new APIError(400, 'You can\'t update the agenda of this session request'));
  }

  await prisma.sessionRequests.updateMany({
    where: {
      id,
    },
    data: {
      agenda,
    },
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Session request details has been updated successfully',
  });

});

export {
  getServiceSessionRequests,
  updateSessionRequest,
  getMenteeSessionRequests,
  withDrawSessionRequest,
  updateSessionAgenda,
};
