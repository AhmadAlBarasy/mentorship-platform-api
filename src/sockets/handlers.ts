import { Server, Socket } from 'socket.io';
import logger from '../loggers/appLogger';
import jwt from 'jsonwebtoken';
import prisma from '../db';

export default function registerSocketHandlers(io: Server, socket: Socket) {

  const token = socket.handshake.auth?.token;

  if (!token){
    logger.error('Invalid socket connection attempt: No token provided');
    return socket.disconnect();
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
  } catch (err: any) {
    logger.error(`Invalid socket token: ${err.message}`);
    return socket.disconnect();
  }

  const userId = payload.sub as string;
  socket.data.userId = userId;

  socket.join(userId);

  socket.on('readNotification', async(notificationId: string) => {
    await handleReadNotification(io, socket, notificationId);
  });

  socket.on('disconnect', () => {
    logger.info('A socket has been terminated');
  });
}

async function handleReadNotification(io: Server, socket: Socket, notificationId: string) {
  const userId = socket.data.userId;

  try {
    // Validate notification existence and ownership
    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId },
      select: { userId: true, isRead: true },
    });

    if (!notification) {
      return socket.emit('error', 'Notification not found');
    }

    if (notification.userId !== userId) {
      return socket.emit('error', 'You are not allowed to perform this action');
    }

    // Update only if unread
    if (!notification.isRead) {
      await prisma.notifications.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    // Compute unread count for that user
    const unreadCount = await prisma.notifications.count({
      where: { userId, isRead: false },
    });

    // Emit updated info back to user’s room
    io.to(userId).emit('updateNewNotifications', unreadCount > 0);

  } catch (err: any) {
    logger.error(`Error in handleReadNotification: ${err.message}`);
    socket.emit('error', 'Internal server error');
  }
}
