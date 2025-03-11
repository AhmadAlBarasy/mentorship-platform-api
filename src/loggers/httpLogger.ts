import winston, { format } from 'winston';
const { combine, timestamp, json, printf } = format;
import { magenta } from 'colorette';

const cliFormat =  printf(({ level, message, timestamp }) => {
  return `${magenta(`[time: ${timestamp}]`)} ${level}: ${message}`;
});

const httpLogger = winston.createLogger({
  level: 'http', // change based on your needs or use your own severity system
  format: combine(timestamp(), json()),
  // transports: [
  //   new winston.transports.File({ filename: './logs/http.log' }),
  // ]
});

// log HTTP requests to the console if the node environment is 'development'
if (process.env.NODE_ENV !== 'production') {
  httpLogger.add(new winston.transports.Console({ format: combine(timestamp(), cliFormat) }));
}

export default httpLogger;
