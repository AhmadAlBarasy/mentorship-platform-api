import prisma from '../db';
import { getIO } from '../sockets';

export async function createAndPushNotification(
  receiver: string,
  content: string,
  redirectPath?: string,
){

  const notification = await prisma.notifications.create({
    data: {
      content,
      redirectPath,
      userId: receiver,
    },
  });

  const io = getIO();

  const room = io.sockets.adapter.rooms.get(receiver);

  if (room && room.size > 0) {
    io.to(receiver).emit('notification', notification);
  }
}
