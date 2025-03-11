import morgan from 'morgan';
import httpLogger from '../loggers/httpLogger';

const httpLog = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => {
        httpLogger.http(message.trim());
      },
    },
  },
);

export default httpLog;
