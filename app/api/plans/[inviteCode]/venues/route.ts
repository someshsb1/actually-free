import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { addVenueCandidateRecord, getPlanBundleByInviteCode } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const body = await request.json();
    const supabase = createServiceClient();
    await addVenueCandidateRecord(supabase, inviteCode, {
      name: String(body.name || ""),
      address: String(body.address || ""),
      category: String(body.category || "Manual pick"),
      pricePerPerson: Number(body.pricePerPerson || 0),
      bookingUrl: String(body.bookingUrl || "")
    });
    const bundle = await getPlanBundleByInviteCode(supabase, inviteCode);
    return NextResponse.json(bundle);
  } catch (error) {
    return apiErrorResponse(error, "Unable to add venue candidate.");
  }
}
