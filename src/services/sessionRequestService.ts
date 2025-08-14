import axios from 'axios';
import prisma from '../db';
import APIError from '../classes/APIError';
import { v4 as uuidv4 } from 'uuid';

async function refreshAccessToken(refreshToken: string) {
  const { data } = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    },
  });

  return data.access_token;
}

async function cancelCalendarEvent(eventId: string, userId: string){

  const accessTokenRow = await prisma.appTokens.findFirst({
    where: { userId, name: 'GoogleCalendar', type: 'ACCESS' },
  });
  const refreshTokenRow = await prisma.appTokens.findFirst({
    where: { userId, name: 'GoogleCalendar', type: 'REFRESH' },
  });

  if (!refreshTokenRow){
    throw new APIError(400, 'You should connect your calendar before canceling a session request');
  }

  let accessToken = accessTokenRow?.token;

  // Refresh if expired or missing
  if (!accessTokenRow || (accessTokenRow.expiresIn && new Date() > accessTokenRow.expiresIn)) {
    console.log('TOKEN EXPIRED');
    try {
      accessToken = await refreshAccessToken(refreshTokenRow.token);

    } catch (e){
      throw new APIError(500, 'Failed to cancel the event on Google Calendar');
    }

    await prisma.appTokens.updateMany({
      where: { userId, name: 'GoogleCalendar', type: 'ACCESS' },
      data: {
        token: accessToken,
        expiresIn: new Date(Date.now() + 3600 * 1000),
      },
    });
  }
  try {
    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        params: { sendUpdates: 'all' }, // notify attendees of cancellation
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  } catch (e){
    throw new APIError(500, 'Failed to cancel the event on Google Calendar');
  }
}

async function createCalendarEvent(
  mentorName: string,
  menteeName: string,
  userId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  attendees: string[],
  timezone: string = 'Etc/UTC',
) {

  const accessTokenRow = await prisma.appTokens.findFirst({
    where: { userId, name: 'GoogleCalendar', type: 'ACCESS' },
  });
  const refreshTokenRow = await prisma.appTokens.findFirst({
    where: { userId, name: 'GoogleCalendar', type: 'REFRESH' },
  });

  if (!refreshTokenRow){
    throw new APIError(400, 'You should connect your calendar before accepting a session request');
  }

  let accessToken = accessTokenRow?.token;

  // Refresh if expired or missing
  if (!accessTokenRow || (accessTokenRow.expiresIn && new Date() > accessTokenRow.expiresIn)) {
    console.log('TOKEN EXPIRED');
    try {
      accessToken = await refreshAccessToken(refreshTokenRow.token);

    } catch (e){
      throw new APIError(500, 'Failed to create an event on Google Calendar');
    }

    await prisma.appTokens.updateMany({
      where: { userId, name: 'GoogleCalendar', type: 'ACCESS' },
      data: {
        token: accessToken,
        expiresIn: new Date(Date.now() + 3600 * 1000),
      },
    });
  }

  const event = {
    summary: `${mentorName} and ${menteeName} - ${summary}`,
    description: `${description}\n <b>Powered by Growthly</b>`,
    start: {
      dateTime: startTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endTime,
      timeZone: timezone,
    },
    conferenceData: {
      createRequest: {
        requestId: uuidv4(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }, // Google Meet
      },
    },
    attendees: attendees.map((attende) => {
      return { email: attende }
    }),
  };

  let res;
  try {
    res = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      event,
      {
        params: {
          conferenceDataVersion: 1,
          sendUpdates: 'all', // optional: email invites
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (e){
    throw new APIError(500, 'Failed to create an event on Google Calendar');
  }
  return res.data; // Google returns the created event object
}

export {
  createCalendarEvent,
  cancelCalendarEvent,
}
