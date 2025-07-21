import { User } from '@prisma/client';
import 'express';

export declare global {
  namespace Express {
    interface Request {
      user?: User | any;
      csrfToken(): string;
    }
  }
}
