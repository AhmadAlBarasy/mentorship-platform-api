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

app.use(httpLog); // to log HTTP requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
})); // temporarily, CORS will be disabled during development

/* security middlewares */
app.use(helmet());
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 50,
}));

app.use('/api/v1', v1Router);

setupSwagger(app);

app.all('*', notFoundEndpoint); // handle requests to endpoints that are not implemented

// global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(err, req, res, next);
});

export default app;
