import { Request, Response } from 'express';
import { FAIL } from '../constants/responseConstants';

export function notAllowedMethod(req: Request, res: Response) {
  res.status(405).json({
    status: FAIL,
    message: 'Method not allowed.',
  });
};

export function notFoundEndpoint (req: Request, res: Response) {
  res.status(404).json({
    status: FAIL,
    message: 'Requested resource not found.',
  });
};