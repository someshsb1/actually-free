import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: summarizeEnvValue(supabaseUrl),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: summarizeEnvValue(anonKey),
    SUPABASE_SERVICE_ROLE_KEY: summarizeEnvValue(serviceRoleKey),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"
  });
}

function summarizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();

  return {
    present: Boolean(trimmed),
    length: trimmed?.length ?? 0,
    startsWith: trimmed ? trimmed.slice(0, 8) : null,
    endsWith: trimmed ? trimmed.slice(-6) : null
  };
}
