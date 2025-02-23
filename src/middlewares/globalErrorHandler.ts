import { NextFunction, Request, Response } from "express";
import APIError from "../types/classes/APIError";
import { FAIL } from "../constants/responseConstants";

export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof APIError){
    res.status(err.statusCode).json({
      status: FAIL,
      message: err.message,
    });
  }
  else {
    res.status(500).json({
      status: FAIL,
      message: 'Something went wrong.',
    });
  }
};