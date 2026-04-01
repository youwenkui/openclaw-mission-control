"use client";

import { useEffect } from "react";

import type { IncidentEvent } from "@/lib/types";

export function useRealtimeEvents(onEvent: (event: IncidentEvent) => void) {
  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as IncidentEvent;
        if ("severity" in event) onEvent(event);
      } catch {
        // Ignore malformed event frames.
      }
    };

    return () => source.close();
  }, [onEvent]);
}
