import { NextResponse } from "next/server";

export function apiErrorResponse(error: unknown, fallback: string, status = 400) {
  const message = formatApiError(error, fallback);
  const nextStatus = message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : message.includes("Plan not found") ? 404 : status;
  return NextResponse.json({ error: message }, { status: nextStatus });
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return withKnownFields(error.message, error as Error & Record<string, unknown>);
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : fallback;
    return withKnownFields(message, record);
  }

  return fallback;
}

function withKnownFields(message: string, record: Record<string, unknown>): string {
  const details = typeof record.details === "string" ? record.details : "";
  const hint = typeof record.hint === "string" ? record.hint : "";
  const code = typeof record.code === "string" ? ` (${record.code})` : "";
  return [message, details, hint].filter(Boolean).join(": ") + code;
}
