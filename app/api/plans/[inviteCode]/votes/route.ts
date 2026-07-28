import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { upsertVoteRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const vote = await upsertVoteRecord(createServiceClient(), {
      participantId: String(body.participantId),
      venueId: String(body.venueId),
      vote: body.vote
    });

    return NextResponse.json({ vote });
  } catch (error) {
    return apiErrorResponse(error, "Unable to save vote.");
  }
}
