import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { deleteParticipantRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, context: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await context.params;
    await deleteParticipantRecord(createServiceClient(), participantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to remove participant.");
  }
}
