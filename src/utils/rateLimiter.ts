import rateLimit from 'express-rate-limit';

export const rateLimiter = (minutes: number, max: number, message: string) => {
  return rateLimit({
    windowMs: minutes * 60000,
    max,
    message,
  });
};
