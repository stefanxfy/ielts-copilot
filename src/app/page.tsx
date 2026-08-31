/**
 * /(仪表盘占位)— M1 步骤 5,PRD §8
 *
 * 三状态卡(DB 连接+试卷数 / config 已加载 / LLM 已配置),数据来自 /api/health;
 * 该接口同时是 M1 端到端验收面(启动脚本轮询它判就绪)。
 * 快捷入口:设置可用;题库/历史 分别待 M2/M3。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Health {
  ok: boolean;
  db: boolean;
  papers: number;
  configLoaded: boolean;
  llmConfigured: boolean;
  actualPort: number | null;
  configError?: string;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${
        ok ? "bg-green-500" : "bg-destructive"
      }`}
    />
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Health) => setHealth(d))
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 pb-16">
      <h1 className="mb-1 text-xl font-semibold">IELTS Copilot</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        本地雅思机考 · 数据全在本机
        {health?.actualPort ? ` · 端口 ${health.actualPort}` : ""}
      </p>

      {failed && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          /api/health 请求失败 —— 服务异常
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <StatusDot ok={health?.db ?? false} /> 数据库
            </CardTitle>
            <CardDescription>
              {health === null
                ? "检查中…"
                : health.db
                  ? `已连接 · 试卷 ${health.papers} 份`
                  : "连接失败"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <StatusDot ok={health?.configLoaded ?? false} /> 配置
            </CardTitle>
            <CardDescription>
              {health === null
                ? "检查中…"
                : health.configLoaded
                  ? "config.json 已加载"
                  : (health.configError ?? "加载失败").slice(0, 60)}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <StatusDot ok={health?.llmConfigured ?? false} /> AI 批改
            </CardTitle>
            <CardDescription>
              {health === null
                ? "检查中…"
                : health.llmConfigured
                  ? "API Key 已配置"
                  : "未配置(去设置页填写)"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <CardContent className="px-0">
        <div className="flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href="/settings" />}>打开设置</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/papers" />}>题库</Button>
          <Button variant="outline" disabled>
            做题历史(M3)
          </Button>
        </div>
      </CardContent>
    </main>
  );
}
