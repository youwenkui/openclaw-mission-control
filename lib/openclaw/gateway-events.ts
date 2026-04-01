import WebSocket from "ws";

import { getConfig } from "@/lib/config";
import type { IncidentEvent } from "@/lib/types";

type BridgeState = {
  status: "idle" | "connecting" | "connected" | "degraded";
  mode: "live" | "polling";
  lastError?: string;
  lastEventAt?: string;
};

type Listener = (event: IncidentEvent | { type: string; occurredAt: string; payload: unknown }) => void;

class GatewayEventBridge {
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private started = false;
  private reconnectTimer?: NodeJS.Timeout;
  state: BridgeState = {
    status: "idle",
    mode: "polling",
  };

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: IncidentEvent | { type: string; occurredAt: string; payload: unknown }) {
    if ("severity" in event) {
      this.state.lastEventAt = event.occurredAt;
    }
    this.listeners.forEach((listener) => listener(event));
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  private connect() {
    const config = getConfig();
    this.state.status = "connecting";

    try {
      this.ws = new WebSocket(config.gatewayUrl, {
        headers: config.gatewayToken ? { Authorization: `Bearer ${config.gatewayToken}` } : undefined,
      });
    } catch (error) {
      this.fail(error);
      return;
    }

    this.ws.on("open", () => {
      this.state = {
        ...this.state,
        status: "connected",
        mode: "live",
        lastError: undefined,
      };

      this.emit({
        type: "gateway.connected",
        occurredAt: new Date().toISOString(),
        payload: { url: config.gatewayUrl },
      });
    });

    this.ws.on("message", (buffer) => {
      const text = buffer.toString();
      try {
        const message = JSON.parse(text) as {
          method?: string;
          params?: Record<string, unknown>;
          event?: string;
        };

        const method = message.method || message.event;
        if (!method) return;

        this.emit({
          id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
          type: method,
          title: method,
          description: JSON.stringify(message.params || {}, null, 2).slice(0, 220),
          severity: this.toSeverity(method),
          occurredAt: new Date().toISOString(),
          source: "gateway",
          raw: message,
        });
      } catch {
        this.emit({
          type: "gateway.message.unparsed",
          occurredAt: new Date().toISOString(),
          payload: { text: text.slice(0, 500) },
        });
      }
    });

    this.ws.on("close", () => {
      this.state = {
        ...this.state,
        status: "degraded",
        mode: "polling",
        lastError: "WebSocket disconnected",
      };

      this.emit({
        type: "gateway.disconnected",
        occurredAt: new Date().toISOString(),
        payload: { reason: "socket closed" },
      });

      this.scheduleReconnect();
    });

    this.ws.on("error", (error) => this.fail(error));
  }

  private fail(error: unknown) {
    this.state = {
      status: "degraded",
      mode: "polling",
      lastError: error instanceof Error ? error.message : String(error),
      lastEventAt: this.state.lastEventAt,
    };

    this.emit({
      type: "gateway.error",
      occurredAt: new Date().toISOString(),
      payload: { error: this.state.lastError },
    });

    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 5000);
  }

  private toSeverity(type: string): IncidentEvent["severity"] {
    if (type.includes("shutdown")) return "critical";
    if (type.includes("resolved")) return "info";
    if (type.includes("requested")) return "warning";
    if (type.includes("health")) return "warning";
    if (type.includes("error") || type.includes("failed")) return "error";
    return "info";
  }
}

let singleton: GatewayEventBridge | undefined;

export function getEventBridge() {
  if (!singleton) singleton = new GatewayEventBridge();
  return singleton;
}
