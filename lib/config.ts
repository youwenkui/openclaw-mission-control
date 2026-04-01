export type AppConfig = {
  gatewayUrl: string;
  gatewayToken?: string;
  cliPath: string;
  pollIntervalMs: number;
  enableCliFallback: boolean;
  enableLocalCache: boolean;
  mockMode: boolean;
};

export function getConfig(): AppConfig {
  return {
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789",
    gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || undefined,
    cliPath: process.env.OPENCLAW_CLI_PATH || "openclaw",
    pollIntervalMs: Number(process.env.OPENCLAW_POLL_INTERVAL_MS || 5000),
    enableCliFallback: process.env.OPENCLAW_ENABLE_CLI_FALLBACK !== "false",
    enableLocalCache: process.env.OPENCLAW_ENABLE_LOCAL_CACHE === "true",
    mockMode: process.env.OPENCLAW_MOCK_MODE === "true",
  };
}
