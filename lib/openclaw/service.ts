import { getConfig } from "@/lib/config";
import { getMockSnapshot } from "@/lib/mock";
import type {
  ActionResult,
  ApprovalItem,
  DashboardSnapshot,
  IncidentEvent,
  SourceStatus,
} from "@/lib/types";

import { runGatewayCall, runJsonCli, runOpenClawCommand } from "@/lib/openclaw/cli";
import { getEventBridge } from "@/lib/openclaw/gateway-events";
import {
  buildGatewayHealth,
  normalizeApprovals,
  normalizeCronJobs,
  normalizeIncidents,
  normalizeMissions,
  normalizeSessions,
} from "@/lib/openclaw/normalize";

async function safeSource<T>(
  source: { key: string; label: string },
  task: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
) {
  const startedAt = Date.now();
  const result = await task();

  if (result.ok) {
    return {
      status: {
        key: source.key,
        label: source.label,
        available: true,
        stale: false,
        lastSuccessAt: new Date().toISOString(),
      } satisfies SourceStatus,
      data: result.data,
      latencyMs: Date.now() - startedAt,
    };
  }

  return {
    status: {
      key: source.key,
      label: source.label,
      available: false,
      stale: true,
      error: result.error,
    } satisfies SourceStatus,
    data: undefined,
    latencyMs: Date.now() - startedAt,
  };
}

function isUnsupportedMethodError(error?: string) {
  if (!error) return false;
  return error.includes("unknown method") || error.includes("INVALID_REQUEST");
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const config = getConfig();
  const bridge = getEventBridge();
  bridge.start();

  const gatewayHealthCall = await safeSource({ key: "health", label: "网关健康" }, () =>
    runGatewayCall<Record<string, unknown>>("health", {}),
  );
  const identityCall = await safeSource({ key: "identity", label: "网关身份" }, () =>
    runGatewayCall<Record<string, unknown>>("gateway.identity.get", {}),
  );
  const execApprovalsCall = await safeSource({ key: "exec", label: "执行审批" }, () =>
    runGatewayCall<Record<string, unknown>>("exec.approvals.get", {}),
  );
  const pluginApprovalsCall = await safeSource({ key: "plugin", label: "插件审批" }, () =>
    runGatewayCall<Record<string, unknown>>("plugin.approvals.get", {}),
  );
  const sessionsCall = await safeSource({ key: "sessions", label: "会话" }, () =>
    runGatewayCall<Record<string, unknown>>("sessions.list", {}),
  );
  let sessionSource = sessionsCall;
  if (!sessionsCall.status.available) {
    sessionSource = await safeSource({ key: "sessions.cli", label: "会话 CLI" }, () =>
      runJsonCli<Record<string, unknown>>(["sessions", "--all-agents", "--active", "1440", "--json"]),
    );
  }
  const cronListCall = await safeSource({ key: "cron.list", label: "Cron 列表" }, () =>
    runGatewayCall<Record<string, unknown>>("cron.list", {}),
  );
  const cronRunsCall = await safeSource({ key: "cron.runs", label: "Cron 运行记录" }, () =>
    runGatewayCall<Record<string, unknown>>("cron.runs", { limit: 50 }),
  );

  let flowsCall: Awaited<ReturnType<typeof safeSource<Record<string, unknown>>>> = {
    status: {
      key: "flows",
      label: "Flows CLI",
      available: false,
      stale: true,
      error: "CLI 回退已禁用",
    } satisfies SourceStatus,
    data: undefined,
    latencyMs: 0,
  };

  if (config.enableCliFallback) {
    flowsCall = await safeSource({ key: "flows", label: "Flows CLI" }, async () => {
      const jsonResult = await runJsonCli<Record<string, unknown>>(["flows", "list", "--json"]);
      if (jsonResult.ok) return jsonResult;

      const textResult = await runOpenClawCommand(["flows", "list"], 10_000);
      if (!textResult.ok) return { ok: false, error: textResult.stderr || textResult.stdout || "flows 不可用" };
      return { ok: true, data: { text: textResult.stdout } };
    });
  }

  const approvals = normalizeApprovals(execApprovalsCall.data, pluginApprovalsCall.data);
  const sessions = normalizeSessions(sessionSource.data, approvals);
  const cronJobs = normalizeCronJobs(cronListCall.data, cronRunsCall.data);
  const missions = normalizeMissions(flowsCall.data, sessions, approvals);

  const liveSources = [
    gatewayHealthCall.status,
    identityCall.status,
    execApprovalsCall.status,
    {
      ...pluginApprovalsCall.status,
      available:
        pluginApprovalsCall.status.available || isUnsupportedMethodError(pluginApprovalsCall.status.error),
      stale: pluginApprovalsCall.status.stale && !isUnsupportedMethodError(pluginApprovalsCall.status.error),
      error: isUnsupportedMethodError(pluginApprovalsCall.status.error)
        ? "当前 OpenClaw 运行时不支持"
        : pluginApprovalsCall.status.error,
    },
    sessionSource.status,
    cronListCall.status,
    cronRunsCall.status,
    flowsCall.status,
  ];
  const essentialSourceKeys = ["identity", "exec", sessionSource.status.key, "cron.list", "cron.runs"];
  const firstEssentialError = liveSources.find(
    (source) => essentialSourceKeys.includes(source.key) && !source.available,
  )?.error;

  const connected = gatewayHealthCall.status.available || sessionSource.status.available || cronListCall.status.available;
  const liveSnapshot: DashboardSnapshot = {
    generatedAt: new Date().toISOString(),
    health: buildGatewayHealth({
      gatewayUrl: config.gatewayUrl,
      live: connected,
      mode: "live",
      identity: identityCall.data,
      health: gatewayHealthCall.data,
      sources: liveSources,
      essentialSourceKeys,
      lastEventAt: bridge.state.lastEventAt,
      error: firstEssentialError,
    }),
    overview: {
      activeSessions: sessions.filter((session) => session.state !== "idle").length,
      runningTasks: missions.filter((mission) => mission.status === "running").length,
      blockedTasks: missions.filter((mission) => mission.status === "blocked").length,
      failedTasks: missions.filter((mission) => mission.status === "failed").length,
      pendingExecApprovals: approvals.filter((item) => item.kind === "exec").length,
      pendingPluginApprovals: approvals.filter((item) => item.kind === "plugin").length,
      cronTotal: cronJobs.length,
      cronFailing: cronJobs.filter((job) => job.failing).length,
      nextDueAt: cronJobs.map((job) => job.nextRunAt).filter(Boolean).sort()[0],
    },
    missions,
    sessions,
    approvals,
    cronJobs,
    incidents: [],
    sources: liveSources,
  };

  liveSnapshot.incidents = normalizeIncidents({
    sessions,
    approvals,
    cronJobs,
    missions,
    events: [],
    health: liveSnapshot.health,
  });

  if (connected || !config.mockMode) {
    return liveSnapshot;
  }

  const mockSnapshot = getMockSnapshot();
  mockSnapshot.sources = liveSources;
  mockSnapshot.health.sources = liveSources;
  mockSnapshot.health.message = "实时 OpenClaw 数据面不可用，Mission Control 已切换到模拟模式。";
  return mockSnapshot;
}

export async function cancelFlow(id: string): Promise<ActionResult> {
  const jsonResult = await runJsonCli<Record<string, unknown>>(["flows", "cancel", id, "--json"]);
  if (jsonResult.ok) return { ok: true, message: `已取消流程 ${id}`, raw: jsonResult.data };

  const textResult = await runOpenClawCommand(["flows", "cancel", id]);
  if (!textResult.ok) return { ok: false, message: textResult.stderr || `无法取消流程 ${id}` };
  return { ok: true, message: `已取消流程 ${id}`, raw: textResult.stdout };
}

export async function runCronJob(id: string): Promise<ActionResult> {
  const result = await runGatewayCall<Record<string, unknown>>("cron.run", { id });
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: `已触发 cron 任务 ${id}`, raw: result.data };
}

export async function resolveApproval(input: {
  id: string;
  kind: ApprovalItem["kind"];
  decision: "approve_once" | "approve_always" | "deny";
}): Promise<ActionResult> {
  const method = input.kind === "exec" ? "exec.approval.resolve" : "plugin.approval.resolve";
  const decision =
    input.decision === "approve_once"
      ? "approve"
      : input.decision === "approve_always"
        ? "always"
        : "deny";
  const result = await runGatewayCall<Record<string, unknown>>(method, {
    id: input.id,
    decision,
  });
  if (!result.ok) return { ok: false, message: result.error };
  return {
    ok: true,
    message: `${input.kind === "exec" ? "执行" : "插件"}审批已${decision === "approve" ? "批准" : decision === "always" ? "设为始终批准" : "拒绝"}`,
    raw: result.data,
  };
}

export async function sendSessionMessage(input: { sessionId: string; message: string }): Promise<ActionResult> {
  const result = await runGatewayCall<Record<string, unknown>>("sessions.send", {
    sessionId: input.sessionId,
    message: input.message,
  });
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: `消息已发送到 ${input.sessionId}`, raw: result.data };
}

export async function abortSessionRun(sessionId: string): Promise<ActionResult> {
  const result = await runGatewayCall<Record<string, unknown>>("sessions.abort", {
    sessionId,
  });
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: `已请求中止 ${sessionId}`, raw: result.data };
}
