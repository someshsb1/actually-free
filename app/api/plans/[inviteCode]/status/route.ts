import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { updatePlanStatusRecord } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

const allowedStatuses = new Set(["collecting", "voting", "confirmed", "cancelled"]);

export async function PUT(request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const body = await request.json();
    const status = String(body.status);

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid plan status." }, { status: 400 });
    }

    const bundle = await updatePlanStatusRecord(createServiceClient(), inviteCode, status as "collecting" | "voting" | "confirmed" | "cancelled");
    return NextResponse.json(bundle);
  } catch (error) {
    return apiErrorResponse(error, "Unable to update plan status.");
  }
}
