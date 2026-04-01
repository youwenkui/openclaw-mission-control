import type { ApprovalItem, Mission, MissionStatus, SessionSummary } from "@/lib/types";

const BLOCKED_PROGRESS_THRESHOLD_MS = 10 * 60 * 1000;
const ORPHANED_THRESHOLD_MS = 45 * 60 * 1000;
const ACTIVE_SESSION_THRESHOLD_MS = 60 * 60 * 1000;

export function inferMissionStatus(input: {
  terminal?: boolean;
  failed?: boolean;
  approvalPending?: boolean;
  blocked?: boolean;
  lastEventAt?: string;
}): MissionStatus {
  const lastEventAtMs = input.lastEventAt ? new Date(input.lastEventAt).getTime() : undefined;
  const ageMs = lastEventAtMs ? Date.now() - lastEventAtMs : undefined;

  if (input.failed) return "failed";
  if (input.terminal) return "completed";
  if (input.approvalPending || input.blocked) return "blocked";
  if (ageMs && ageMs > ORPHANED_THRESHOLD_MS) return "orphaned";
  if (ageMs && ageMs > BLOCKED_PROGRESS_THRESHOLD_MS) return "blocked";
  return "running";
}

export function inferSessionState(
  session: Pick<SessionSummary, "lastMessageAt" | "lastToolAt" | "recentErrors">,
  approvals: ApprovalItem[],
) {
  const lastActivityMs = [session.lastMessageAt, session.lastToolAt]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .sort((a, b) => b - a)[0];

  const blockedByApproval = approvals.some((item) => item.sessionId && item.sessionId === (session as SessionSummary).id);

  if (blockedByApproval) return "blocked" as const;
  if (session.recentErrors) return "blocked" as const;
  if (lastActivityMs && Date.now() - lastActivityMs < ACTIVE_SESSION_THRESHOLD_MS) return "active" as const;
  return "idle" as const;
}

export function isStale(timestamp?: string, thresholdMs = 20_000) {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > thresholdMs;
}

export function missionFromSession(session: SessionSummary): Mission | null {
  if (!session.lastMessageAt && !session.lastToolAt) return null;

  const lastEventAt = session.lastToolAt || session.lastMessageAt;
  const startedAt = session.lastMessageAt || session.lastToolAt;
  return {
    id: session.id,
    title: session.currentActivity || session.label,
    status: session.state === "blocked" ? "blocked" : session.state === "active" ? "running" : "orphaned",
    source: session.source === "cron" ? "cron" : "session",
    startedAt,
    elapsedMs: startedAt ? Date.now() - new Date(startedAt).getTime() : undefined,
    lastEventAt,
    lastReason: session.preview,
    parentLabel: `${session.agentName} / ${session.channel}`,
    sessionId: session.id,
    agentId: session.agentName,
    stale: session.stale,
    raw: session.raw,
  };
}

/**
 * These heuristics intentionally stay explicit and local because OpenClaw does
 * not yet expose a canonical global mission graph. V1 treats "running",
 * "blocked", "failed", and "orphaned" as operator-facing states inferred from:
 * recent activity, terminal status flags, visible approval gates, and staleness.
 */
