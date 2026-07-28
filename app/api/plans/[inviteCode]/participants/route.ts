import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { addParticipantRecord, refreshTravelTimesForPlan } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const body = await request.json();
    const supabase = createServiceClient();
    const participant = await addParticipantRecord(supabase, inviteCode, {
      name: String(body.name || ""),
      startingLocation: String(body.startingLocation || ""),
      budgetMax: Number(body.budgetMax),
      dietaryPreferences: Array.isArray(body.dietaryPreferences) ? body.dietaryPreferences.map(String) : [],
      areaPreferences: Array.isArray(body.areaPreferences) ? body.areaPreferences.map(String) : [],
      responseToken: typeof body.responseToken === "string" ? body.responseToken : undefined,
      availability: Array.isArray(body.availability)
        ? body.availability.map((slot: { start: string; end: string }) => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
          }))
        : []
    });

    const bundle = await refreshTravelTimesForPlan(supabase, inviteCode);

    return NextResponse.json({ participant, bundle });
  } catch (error) {
    return apiErrorResponse(error, "Unable to add participant.");
  }
}
