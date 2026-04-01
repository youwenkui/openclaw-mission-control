"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/table";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatRelativeTime, searchMatch } from "@/lib/utils";
import type { DashboardSnapshot, SessionSummary } from "@/lib/types";

function toneForSession(session: SessionSummary) {
  if (session.state === "active") return "success";
  if (session.state === "blocked") return "warning";
  return "neutral";
}

export function SessionRadarView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { sessionQuery, setSessionQuery, openDrawer } = useDashboardStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const sessions = useMemo(
    () =>
      snapshot.sessions.filter((session) =>
        searchMatch([session.id, session.label, session.agentName, session.channel], sessionQuery),
      ),
    [sessionQuery, snapshot.sessions],
  );

  async function sendMessage(sessionId: string) {
    const message = drafts[sessionId]?.trim();
    if (!message) return;

    await fetch("/api/control/sessions/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });

    setDrafts((current) => ({ ...current, [sessionId]: "" }));
  }

  async function abortRun(sessionId: string) {
    if (!window.confirm(`确认中止会话 ${sessionId} 的当前运行？`)) return;
    await fetch("/api/control/sessions/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  }

  return (
    <Panel>
      <PanelHeader title="会话雷达" subtitle="面向活跃、阻塞和陈旧会话的紧凑运维表格" />
      <div className="border-b border-slate-800 p-4">
        <Input
          value={sessionQuery}
          onChange={(event) => setSessionQuery(event.target.value)}
          placeholder="按会话、Agent 或渠道搜索"
          className="max-w-md"
        />
      </div>
      <DataTable
        headers={["会话", "活动", "状态", "预览", "操作"]}
        rows={sessions.map((session) => [
          <div key={`${session.id}-identity`}>
            <div className="font-medium text-slate-100">{session.label}</div>
            <div className="mt-1 font-mono text-xs text-slate-500">{session.id}</div>
            <div className="mt-1 text-xs text-slate-500">
              {session.agentName} • {session.channel} • {session.model || "模型未知"}
            </div>
          </div>,
          <div key={`${session.id}-activity`} className="space-y-1 text-xs text-slate-400">
            <div>{session.currentActivity}</div>
            <div>最近消息 {formatRelativeTime(session.lastMessageAt)}</div>
            <div>最近工具调用 {formatRelativeTime(session.lastToolAt)}</div>
          </div>,
          <div key={`${session.id}-status`} className="space-y-2">
            <Badge tone={toneForSession(session)}>
              {session.state === "active" ? "活跃" : session.state === "blocked" ? "阻塞" : "空闲"}
            </Badge>
            {session.recentErrors ? <Badge tone="danger">近期出错</Badge> : null}
            {session.stale ? <Badge tone="warning">陈旧</Badge> : null}
          </div>,
          <div key={`${session.id}-preview`} className="max-w-md space-y-2">
            <p className="text-xs text-slate-400">{session.preview || "暂无会话预览。"}</p>
            <Input
              value={drafts[session.id] || ""}
              onChange={(event) => setDrafts((current) => ({ ...current, [session.id]: event.target.value }))}
              placeholder="发送运维消息"
            />
          </div>,
          <div key={`${session.id}-actions`} className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={() => openDrawer({ type: "session", id: session.id })}>
              预览
            </Button>
            <Button size="sm" variant="default" onClick={() => void sendMessage(session.id)}>
              发送
            </Button>
            <Button size="sm" variant="danger" onClick={() => void abortRun(session.id)}>
              中止运行
            </Button>
          </div>,
        ])}
      />
    </Panel>
  );
}
