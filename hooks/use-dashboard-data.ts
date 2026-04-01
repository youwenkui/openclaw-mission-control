"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardSnapshot } from "@/lib/types";

export function useDashboardData(initialData: DashboardSnapshot) {
  return useQuery({
    queryKey: ["dashboard-snapshot"],
    queryFn: async () => {
      const response = await fetch("/api/snapshot", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load snapshot");
      return (await response.json()) as DashboardSnapshot;
    },
    initialData,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });
}
