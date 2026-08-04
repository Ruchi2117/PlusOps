import {
  Catch,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ url: string }>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException
      ? extractMessage(exception)
      : "An unexpected error occurred.";

    if (!isHttpException) {
      this.logger.error(exception);
    }

    const payload: ErrorResponse = {
      error: {
        code: isHttpException ? exception.name : "InternalServerError",
        message,
        path: request.url,
        statusCode,
        timestamp: new Date().toISOString()
      }
    };

    response.status(statusCode).json(payload);
  }
}

function extractMessage(exception: HttpException) {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null && "message" in response) {
    const message = response.message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return exception.message;
}
