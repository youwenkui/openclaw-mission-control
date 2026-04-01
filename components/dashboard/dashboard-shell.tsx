"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalInboxView } from "@/components/dashboard/views/approval-inbox-view";
import { CronCenterView } from "@/components/dashboard/views/cron-center-view";
import { EventFeedView } from "@/components/dashboard/views/event-feed-view";
import { MissionBoardView } from "@/components/dashboard/views/mission-board-view";
import { OverviewView } from "@/components/dashboard/views/overview-view";
import { SessionRadarView } from "@/components/dashboard/views/session-radar-view";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import { useDashboardStore, type DashboardView } from "@/stores/dashboard-store";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { DashboardSnapshot, IncidentEvent } from "@/lib/types";

const navItems: Array<{ id: DashboardView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "missions", label: "任务看板", icon: ListChecks },
  { id: "sessions", label: "会话雷达", icon: MessageSquare },
  { id: "approvals", label: "审批收件箱", icon: ShieldAlert },
  { id: "cron", label: "Cron 中心", icon: Clock3 },
  { id: "events", label: "事件流", icon: Activity },
];

export function DashboardShell({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const { data, refetch, isFetching } = useDashboardData(initialSnapshot);
  const [ephemeralEvents, setEphemeralEvents] = useState<IncidentEvent[]>([]);
  const { view, setView, drawer, closeDrawer } = useDashboardStore();

  useRealtimeEvents((event) => {
    setEphemeralEvents((current) => [event, ...current].slice(0, 30));
  });

  const snapshot = useMemo(
    () => ({
      ...data,
      incidents: [...ephemeralEvents, ...data.incidents]
        .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
        .slice(0, 120),
    }),
    [data, ephemeralEvents],
  );

  const drawerTitle =
    drawer?.type === "mission"
      ? "任务详情"
      : drawer?.type === "session"
        ? "会话预览"
        : drawer?.type === "approval"
          ? "审批详情"
          : drawer?.type === "cron"
            ? "Cron 历史"
            : "";

  const drawerBody = drawer
    ? (() => {
        const map = {
          mission: snapshot.missions.find((item) => item.id === drawer.id),
          session: snapshot.sessions.find((item) => item.id === drawer.id),
          approval: snapshot.approvals.find((item) => item.id === drawer.id),
          cron: snapshot.cronJobs.find((item) => item.id === drawer.id),
        } as const;
        return map[drawer.type];
      })()
    : null;

  return (
    <div className="min-h-screen p-4 text-slate-100 md:p-6">
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-panel lg:block">
          <div className="border-b border-slate-800 px-2 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Bot className="h-4 w-4 text-cyan-300" />
              OpenClaw 任务控制台
            </div>
            <p className="mt-1 text-xs text-slate-400">本地优先的运维控制台</p>
          </div>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                    view === item.id
                      ? "bg-cyan-400/10 text-cyan-100"
                      : "text-slate-300 hover:bg-slate-900 hover:text-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">运维控制台</h1>
                  <Badge
                    tone={
                      snapshot.health.status === "healthy"
                        ? "success"
                        : snapshot.health.status === "degraded"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {snapshot.health.mode === "mock"
                      ? "模拟模式"
                      : snapshot.health.status === "healthy"
                        ? "健康"
                        : snapshot.health.status === "degraded"
                          ? "降级"
                          : "离线"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  网关{snapshot.health.connected ? "已连接" : "已断开"} • 最近快照{" "}
                  {formatRelativeTime(snapshot.generatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {snapshot.health.sources.filter((source) => !source.available).length > 0 ? (
                  <Badge tone="warning">
                    {snapshot.health.sources.filter((source) => !source.available).length} 个数据源降级
                  </Badge>
                ) : (
                  <Badge tone="success">主要数据面全部可达</Badge>
                )}
                <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                  刷新
                </Button>
              </div>
            </div>
          </header>

          <div className="mb-4 flex gap-2 overflow-auto lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs",
                    view === item.id
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                      : "border-slate-800 bg-slate-950/70 text-slate-300",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {view === "overview" ? <OverviewView snapshot={snapshot} /> : null}
          {view === "missions" ? <MissionBoardView snapshot={snapshot} /> : null}
          {view === "sessions" ? <SessionRadarView snapshot={snapshot} /> : null}
          {view === "approvals" ? <ApprovalInboxView snapshot={snapshot} /> : null}
          {view === "cron" ? <CronCenterView snapshot={snapshot} /> : null}
          {view === "events" ? <EventFeedView snapshot={snapshot} /> : null}
        </main>
      </div>

      <Drawer open={Boolean(drawer)} onClose={closeDrawer} title={drawerTitle}>
        {drawerBody ? (
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
            {JSON.stringify(drawerBody, null, 2)}
          </pre>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <AlertTriangle className="h-4 w-4" />
            暂无可展示的详情数据。
          </div>
        )}
      </Drawer>

      <footer className="mx-auto mt-4 max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-500 shadow-panel">
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {snapshot.overview.activeSessions} 个活跃会话
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            {snapshot.overview.pendingExecApprovals + snapshot.overview.pendingPluginApprovals} 个审批待处理
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-sky-400" />
            已跟踪 {snapshot.overview.cronTotal} 个 cron 任务
          </span>
        </div>
      </footer>
    </div>
  );
}
