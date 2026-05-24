import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("shops")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    return NextResponse.json({
      status: error ? "error" : "ok",
      timestamp: new Date().toISOString(),
      db: error ? "disconnected" : "connected",
      error: error?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        db: "disconnected",
        error: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}
