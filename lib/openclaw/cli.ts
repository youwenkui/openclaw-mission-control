import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getConfig } from "@/lib/config";
import { extractJsonPayload } from "@/lib/utils";

const execFileAsync = promisify(execFile);

export async function runOpenClawCommand(args: string[], timeout = 15_000) {
  const config = getConfig();

  try {
    const result = await execFileAsync(config.cliPath, ["--no-color", ...args], {
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        ...(config.gatewayToken ? { OPENCLAW_GATEWAY_TOKEN: config.gatewayToken } : {}),
      },
    });

    return {
      ok: true as const,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    const typed = error as { stdout?: string; stderr?: string; message: string };
    return {
      ok: false as const,
      stdout: typed.stdout?.trim() || "",
      stderr: typed.stderr?.trim() || typed.message,
    };
  }
}

export async function runGatewayCall<T>(method: string, params: Record<string, unknown> = {}) {
  const result = await runOpenClawCommand(["gateway", "call", method, "--params", JSON.stringify(params)]);

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.stderr || result.stdout || `Gateway call failed: ${method}`,
    };
  }

  const payload = extractJsonPayload<T>(result.stdout);
  if (!payload) {
    return {
      ok: false as const,
      error: `Could not parse JSON payload for ${method}`,
    };
  }

  return {
    ok: true as const,
    data: payload,
  };
}

export async function runJsonCli<T>(args: string[]) {
  const result = await runOpenClawCommand(args);

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.stderr || result.stdout || `Command failed: ${args.join(" ")}`,
    };
  }

  const payload = extractJsonPayload<T>(result.stdout);
  if (!payload) {
    return {
      ok: false as const,
      error: `Could not parse JSON for ${args.join(" ")}`,
    };
  }

  return {
    ok: true as const,
    data: payload,
  };
}
