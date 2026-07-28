import { NextResponse } from "next/server";
import { confirmFinalPlanRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const body = await request.json();

    await confirmFinalPlanRecord(createServiceClient(), inviteCode, {
      venueId: String(body.venueId),
      confirmedBy: String(body.confirmedBy || "Organizer"),
      slot: {
        start: new Date(body.slot.start),
        end: new Date(body.slot.end)
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = formatErrorMessage(error, "Unable to confirm final plan.");
    const status = message.includes("Plan not found") ? 404 : message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function formatErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const detail = "details" in error && typeof error.details === "string" ? error.details : "";
  const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
  return [error.message, detail].filter(Boolean).join(": ") + code;
}
