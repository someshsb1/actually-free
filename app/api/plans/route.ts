import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
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
      organizerName: String(body.organizerName || "Organizer"),
      timeZone: String(body.timeZone || "UTC")
    });

    return NextResponse.json(bundle);
  } catch (error) {
    return apiErrorResponse(error, "Unable to create plan.");
  }
}
