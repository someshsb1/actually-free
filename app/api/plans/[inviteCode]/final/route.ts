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
    const message = error instanceof Error ? error.message : "Unable to confirm final plan.";
    const status = message.includes("Plan not found") ? 404 : message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
