import { Response } from "express";

export const handleError = (
  res: Response,
  error: unknown,
  statusCode: number = 500,
  message: string = "Internal Server Error"
): void => {
  let errorMessage = message;

  if (error instanceof Error) {
    errorMessage = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorMessage,
  });
};