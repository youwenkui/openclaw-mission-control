"use client";

import { create } from "zustand";

import type { DrawerPayload } from "@/lib/types";

export type DashboardView =
  | "overview"
  | "missions"
  | "sessions"
  | "approvals"
  | "cron"
  | "events";

type DashboardState = {
  view: DashboardView;
  drawer: DrawerPayload;
  missionQuery: string;
  missionStatus: string;
  sessionQuery: string;
  approvalQuery: string;
  cronFailingOnly: boolean;
  eventQuery: string;
  setView: (view: DashboardView) => void;
  openDrawer: (drawer: DrawerPayload) => void;
  closeDrawer: () => void;
  setMissionQuery: (value: string) => void;
  setMissionStatus: (value: string) => void;
  setSessionQuery: (value: string) => void;
  setApprovalQuery: (value: string) => void;
  setCronFailingOnly: (value: boolean) => void;
  setEventQuery: (value: string) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  view: "overview",
  drawer: null,
  missionQuery: "",
  missionStatus: "all",
  sessionQuery: "",
  approvalQuery: "",
  cronFailingOnly: false,
  eventQuery: "",
  setView: (view) => set({ view }),
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null }),
  setMissionQuery: (missionQuery) => set({ missionQuery }),
  setMissionStatus: (missionStatus) => set({ missionStatus }),
  setSessionQuery: (sessionQuery) => set({ sessionQuery }),
  setApprovalQuery: (approvalQuery) => set({ approvalQuery }),
  setCronFailingOnly: (cronFailingOnly) => set({ cronFailingOnly }),
  setEventQuery: (eventQuery) => set({ eventQuery }),
}));
