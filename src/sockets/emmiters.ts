import { getIO } from './index';

export const emitSystemAlert = (message: string) => {
  const io = getIO();
  io.emit('system:alert', message);
};
