import { NextResponse } from "next/server";

export function apiErrorResponse(error: unknown, fallback: string, status = 400) {
  const message = formatApiError(error, fallback);
  const nextStatus = message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : message.includes("Plan not found") ? 404 : status;
  return NextResponse.json({ error: message }, { status: nextStatus });
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return withKnownFields(error.message || fallback, error as Error & Record<string, unknown>);
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : fallback;
    return withKnownFields(message, record);
  }

  return fallback;
}

export function summarizeApiError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") {
    return { message: formatApiError(error, fallback) };
  }

  const record = error as Record<string, unknown>;
  const names = Object.getOwnPropertyNames(error);
  const picked = names.reduce<Record<string, unknown>>((summary, name) => {
    const value = record[name];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      summary[name] = value;
    }
    return summary;
  }, {});

  return {
    message: formatApiError(error, fallback),
    name: error instanceof Error ? error.name : typeof record.name === "string" ? record.name : null,
    constructor: error.constructor?.name ?? null,
    fields: picked
  };
}

function withKnownFields(message: string, record: Record<string, unknown>): string {
  const details = typeof record.details === "string" ? record.details : "";
  const hint = typeof record.hint === "string" ? record.hint : "";
  const code = typeof record.code === "string" ? ` (${record.code})` : "";
  return [message, details, hint].filter(Boolean).join(": ") + code;
}
