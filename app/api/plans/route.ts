import { NextResponse } from "next/server";
import { createPlanRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bundle = await createPlanRecord(createServiceClient(), {
      title: String(body.title || "Untitled plan"),
      activityType: body.activityType,
      startDate: String(body.startDate),
      endDate: String(body.endDate),
      budgetMax: Number(body.budgetMax),
      area: String(body.area || "New York City"),
      maxTravelMinutes: Number(body.maxTravelMinutes),
      organizerName: String(body.organizerName || "Organizer")
    });

    return NextResponse.json(bundle);
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to create plan.";
  const status = message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : 400;
  return NextResponse.json({ error: message }, { status });
}
