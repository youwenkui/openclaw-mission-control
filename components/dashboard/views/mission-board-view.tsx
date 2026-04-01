"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/table";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatDuration, formatRelativeTime, searchMatch } from "@/lib/utils";
import type { DashboardSnapshot, Mission } from "@/lib/types";

function statusTone(status: Mission["status"]) {
  if (status === "running") return "success";
  if (status === "blocked") return "warning";
  if (status === "failed") return "danger";
  if (status === "orphaned") return "warning";
  return "info";
}

export function MissionBoardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const {
    missionQuery,
    missionStatus,
    setMissionQuery,
    setMissionStatus,
    openDrawer,
  } = useDashboardStore();

  const missions = useMemo(
    () =>
      snapshot.missions.filter(
        (mission) =>
          (missionStatus === "all" || mission.status === missionStatus) &&
          searchMatch([mission.id, mission.title, mission.agentId, mission.parentLabel], missionQuery),
      ),
    [missionQuery, missionStatus, snapshot.missions],
  );

  async function cancelMission(id: string, title: string) {
    if (!window.confirm(`确认取消流程 ${id}？\n\n${title}`)) return;

    await fetch("/api/control/flow/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <Panel>
      <PanelHeader
        title="任务看板"
        subtitle="从 flow、会话活动、审批与陈旧度启发式中推断出的任务单元"
      />
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row">
        <Input
          value={missionQuery}
          onChange={(event) => setMissionQuery(event.target.value)}
          placeholder="按 ID、标题或 Agent 搜索"
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {["all", "running", "blocked", "failed", "completed", "orphaned"].map((status) => (
            <Button
              key={status}
              variant={missionStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setMissionStatus(status)}
            >
              {status === "all"
                ? "全部"
                : status === "running"
                  ? "运行中"
                  : status === "blocked"
                    ? "阻塞"
                    : status === "failed"
                      ? "失败"
                      : status === "completed"
                        ? "已完成"
                        : "孤儿"}
            </Button>
          ))}
        </div>
      </div>
      <DataTable
        headers={["任务", "状态", "时间", "上下文", "原因", "操作"]}
        rows={missions.map((mission) => [
          <div key={`${mission.id}-main`}>
            <div className="font-medium text-slate-100">{mission.title}</div>
            <div className="mt-1 font-mono text-xs text-slate-500">{mission.id}</div>
          </div>,
          <div key={`${mission.id}-status`} className="space-y-2">
            <Badge tone={statusTone(mission.status)}>
              {mission.status === "running"
                ? "运行中"
                : mission.status === "blocked"
                  ? "阻塞"
                  : mission.status === "failed"
                    ? "失败"
                    : mission.status === "completed"
                      ? "已完成"
                      : "孤儿"}
            </Badge>
            <div className="text-xs text-slate-500">
              {mission.source === "cron"
                ? "cron"
                : mission.source === "subagent"
                  ? "子 Agent"
                  : mission.source === "background"
                    ? "后台"
                    : mission.source === "acp"
                      ? "ACP"
                      : mission.source === "session"
                        ? "会话"
                        : mission.source}
            </div>
          </div>,
          <div key={`${mission.id}-timing`} className="space-y-1 text-xs text-slate-400">
            <div>开始于 {formatRelativeTime(mission.startedAt)}</div>
            <div>已耗时 {formatDuration(mission.elapsedMs)}</div>
            <div>最近更新 {formatRelativeTime(mission.lastEventAt)}</div>
          </div>,
          <div key={`${mission.id}-context`} className="space-y-1 text-xs text-slate-400">
            <div>{mission.parentLabel || "无父级上下文"}</div>
            <div>{mission.agentId || "未知 Agent"}</div>
            <div>{mission.childCount || 0} 个子任务</div>
          </div>,
          <div key={`${mission.id}-reason`} className="max-w-sm text-xs text-slate-400">
            {mission.lastReason || "暂无运维备注"}
          </div>,
          <div key={`${mission.id}-actions`} className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openDrawer({ type: "mission", id: mission.id })}>
              详情
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!mission.id.startsWith("flow")}
              onClick={() => void cancelMission(mission.id, mission.title)}
            >
              取消
            </Button>
          </div>,
        ])}
      />
    </Panel>
  );
}
