import prisma from '../db';
import { DateTime } from 'luxon';

interface GetSessionRequestByFieldOptions {
  searchBy: {
    serviceId?: string;
    menteeId?: string;
    mentorId?: string;
    communityId?: string;
  };
  userTimezone?: string | null; // if provided, dates/times will be shifted
}

export const getSessionRequestByFieldService = async ({
  searchBy,
  userTimezone = null,
}: GetSessionRequestByFieldOptions) => {
  const whereClause: Record<string, any> = {};
  if (searchBy.serviceId) whereClause.serviceId = searchBy.serviceId;
  if (searchBy.menteeId) whereClause.menteeId = searchBy.menteeId;
  if (searchBy.mentorId) whereClause.mentorId = searchBy.mentorId;
  if (searchBy.communityId) whereClause.communityId = searchBy.communityId;

  const rows = await prisma.sessionRequests.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (!userTimezone) return rows;

  return rows.map((r) => {
    const out: any = { ...r };

    // Shift & format createdAt
    if (r.createdAt) {
      out.createdAt = DateTime
        .fromJSDate(r.createdAt, { zone: 'UTC' })
        .setZone(userTimezone)
        .toFormat('yyyy-MM-dd HH:mm'); // formatted local time
    }

    // Shift date + startTime
    const dateObj = r.date ? new Date(r.date) : null;
    const timeObj = r.startTime ? new Date(r.startTime) : null;

    if (dateObj && timeObj) {
      const combinedUtc = DateTime.fromObject(
        {
          year: dateObj.getUTCFullYear(),
          month: dateObj.getUTCMonth() + 1,
          day: dateObj.getUTCDate(),
          hour: timeObj.getUTCHours(),
          minute: timeObj.getUTCMinutes(),
          second: timeObj.getUTCSeconds() ?? 0,
        },
        { zone: 'UTC' },
      );

      const zoned = combinedUtc.setZone(userTimezone);
      out.date = zoned.toFormat('yyyy-MM-dd');
      out.startTime = zoned.toFormat('HH:mm');
    }

    return out;
  });
};
