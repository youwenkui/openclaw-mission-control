"use client";

import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatRelativeTime } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/types";

const statCards = [
  {
    key: "activeSessions",
    label: "活跃会话",
    icon: CheckCircle2,
  },
  {
    key: "runningTasks",
    label: "运行中任务",
    icon: Clock3,
  },
  {
    key: "blockedTasks",
    label: "阻塞任务",
    icon: ShieldAlert,
  },
  {
    key: "failedTasks",
    label: "失败任务",
    icon: XCircle,
  },
] as const;

export function OverviewView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { openDrawer, setView } = useDashboardStore();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel>
          <PanelHeader
            title="系统总览"
            subtitle="基于当前 OpenClaw 真实数据面的核心运行指标"
          />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const value = snapshot.overview[card.key];
              return (
                <div key={card.key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-500">{card.label}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-100">{value}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="网关健康" subtitle="实时链路、快照轮询与各数据面的可用性" />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  snapshot.health.status === "healthy"
                    ? "success"
                    : snapshot.health.status === "degraded"
                      ? "warning"
                      : "danger"
                }
              >
                {snapshot.health.status === "healthy"
                  ? "健康"
                  : snapshot.health.status === "degraded"
                    ? "降级"
                    : "离线"}
              </Badge>
              <span className="text-sm text-slate-300">{snapshot.health.gatewayUrl}</span>
            </div>
            <p className="text-sm text-slate-400">{snapshot.health.message || "暂无状态说明。"}</p>
            <div className="space-y-2">
              {snapshot.sources.map((source) => (
                <div key={source.key} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2">
                  <div>
                    <div className="text-sm text-slate-200">{source.label}</div>
                    <div className="text-xs text-slate-500">
                      {source.available
                        ? `最近成功于 ${formatRelativeTime(source.lastSuccessAt)}`
                        : source.error || "当前不可用"}
                    </div>
                  </div>
                  <Badge tone={source.available ? "success" : "warning"}>{source.available ? "正常" : "降级"}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="近期事件" subtitle="失败、断连、审批与其他运维信号" />
          <div className="divide-y divide-slate-900/70">
            {snapshot.incidents.slice(0, 8).map((incident) => (
              <button
                key={incident.id}
                onClick={() => {
                  if (incident.relatedId) {
                    const type =
                      incident.type.includes("approval")
                        ? "approval"
                        : incident.type.includes("cron")
                          ? "cron"
                          : "mission";
                    openDrawer({ type: type as "approval" | "cron" | "mission", id: incident.relatedId });
                  } else {
                    setView("events");
                  }
                }}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-900/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-100">{incident.title}</span>
                    <Badge
                      tone={
                        incident.severity === "critical"
                          ? "danger"
                          : incident.severity === "error"
                            ? "danger"
                            : incident.severity === "warning"
                              ? "warning"
                              : "info"
                      }
                    >
                      {incident.severity === "critical"
                        ? "严重"
                        : incident.severity === "error"
                          ? "错误"
                          : incident.severity === "warning"
                            ? "警告"
                            : "信息"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{incident.description}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500">{formatRelativeTime(incident.occurredAt)}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="运维队列" subtitle="通常最需要人工介入的事项入口" />
          <div className="space-y-3 p-4">
            <button
              onClick={() => setView("approvals")}
              className="flex w-full items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-left hover:bg-amber-500/10"
            >
              <div>
                <div className="text-sm font-medium text-amber-100">待处理审批</div>
                <div className="mt-1 text-xs text-slate-400">
                  {snapshot.overview.pendingExecApprovals} 个执行审批 • {snapshot.overview.pendingPluginApprovals} 个插件审批
                </div>
              </div>
              <ShieldAlert className="h-4 w-4 text-amber-300" />
            </button>
            <button
              onClick={() => setView("missions")}
              className="flex w-full items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-3 text-left hover:bg-red-500/10"
            >
              <div>
                <div className="text-sm font-medium text-red-100">失败或阻塞的任务</div>
                <div className="mt-1 text-xs text-slate-400">
                  {snapshot.overview.failedTasks} 个失败 • {snapshot.overview.blockedTasks} 个阻塞
                </div>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-300" />
            </button>
            <button
              onClick={() => setView("cron")}
              className="flex w-full items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-3 text-left hover:bg-sky-500/10"
            >
              <div>
                <div className="text-sm font-medium text-sky-100">Cron 中心</div>
                <div className="mt-1 text-xs text-slate-400">
                  {snapshot.overview.cronFailing} 个异常 • 下次到期 {formatRelativeTime(snapshot.overview.nextDueAt)}
                </div>
              </div>
              <Clock3 className="h-4 w-4 text-sky-300" />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
