import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { addParticipantRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const body = await request.json();
    const participant = await addParticipantRecord(createServiceClient(), inviteCode, {
      name: String(body.name || ""),
      startingLocation: String(body.startingLocation || ""),
      budgetMax: Number(body.budgetMax),
      dietaryPreferences: Array.isArray(body.dietaryPreferences) ? body.dietaryPreferences.map(String) : [],
      availability: Array.isArray(body.availability)
        ? body.availability.map((slot: { start: string; end: string }) => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
          }))
        : []
    });

    return NextResponse.json({ participant });
  } catch (error) {
    return apiErrorResponse(error, "Unable to add participant.");
  }
}
