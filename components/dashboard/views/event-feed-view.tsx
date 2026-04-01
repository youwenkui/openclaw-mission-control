"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatRelativeTime, searchMatch } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/types";

export function EventFeedView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { eventQuery, setEventQuery } = useDashboardStore();

  const incidents = useMemo(
    () =>
      snapshot.incidents.filter((incident) =>
        searchMatch([incident.id, incident.title, incident.description, incident.type], eventQuery),
      ),
    [eventQuery, snapshot.incidents],
  );

  return (
    <Panel>
      <PanelHeader title="事件与事故流" subtitle="统一展示会话、审批、cron 运行与连接状态相关事件" />
      <div className="border-b border-slate-800 p-4">
        <Input
          value={eventQuery}
          onChange={(event) => setEventQuery(event.target.value)}
          placeholder="搜索事件流"
          className="max-w-md"
        />
      </div>
      <div className="divide-y divide-slate-900/70">
        {incidents.map((incident) => (
          <div key={incident.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
                <span className="truncate text-sm text-slate-100">{incident.title}</span>
                <span className="truncate text-xs text-slate-500">{incident.type}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{incident.description}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-500">
              <div>{formatRelativeTime(incident.occurredAt)}</div>
              <div className="mt-1">{incident.source}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
