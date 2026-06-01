import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@geometry-of-poker/shared";

export function apiError(
  status: number,
  code: string,
  message: string,
  field?: string,
) {
  const payload: ApiErrorResponse = {
    error: field ? { code, message, field } : { code, message },
  };
  return NextResponse.json(payload, { status });
}

