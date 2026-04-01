import { NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/openclaw/service";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getDashboardSnapshot();
  return NextResponse.json(snapshot);
}
