import { NextResponse } from "next/server";
import { formatApiError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

const tables = ["plans", "participants", "availability", "venues", "votes", "final_plans"] as const;

export async function GET() {
  try {
    const supabase = createServiceClient();
    const checks = await Promise.all(
      tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
        return {
          table,
          ok: !error,
          count: count ?? null,
          error: error ? formatApiError(error, "Table check failed.") : null
        };
      })
    );

    return NextResponse.json({ checks });
  } catch (error) {
    return NextResponse.json({ error: formatApiError(error, "Unable to check database.") }, { status: 500 });
  }
}
