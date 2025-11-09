import app from './app';
import dotenv from 'dotenv';
import logger from './loggers/appLogger';
import http from 'http';
import { initSocketServer } from './sockets';

dotenv.config({ path: './config/.env' });

const PORT: number = Number(process.env.PORT) || 80;

function startServer(){

  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(PORT, () => logger.info(`Server is listening on port ${PORT}`));
}

startServer();
