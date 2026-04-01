import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(value?: string | number | null): string {
  if (!value) return "从未";
  const time = typeof value === "number" ? value : new Date(value).getTime();
  if (Number.isNaN(time)) return "未知";

  const diff = Date.now() - time;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "前" : "后";

  if (abs < 5_000) return "刚刚";
  if (abs < 60_000) return `${Math.round(abs / 1000)} 秒${suffix}`;
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)} 分钟${suffix}`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)} 小时${suffix}`;
  return `${Math.round(abs / 86_400_000)} 天${suffix}`;
}

export function formatDuration(ms?: number | null) {
  if (!ms || ms < 0) return "0 秒";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  if (minutes > 0) return `${minutes} 分钟 ${seconds} 秒`;
  return `${seconds} 秒`;
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function extractJsonPayload<T>(output: string): T | null {
  const trimmed = output.trim();
  if (!trimmed) return null;

  const lines = trimmed.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const slice = lines.slice(index).join("\n").trim();
    const parsed = safeJsonParse<T>(slice);
    if (parsed) return parsed;
  }

  return null;
}

export function compactText(value: unknown, fallback = "不可用") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function searchMatch(haystack: Array<string | undefined | null>, query: string) {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  return haystack.some((entry) => entry?.toLowerCase().includes(normalized));
}
