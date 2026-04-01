export type SourceStatus = {
  key: string;
  label: string;
  available: boolean;
  stale: boolean;
  lastSuccessAt?: string;
  error?: string;
};

export type GatewayHealth = {
  status: "healthy" | "degraded" | "offline";
  mode: "live" | "mock";
  connected: boolean;
  gatewayUrl: string;
  identity?: string;
  message?: string;
  latencyMs?: number;
  lastEventAt?: string;
  lastSnapshotAt: string;
  stale: boolean;
  sources: SourceStatus[];
};

export type MissionStatus = "running" | "blocked" | "completed" | "failed" | "orphaned";

export type Mission = {
  id: string;
  title: string;
  status: MissionStatus;
  source: "cron" | "subagent" | "background" | "acp" | "session" | "flow";
  startedAt?: string;
  elapsedMs?: number;
  lastEventAt?: string;
  lastReason?: string;
  childCount?: number;
  parentLabel?: string;
  sessionId?: string;
  agentId?: string;
  stale: boolean;
  raw: unknown;
};

export type SessionSummary = {
  id: string;
  label: string;
  agentName: string;
  channel: string;
  source: string;
  model?: string;
  lastMessageAt?: string;
  lastToolAt?: string;
  currentActivity: string;
  state: "idle" | "active" | "blocked";
  recentErrors: boolean;
  stale: boolean;
  preview?: string;
  raw: unknown;
};

export type ApprovalKind = "exec" | "plugin";

export type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  requester: string;
  sessionId?: string;
  agentId?: string;
  action: string;
  host?: string;
  riskSummary: string;
  waitingSince?: string;
  waitingMs?: number;
  raw: unknown;
};

export type CronRun = {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  raw: unknown;
};

export type CronJob = {
  id: string;
  title: string;
  schedule: string;
  nextRunAt?: string;
  lastRunAt?: string;
  lastStatus: string;
  consecutiveFailures: number;
  linkedTarget?: string;
  failing: boolean;
  runs: CronRun[];
  raw: unknown;
};

export type IncidentSeverity = "info" | "warning" | "error" | "critical";

export type IncidentEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  occurredAt: string;
  source: string;
  relatedId?: string;
  raw: unknown;
};

export type OverviewStats = {
  activeSessions: number;
  runningTasks: number;
  blockedTasks: number;
  failedTasks: number;
  pendingExecApprovals: number;
  pendingPluginApprovals: number;
  cronTotal: number;
  cronFailing: number;
  nextDueAt?: string;
};

export type DrawerPayload =
  | { type: "mission"; id: string }
  | { type: "session"; id: string }
  | { type: "approval"; id: string }
  | { type: "cron"; id: string }
  | null;

export type DashboardSnapshot = {
  generatedAt: string;
  health: GatewayHealth;
  overview: OverviewStats;
  missions: Mission[];
  sessions: SessionSummary[];
  approvals: ApprovalItem[];
  cronJobs: CronJob[];
  incidents: IncidentEvent[];
  sources: SourceStatus[];
};

export type ActionResult = {
  ok: boolean;
  message: string;
  raw?: unknown;
};
