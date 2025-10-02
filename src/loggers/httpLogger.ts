import winston, { format } from 'winston';
const { combine, timestamp, json, printf } = format;
import { magenta } from 'colorette';

const cliFormat =  printf(({ level, message, timestamp }) => {
  return `${magenta(`[time: ${timestamp}]`)} ${level}: ${message}`;
});

const httpLogger = winston.createLogger({
  level: 'http', // change based on your needs or use your own severity system
  format: combine(timestamp(), json()),
});

// log HTTP requests to the console if the node environment is 'development'
httpLogger.add(new winston.transports.Console({ format: combine(timestamp(), cliFormat) }));

export default httpLogger;
