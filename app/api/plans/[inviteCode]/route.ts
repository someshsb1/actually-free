import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { getPlanBundleByInviteCode } from "@/lib/supabase/plans";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ inviteCode: string }> }) {
  try {
    const { inviteCode } = await context.params;
    const bundle = await getPlanBundleByInviteCode(createServiceClient(), inviteCode);

    if (!bundle) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (error) {
    return apiErrorResponse(error, "Unable to load plan.");
  }
}
