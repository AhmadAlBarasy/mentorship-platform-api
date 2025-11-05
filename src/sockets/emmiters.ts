import { getIO } from './index';

export const emitNotification = (userId: string, notification: any) => {
  const io = getIO();
  io.to(userId).emit('notification:new', notification);
};

export const emitSystemAlert = (message: string) => {
  const io = getIO();
  io.emit('system:alert', { message });
};
