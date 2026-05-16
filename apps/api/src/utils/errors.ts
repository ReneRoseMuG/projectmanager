import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import type { ApiErrorPayload } from "@taskmanager/shared-types";

export type ApiErrorCode = ApiErrorPayload["error"];

export class AppError extends Error {
  public readonly error: ApiErrorCode;
  public readonly statusCode: number;

  public constructor(error: ApiErrorCode, message: string, statusCode: number) {
    super(message);
    this.error = error;
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string): AppError {
  return new AppError("BAD_REQUEST", message, 400);
}

export function notFound(message: string): AppError {
  return new AppError("NOT_FOUND", message, 404);
}

export function conflict(message: string): AppError {
  return new AppError("CONFLICT", message, 409);
}

export function formatError(error: AppError): ApiErrorPayload {
  return {
    error: error.error,
    message: error.message,
    statusCode: error.statusCode
  };
}

function validationMessage(error: FastifyError): string {
  return error.validation?.map((item) => item.message).filter(Boolean).join(", ") ?? error.message;
}

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send(formatError(error));
    return;
  }

  if (error.validation) {
    void reply.status(400).send({
      error: "BAD_REQUEST",
      message: validationMessage(error),
      statusCode: 400
    } satisfies ApiErrorPayload);
    return;
  }

  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  void reply.status(statusCode).send({
    error: statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
    message: statusCode >= 500 ? "Internal server error" : error.message,
    statusCode
  } satisfies ApiErrorPayload);
}
