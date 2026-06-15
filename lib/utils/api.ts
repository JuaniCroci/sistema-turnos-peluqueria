import { NextResponse } from 'next/server';
import { ZodError, type ZodIssue } from 'zod';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'LIMIT_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

const statusForCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LIMIT_EXCEEDED: 429,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const errorResponse = (
  code: ApiErrorCode,
  message: string,
  details?: Array<{ path: string; message: string }>,
): NextResponse<ApiErrorBody> => {
  const body: ApiErrorBody = {
    error: details ? { code, message, details } : { code, message },
  };
  return NextResponse.json(body, { status: statusForCode[code] });
};

export const zodDetails = (
  error: ZodError,
): Array<{ path: string; message: string }> => {
  return error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
};
