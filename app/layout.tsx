import "./globals.css";

import type { Metadata } from "next";
import { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "OpenClaw 任务控制台",
  description: "面向 OpenClaw 的本地优先运维控制台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
