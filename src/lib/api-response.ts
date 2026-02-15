import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Standard API Envelope Types
// ──────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export interface ApiEnvelope<T = unknown> {
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

// ──────────────────────────────────────────────
// Response Helpers
// ──────────────────────────────────────────────

export function successResponse<T>(
  data: T,
  meta?: ApiMeta,
  status: number = 200,
): NextResponse<ApiEnvelope<T>> {
  const body: ApiEnvelope<T> = { data };
  if (meta) {
    body.meta = meta;
  }
  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiEnvelope<never>> {
  const error: ApiError = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return NextResponse.json({ error }, { status });
}

// ──────────────────────────────────────────────
// Error Handler HOF
// ──────────────────────────────────────────────

type RouteHandler = (...args: never[]) => Promise<NextResponse>;

export function withErrorHandler<T extends RouteHandler>(handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("Unhandled route error:", e);
      return errorResponse(
        "INTERNAL_ERROR",
        "Internal server error",
        500,
      );
    }
  };
  return wrapped as T;
}
