import { NextResponse } from "next/server";
import type { RateLimitResult } from "./rate-limit";
import { rateLimitHeaders } from "./rate-limit";

export function jsonError(
  message: string,
  status: number,
  rateLimit?: RateLimitResult
): NextResponse {
  const headers = rateLimit ? rateLimitHeaders(rateLimit) : undefined;
  return NextResponse.json({ error: message }, { status, headers });
}

export function jsonOk<T extends Record<string, unknown>>(
  data: T,
  rateLimit?: RateLimitResult,
  status = 200
): NextResponse {
  const headers = rateLimit ? rateLimitHeaders(rateLimit) : undefined;
  return NextResponse.json(data, { status, headers });
}
