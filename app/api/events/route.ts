import { NextRequest } from "next/server";

import { getEventBridge } from "@/lib/openclaw/gateway-events";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const bridge = getEventBridge();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({
        type: "system.connected",
        occurredAt: new Date().toISOString(),
        payload: {
          mode: bridge.state.mode,
          status: bridge.state.status,
          lastError: bridge.state.lastError,
        },
      });

      const unsubscribe = bridge.subscribe((event) => send(event));
      const interval = setInterval(() => {
        send({
          type: "system.heartbeat",
          occurredAt: new Date().toISOString(),
          payload: bridge.state,
        });
      }, 15000);

      bridge.start();

      return () => {
        closed = true;
        unsubscribe();
        clearInterval(interval);
      };
    },
    cancel() {
      return undefined;
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    },
  });
}
