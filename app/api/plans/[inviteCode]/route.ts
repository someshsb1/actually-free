import { NextResponse } from "next/server";
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
    const message = error instanceof Error ? error.message : "Unable to load plan.";
    const status = message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
