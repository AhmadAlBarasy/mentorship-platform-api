import express, { Request, Response, NextFunction } from 'express';
import globalErrorHandler from './middlewares/globalErrorHandler';
import httpLog from './middlewares/httpLog';
import cookieParser from 'cookie-parser';
import { notFoundEndpoint } from './middlewares/notAllowedHandler';
import v1Router from './routes/v1/v1Router';
import setupSwagger from './swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();

const NODE_ENV: string = process.env.NODE_ENV || 'production';

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.use(httpLog); // to log HTTP requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

/* security middlewares */
app.use(helmet());
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 250,
}));

app.use('/api/v1', v1Router);

if (NODE_ENV === 'development'){
  setupSwagger(app);
}

app.all('*', notFoundEndpoint); // handle requests to endpoints that are not implemented

// global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(err, req, res, next);
});

export default app;
