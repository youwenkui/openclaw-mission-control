import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { resolveApproval } from "@/lib/openclaw/service";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1),
  kind: z.enum(["exec", "plugin"]),
  decision: z.enum(["approve_once", "approve_always", "deny"]),
});

export async function POST(request: NextRequest) {
  const input = schema.parse(await request.json());
  const result = await resolveApproval(input);
  return NextResponse.json(result);
}
