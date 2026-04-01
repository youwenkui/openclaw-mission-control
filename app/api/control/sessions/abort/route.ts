import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { abortSessionRun } from "@/lib/openclaw/service";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const input = schema.parse(await request.json());
  const result = await abortSessionRun(input.sessionId);
  return NextResponse.json(result);
}
