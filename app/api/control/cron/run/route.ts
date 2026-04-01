import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runCronJob } from "@/lib/openclaw/service";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const input = schema.parse(await request.json());
  const result = await runCronJob(input.id);
  return NextResponse.json(result);
}
