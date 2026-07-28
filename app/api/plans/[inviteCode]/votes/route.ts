import { NextResponse } from "next/server";
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
    const message = error instanceof Error ? error.message : "Unable to save vote.";
    const status = message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
