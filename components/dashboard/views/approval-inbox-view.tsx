"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/table";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatRelativeTime, searchMatch } from "@/lib/utils";
import type { DashboardSnapshot, ApprovalItem } from "@/lib/types";

export function ApprovalInboxView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { approvalQuery, setApprovalQuery, openDrawer } = useDashboardStore();

  const approvals = useMemo(
    () =>
      snapshot.approvals.filter((approval) =>
        searchMatch([approval.id, approval.requester, approval.action, approval.agentId, approval.sessionId], approvalQuery),
      ),
    [approvalQuery, snapshot.approvals],
  );

  async function resolve(approval: ApprovalItem, decision: "approve_once" | "approve_always" | "deny") {
    const approvedAction = `确认处理 ${approval.kind === "exec" ? "执行" : "插件"}审批 ${approval.id}\n\n${approval.action}\n\n决策：${
      decision === "approve_once" ? "本次批准" : decision === "approve_always" ? "始终批准" : "拒绝"
    }`;
    if (!window.confirm(approvedAction)) return;

    await fetch("/api/control/approvals/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: approval.id,
        kind: approval.kind,
        decision,
      }),
    });
  }

  return (
    <Panel>
      <PanelHeader title="审批收件箱" subtitle="集中处理执行审批与插件审批的人工作业台" />
      <div className="border-b border-slate-800 p-4">
        <Input
          value={approvalQuery}
          onChange={(event) => setApprovalQuery(event.target.value)}
          placeholder="按审批、Agent 或动作搜索"
          className="max-w-md"
        />
      </div>
      <DataTable
        headers={["审批", "请求方", "风险", "等待时长", "操作"]}
        rows={approvals.map((approval) => [
          <div key={`${approval.id}-identity`} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone={approval.kind === "exec" ? "warning" : "info"}>{approval.kind}</Badge>
              <span className="font-mono text-xs text-slate-500">{approval.id}</span>
            </div>
            <div className="text-sm text-slate-100">{approval.action}</div>
          </div>,
          <div key={`${approval.id}-requester`} className="space-y-1 text-xs text-slate-400">
            <div>{approval.requester}</div>
            <div>{approval.agentId || "未知 Agent"}</div>
            <div>{approval.sessionId || "未关联会话"}</div>
            <div>{approval.host || "无主机信息"}</div>
          </div>,
          <div key={`${approval.id}-risk`} className="max-w-sm text-xs text-slate-400">
            {approval.riskSummary}
          </div>,
          <div key={`${approval.id}-waiting`} className="text-xs text-slate-400">
            {formatRelativeTime(approval.waitingSince)}
          </div>,
          <div key={`${approval.id}-actions`} className="flex flex-col gap-2">
            <Button size="sm" variant="success" onClick={() => void resolve(approval, "approve_once")}>
              本次批准
            </Button>
            <Button size="sm" variant="outline" onClick={() => void resolve(approval, "approve_always")}>
              始终批准
            </Button>
            <Button size="sm" variant="danger" onClick={() => void resolve(approval, "deny")}>
              拒绝
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openDrawer({ type: "approval", id: approval.id })}>
              原始载荷
            </Button>
          </div>,
        ])}
      />
    </Panel>
  );
}
