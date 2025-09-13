import { Request, Response, NextFunction } from 'express';
import { SessionRequest } from '../classes/services/SessionRequest';
import { Time } from '../classes/services/Time';
import { SUCCESS } from '../constants/responseConstants';
import prisma from '../db';
import errorHandler from '../utils/asyncErrorHandler';
import { ymdDateString } from '../utils/availability/helpers';
import supabase from '../services/supabaseClient';
import APIError from '../classes/APIError';
import { DateTime } from 'luxon';
import { Role, SessionStatus } from '@prisma/client';
import { createTimeSlotInstances } from '../utils/availability/availabilityUtils';
import { getMeetingLink } from '../services/sessionRequestService';

const { MENTEE } = Role;
const { ACCEPTED } = SessionStatus;

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const getDashboardMenteeSessionRequests = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
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

const searchUsersAndCommunities = errorHandler(async(req: Request, res: Response, next: NextFunction) =>{
  const { query: searchTerm } = req.query;

  const query = searchTerm as string;

  const [users, communities] = await Promise.all([
    prisma.users.findMany({
      where: {
        OR: [
          { id: { equals: query } },
          { id: { contains: query } },
          { name: { equals: query } },
          { name: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        headline: true,
      },
      take: 10,
    }),

    prisma.communities.findMany({
      where: {
        OR: [
          { id: { equals: query } },
          { id: { contains: query } },
          { name: { equals: query } },
          { name: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        verified: true,
      },
      take: 10,
    }),
  ]);

  const preparedUsers = users.map((user) => {
    return {
      id: user.id,
      name: user.name,
      headline: user.headline,
      imageUrl: user.imageUrl ? supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(user.imageUrl).data.publicUrl :
        null,
    }
  });

  const preparedCommunities = communities.map((community) => {
    return {
      id: community.id,
      name: community.name,
      verified: community.verified,
      imageUrl: community.imageUrl ? supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(community.imageUrl).data.publicUrl :
        null,
    }
  });

  if (preparedUsers.length === 0 && preparedCommunities.length === 0){
    return next(new APIError(404, 'No results found'));
  }

  res.status(200).json({
    status: SUCCESS,
    users: preparedUsers,
    communities: preparedCommunities,
  });

});

const getTodayEvents = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { role, id, timezone: userTimezone } = req.user;

  const UTCNow = DateTime.now().plus({ days: 5 });
  const userTimeNow = UTCNow.setZone(userTimezone).startOf('day');

  const filters: any = {
    date: {
      in: [
        UTCNow.startOf('day').toJSDate(),
        UTCNow.startOf('day').minus({ day: 1 }).toJSDate(),
        UTCNow.startOf('day').plus({ day: 1 }).toJSDate(),
      ],
    },
    status: ACCEPTED,
  };

  if (role === MENTEE){
    filters.menteeId = id;
  } else {
    filters.mentorId = id;
  }

  const eventRecords = await prisma.sessionRequests.findMany({
    where: filters,
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
      mentee: {
        select: {
          name: true,
        },
      },
    },
  });

  const eventsInstances = createTimeSlotInstances(eventRecords);

  for (const event of eventsInstances){
    event.shiftToTimezone('Etc/UTC', userTimezone);
  }

  const todayEventsInstances = eventsInstances.filter((event) => {
    return event.formatDate() === userTimeNow.toISODate();
  });

  const events = [];

  for (const event of todayEventsInstances) {

    const eventRecord = eventRecords.find((record) => record.id === event.id);

    const meetLink = await getMeetingLink(eventRecord!.eventId!, eventRecord!.mentorId);

    events.push({
      startTime: event.startTime.toString(),
      duration: event.duration,
      meetTitle: `${eventRecord?.service.mentor.name} and ${eventRecord?.mentee.name} - ${eventRecord?.service.type}`,
      meetLink,
    });
  };

  res.status(200).json({
    status: SUCCESS,
    events,
  });

});

export {
  getDashboardMenteeSessionRequests,
  searchUsersAndCommunities,
  getTodayEvents,
};
