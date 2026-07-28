import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
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
    return apiErrorResponse(error, "Unable to confirm final plan.");
  }
}
