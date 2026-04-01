import { compactText } from "@/lib/utils";
import type {
  ApprovalItem,
  CronJob,
  CronRun,
  GatewayHealth,
  IncidentEvent,
  Mission,
  SessionSummary,
  SourceStatus,
} from "@/lib/types";

import { inferMissionStatus, inferSessionState, isStale, missionFromSession } from "@/lib/openclaw/heuristics";

type GatewayResult = Record<string, unknown>;

function asArray<T = GatewayResult>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): GatewayResult {
  return value && typeof value === "object" ? (value as GatewayResult) : {};
}

function pickString(obj: GatewayResult, keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function pickNumber(obj: GatewayResult, keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function pickTimestamp(obj: GatewayResult, keys: string[]) {
  const stringValue = pickString(obj, keys);
  if (stringValue) return stringValue;

  const numericValue = pickNumber(obj, keys);
  if (numericValue !== undefined) {
    return new Date(numericValue).toISOString();
  }

  return undefined;
}

function formatSchedule(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (!value || typeof value !== "object") return "未知";

  const record = value as GatewayResult;
  if (record.kind === "cron" && typeof record.expr === "string") {
    return typeof record.tz === "string" ? `${record.expr} (${record.tz})` : record.expr;
  }
  if (record.kind === "every" && typeof record.everyMs === "number") {
    const minutes = Math.round(record.everyMs / 60000);
    if (minutes % 1440 === 0) return `every ${minutes / 1440}d`;
    if (minutes % 60 === 0) return `every ${minutes / 60}h`;
    return `every ${minutes}m`;
  }

  return "未知";
}

function parseSessionKey(key?: string) {
  if (!key) {
    return {
      agentId: undefined,
      label: undefined,
      channel: undefined,
      source: undefined,
      activity: undefined,
    };
  }

  const parts = key.split(":");
  const agentId = parts[1];
  const channel = parts[2] || "unknown";
  const source =
    channel === "cron"
      ? "cron"
      : key.includes(":subagent:")
        ? "subagent"
        : key.includes(":group:")
          ? "group"
          : "session";

  return {
    agentId,
    label: key.replace(/^agent:/, ""),
    channel,
    source,
    activity:
      source === "cron"
        ? `Cron 会话 ${parts[3] || ""}`.trim()
        : source === "subagent"
          ? `子 Agent ${parts[3] || ""}`.trim()
          : `会话 ${channel}`,
  };
}

export function normalizeSessions(raw: unknown, approvals: ApprovalItem[] = []): SessionSummary[] {
  const items = asArray<GatewayResult>(asRecord(raw).sessions ?? raw);

  return items.map((entry, index) => {
    const parsedKey = parseSessionKey(pickString(entry, ["key", "sessionKey"]));
    const id = pickString(entry, ["sessionId", "sessionKey", "key", "id"]) || `session_${index}`;
    const agentName = pickString(entry, ["agentName", "agentId"]) || parsedKey.agentId || "未知";
    const activityAt = pickTimestamp(entry, ["lastMessageAt", "lastToolAt", "updatedAt", "lastActivityAt"]);
    const displayName = pickString(entry, ["displayName", "label", "title", "name"]) || parsedKey.label || id;
    const session: SessionSummary = {
      id,
      label: displayName,
      agentName,
      channel: pickString(entry, ["channel", "source"]) || parsedKey.channel || "unknown",
      source: pickString(entry, ["source", "channel"]) || parsedKey.source || "session",
      model: pickString(entry, ["model", "modelName"]),
      lastMessageAt: pickTimestamp(entry, ["lastMessageAt", "updatedAt", "lastActivityAt"]),
      lastToolAt: pickTimestamp(entry, ["lastToolAt", "updatedAt"]),
      currentActivity:
        pickString(entry, ["currentActivity", "activity", "statusSummary"]) ||
        parsedKey.activity ||
        displayName ||
        "暂无近期摘要",
      state: "idle",
      recentErrors: Boolean(entry.recentErrors || entry.error || entry.lastError),
      stale: isStale(activityAt, 60 * 60 * 1000),
      preview:
        pickString(entry, ["lastPreview", "preview", "summary"]) ||
        `${agentName} • ${parsedKey.channel || "未知"} • ${pickString(entry, ["kind"]) || "会话"}`,
      raw: entry,
    };

    session.state = inferSessionState(session, approvals);
    return session;
  });
}

export function normalizeApprovals(execRaw: unknown, pluginRaw: unknown): ApprovalItem[] {
  const execItems = asArray<GatewayResult>(asRecord(execRaw).items ?? asRecord(execRaw).approvals ?? execRaw).map((entry, index) => ({
    id: pickString(entry, ["id", "approvalId"]) || `exec_${index}`,
    kind: "exec" as const,
    requester: pickString(entry, ["agentName", "agentId", "requester"]) || "未知",
    sessionId: pickString(entry, ["sessionId", "sessionKey"]),
    agentId: pickString(entry, ["agentId"]),
    action: pickString(entry, ["command", "action", "title"]) || "执行审批",
    host: pickString(entry, ["host", "node", "nodeId"]),
    riskSummary:
      pickString(entry, ["riskSummary", "summary", "reason"]) ||
      "命令执行需要人工审批",
    waitingSince: pickString(entry, ["createdAt", "requestedAt"]),
    waitingMs: pickString(entry, ["createdAt", "requestedAt"])
      ? Date.now() - new Date(pickString(entry, ["createdAt", "requestedAt"]) as string).getTime()
      : undefined,
    raw: entry,
  }));

  const pluginItems = asArray<GatewayResult>(asRecord(pluginRaw).items ?? asRecord(pluginRaw).approvals ?? pluginRaw).map((entry, index) => ({
    id: pickString(entry, ["id", "approvalId"]) || `plugin_${index}`,
    kind: "plugin" as const,
    requester: pickString(entry, ["agentName", "agentId", "requester"]) || "未知",
    sessionId: pickString(entry, ["sessionId", "sessionKey"]),
    agentId: pickString(entry, ["agentId"]),
    action:
      pickString(entry, ["tool", "action", "title"]) ||
      `${pickString(entry, ["plugin", "pluginName"]) || "插件"} 请求`,
    host: pickString(entry, ["host", "node", "nodeId"]),
    riskSummary:
      pickString(entry, ["riskSummary", "summary", "reason"]) ||
      "插件动作需要人工审批",
    waitingSince: pickString(entry, ["createdAt", "requestedAt"]),
    waitingMs: pickString(entry, ["createdAt", "requestedAt"])
      ? Date.now() - new Date(pickString(entry, ["createdAt", "requestedAt"]) as string).getTime()
      : undefined,
    raw: entry,
  }));

  return [...execItems, ...pluginItems].sort((left, right) => (right.waitingMs || 0) - (left.waitingMs || 0));
}

export function normalizeCronRuns(raw: unknown): CronRun[] {
  return asArray<GatewayResult>(asRecord(raw).runs ?? raw).map((entry, index) => ({
    id: pickString(entry, ["id", "runId"]) || `run_${index}`,
    status: compactText(entry.status, "未知"),
    startedAt: pickString(entry, ["startedAt", "createdAt"]),
    finishedAt: pickString(entry, ["finishedAt", "completedAt"]),
    error: pickString(entry, ["error", "lastError", "reason"]),
    raw: entry,
  }));
}

export function normalizeCronJobs(raw: unknown, runsRaw: unknown): CronJob[] {
  const runs = normalizeCronRuns(runsRaw);
  const runGroups = new Map<string, CronRun[]>();

  for (const run of runs) {
    const key =
      (run.raw as GatewayResult).jobId?.toString() ||
      (run.raw as GatewayResult).cronId?.toString() ||
      (run.raw as GatewayResult).id?.toString();
    if (!key) continue;
    const existing = runGroups.get(key) || [];
    existing.push(run);
    runGroups.set(key, existing);
  }

  return asArray<GatewayResult>(asRecord(raw).jobs ?? raw).map((entry, index) => {
    const state = asRecord(entry.state);
    const id = pickString(entry, ["id", "jobId"]) || `cron_${index}`;
    const linkedRuns = runGroups.get(id) || [];
    const lastRun = linkedRuns[0];
    const consecutiveFailures = Number(
      state.consecutiveErrors || entry.consecutiveFailures || entry.failureCount || 0,
    );
    const lastStatus = compactText(state.lastStatus || state.lastRunStatus || entry.lastStatus || lastRun?.status, "未知");

    return {
      id,
      title: pickString(entry, ["title", "name", "label"]) || id,
      schedule: formatSchedule(entry.schedule || entry.cron),
      nextRunAt: pickTimestamp(state, ["nextRunAt", "nextRunAtMs"]) || pickTimestamp(entry, ["nextRunAt", "next"]),
      lastRunAt: pickTimestamp(state, ["lastRunAt", "lastRunAtMs"]) || pickTimestamp(entry, ["lastRunAt"]) || lastRun?.startedAt,
      lastStatus,
      consecutiveFailures,
      linkedTarget: pickString(entry, ["sessionKey", "agentName", "agentId", "sessionId"]),
      failing:
        lastStatus.toLowerCase().includes("error") ||
        lastStatus.toLowerCase().includes("failed") ||
        consecutiveFailures > 0,
      runs: linkedRuns.slice(0, 10),
      raw: entry,
    };
  });
}

export function normalizeMissions(flowsRaw: unknown, sessions: SessionSummary[], approvals: ApprovalItem[]): Mission[] {
  const sessionMissions = sessions.map((session) => missionFromSession(session)).filter(Boolean) as Mission[];

  const flowItems = asArray<GatewayResult>(asRecord(flowsRaw).flows ?? asRecord(flowsRaw).items ?? flowsRaw).map((entry, index) => {
    const id = pickString(entry, ["id", "flowId"]) || `flow_${index}`;
    const sessionId = pickString(entry, ["sessionId", "sessionKey"]);
    const approvalPending = approvals.some((item) => item.sessionId === sessionId);
    const status = inferMissionStatus({
      terminal: Boolean(entry.completedAt || entry.terminal),
      failed: Boolean(entry.error || entry.failedAt),
      approvalPending,
      blocked: compactText(entry.status, "").toLowerCase().includes("blocked"),
      lastEventAt: pickString(entry, ["updatedAt", "lastEventAt", "startedAt"]),
    });

    const startedAt = pickString(entry, ["startedAt", "createdAt"]);
    return {
      id,
      title: pickString(entry, ["title", "label", "name"]) || id,
      status,
      source: (pickString(entry, ["source"]) as Mission["source"]) || "flow",
      startedAt,
      elapsedMs: startedAt ? Date.now() - new Date(startedAt).getTime() : undefined,
      lastEventAt: pickString(entry, ["updatedAt", "lastEventAt"]),
      lastReason: pickString(entry, ["error", "reason", "summary", "statusReason"]),
      childCount: Number(entry.childCount || 0),
      parentLabel: pickString(entry, ["parentLabel", "agentId", "sessionId"]),
      sessionId,
      agentId: pickString(entry, ["agentId"]),
      stale: isStale(pickString(entry, ["updatedAt", "lastEventAt"]), 45_000),
      raw: entry,
    } satisfies Mission;
  });

  const deduped = new Map<string, Mission>();
  [...flowItems, ...sessionMissions].forEach((mission) => {
    if (!deduped.has(mission.id)) deduped.set(mission.id, mission);
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = left.lastEventAt ? new Date(left.lastEventAt).getTime() : 0;
    const rightTime = right.lastEventAt ? new Date(right.lastEventAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function normalizeIncidents(input: {
  sessions: SessionSummary[];
  approvals: ApprovalItem[];
  cronJobs: CronJob[];
  missions: Mission[];
  events: IncidentEvent[];
  health: GatewayHealth;
}): IncidentEvent[] {
  const derived: IncidentEvent[] = [];

  for (const approval of input.approvals) {
    derived.push({
      id: `approval_${approval.id}`,
      type: `${approval.kind}.approval.requested`,
      title: `${approval.kind === "exec" ? "执行" : "插件"}审批请求`,
      description: `${approval.requester} 请求执行 ${approval.action}`,
      severity: approval.kind === "exec" ? "warning" : "info",
      occurredAt: approval.waitingSince || new Date().toISOString(),
      source: "gateway",
      relatedId: approval.id,
      raw: approval.raw,
    });
  }

  for (const cron of input.cronJobs.filter((job) => job.failing)) {
    derived.push({
      id: `cron_${cron.id}`,
      type: "cron.run.failed",
      title: "Cron 失败",
      description: `${cron.title} 正在失败（已连续失败 ${cron.consecutiveFailures} 次）`,
      severity: cron.consecutiveFailures >= 3 ? "critical" : "error",
      occurredAt: cron.lastRunAt || new Date().toISOString(),
      source: "cron",
      relatedId: cron.id,
      raw: cron.raw,
    });
  }

  for (const mission of input.missions.filter((item) => item.status === "failed" || item.status === "orphaned")) {
    derived.push({
      id: `mission_${mission.id}`,
      type: `mission.${mission.status}`,
      title: mission.status === "failed" ? "任务失败" : "任务孤儿化",
      description: `${mission.title}: ${mission.lastReason || "需要运维关注"}`,
      severity: mission.status === "failed" ? "error" : "warning",
      occurredAt: mission.lastEventAt || mission.startedAt || new Date().toISOString(),
      source: mission.source,
      relatedId: mission.id,
      raw: mission.raw,
    });
  }

  if (!input.health.connected) {
    derived.push({
      id: "gateway_offline",
      type: "gateway.health",
      title: "网关不可用",
      description: input.health.message || "当前无法访问 Gateway RPC。",
      severity: input.health.mode === "mock" ? "warning" : "critical",
      occurredAt: input.health.lastSnapshotAt,
      source: "gateway",
      raw: input.health,
    });
  }

  return [...input.events, ...derived]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 100);
}

export function buildGatewayHealth(input: {
  gatewayUrl: string;
  live: boolean;
  mode: "live" | "mock";
  identity?: unknown;
  health?: unknown;
  sources: SourceStatus[];
  essentialSourceKeys?: string[];
  lastEventAt?: string;
  error?: string;
}): GatewayHealth {
  const essentialKeys = new Set(input.essentialSourceKeys || input.sources.map((source) => source.key));
  const degraded = input.sources.some((source) => essentialKeys.has(source.key) && !source.available);
  return {
    status: input.live ? (degraded ? "degraded" : "healthy") : "offline",
    mode: input.mode,
    connected: input.live,
    gatewayUrl: input.gatewayUrl,
    identity: compactText(asRecord(input.identity).id || asRecord(input.identity).name, undefined),
    message: input.error || compactText(asRecord(input.health).message, input.live ? "已连接" : "已断开"),
    lastEventAt: input.lastEventAt,
    lastSnapshotAt: new Date().toISOString(),
    stale: !input.live,
    sources: input.sources,
  };
}
