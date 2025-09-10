import { Request, Response, NextFunction } from 'express';
import { SessionRequest } from "../classes/services/SessionRequest";
import { Time } from "../classes/services/Time";
import { SUCCESS } from "../constants/responseConstants";
import prisma from "../db";
import errorHandler from "../utils/asyncErrorHandler";
import { ymdDateString } from "../utils/availability/helpers";

const getDashboardMenteeSessionRequests = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id: menteeId, timezone: userTimeZone } = req.user;

  // only PENDING
  const result = await prisma.sessionRequests.findMany({
    where: {
      menteeId,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
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

  const pendingRequests: any[] = [];

  for (const request of result) {
    const sessionRequest = new SessionRequest(
      Time.fromString(request.startTime.toISOString().slice(11, 16)), // HH:MM
      request.duration,
      new Date(ymdDateString(request.date)),
      request.id,
    );

    sessionRequest.shiftToTimezone('Etc/UTC', userTimeZone);

    pendingRequests.push({
      id: request.id,
      startTime: sessionRequest.startTime.toString(),
      duration: sessionRequest.duration,
      date: sessionRequest.formatDate(),
      agenda: request.agenda,
      mentorName: request.service.mentor.name,
      mentorId: request.service.mentorId,
      serviceId: (request.service.deletedAt === null) ? request.serviceId : request.service.deletedId,
      serviceType: request.service.type,
      communityId: request.communityId,
      createdAt: request.createdAt,
      status: request.status,
    });
  }

  res.status(200).json({
    status: SUCCESS,
    sessionRequests: pendingRequests,
  });
});

export { getDashboardMenteeSessionRequests };