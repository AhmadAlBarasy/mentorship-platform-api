import { Server } from 'socket.io';
import http from 'http';
import registerSocketHandlers from './handlers';
import logger from '../loggers/appLogger';

const FRONTEND_URL = process.env.FRONTEND_URL;

let io: Server;

export const initSocketServer = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected. Socket ID: ${socket.id}`);
    registerSocketHandlers(io, socket);
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
