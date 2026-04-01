"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/table";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatRelativeTime } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/types";

export function CronCenterView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { cronFailingOnly, setCronFailingOnly, openDrawer } = useDashboardStore();

  const cronJobs = useMemo(
    () => snapshot.cronJobs.filter((job) => (cronFailingOnly ? job.failing : true)),
    [cronFailingOnly, snapshot.cronJobs],
  );

  async function runNow(id: string, title: string) {
    if (!window.confirm(`确认立即运行该 cron 任务？\n\n${title}`)) return;

    await fetch("/api/control/cron/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <Panel>
      <PanelHeader
        title="Cron 中心"
        subtitle="调度计划、近期状态、运行历史与人工触发执行"
        action={
          <Button size="sm" variant={cronFailingOnly ? "default" : "outline"} onClick={() => setCronFailingOnly(!cronFailingOnly)}>
            {cronFailingOnly ? "仅显示异常" : "筛选异常"}
          </Button>
        }
      />
      <DataTable
        headers={["任务", "调度", "状态", "关联", "操作"]}
        rows={cronJobs.map((job) => [
          <div key={`${job.id}-job`}>
            <div className="font-medium text-slate-100">{job.title}</div>
            <div className="mt-1 font-mono text-xs text-slate-500">{job.id}</div>
          </div>,
          <div key={`${job.id}-schedule`} className="space-y-1 text-xs text-slate-400">
            <div>{job.schedule}</div>
            <div>下次运行 {formatRelativeTime(job.nextRunAt)}</div>
            <div>上次运行 {formatRelativeTime(job.lastRunAt)}</div>
          </div>,
          <div key={`${job.id}-status`} className="space-y-2">
            <Badge tone={job.failing ? "danger" : job.lastStatus === "blocked" ? "warning" : "success"}>
              {job.lastStatus === "ok"
                ? "正常"
                : job.lastStatus === "blocked"
                  ? "阻塞"
                  : job.lastStatus === "error"
                    ? "错误"
                    : job.lastStatus === "failed"
                      ? "失败"
                      : job.lastStatus === "unknown"
                        ? "未知"
                        : job.lastStatus}
            </Badge>
            <div className="text-xs text-slate-500">连续失败 {job.consecutiveFailures} 次</div>
          </div>,
          <div key={`${job.id}-link`} className="text-xs text-slate-400">
            {job.linkedTarget || "无法推断"}
          </div>,
          <div key={`${job.id}-actions`} className="flex flex-col gap-2">
            <Button size="sm" variant="default" onClick={() => void runNow(job.id, job.title)}>
              立即运行
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDrawer({ type: "cron", id: job.id })}>
              运行历史
            </Button>
          </div>,
        ])}
      />
    </Panel>
  );
}
