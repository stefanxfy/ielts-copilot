/**
 * /settings — 设置页(M1 步骤 5,PRD §8)
 *
 * 两组 Card:服务(port 可改 / host 只读回环白名单)+ AI(provider/baseUrl/apiKey/
 * gradingModel/timeoutSec)。行为(plan「页面」节):
 *  - 共享 zod 校验,内联报错
 *  - 「测试连通性」用**当前表单值**(未保存可测;apiKey 留空 = 用已存 key)
 *  - 保存 → PUT 带 baseMtime 乐观并发;409 → Dialog「已被外部修改,一键重载」
 *  - 保存成功 toast + 端口变更 requiresRestart 提示
 *  - apiKey 密码框:显示掩码占位,留空 = 保持现值
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/stores/settings";

/* ---------- 表单校验(与 config-schema 同规则;zod 跑在客户端) ---------- */

const formSchema = z.object({
  port: z.number().int().min(1).max(65535),
  provider: z.enum(["openai", "anthropic", "openai-compatible"]),
  baseUrl: z.url(),
  gradingModel: z.string().min(1, "必填"),
  timeoutSec: z.number().int().min(5).max(600),
});
type FormErrors = Partial<Record<string, string>>;

function validate(v: {
  port: number;
  provider: string;
  baseUrl: string;
  gradingModel: string;
  timeoutSec: number;
}): FormErrors {
  const parsed = formSchema.safeParse(v);
  if (parsed.success) return {};
  const errs: FormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}

/* ---------- 页面 ---------- */

export default function SettingsPage() {
  const { view, fileMtime, fileError, loading, load, apply } = useSettings();

  const [port, setPort] = useState("");
  const [provider, setProvider] = useState<string>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState(""); // 空 = 保持现值
  const [gradingModel, setGradingModel] = useState("");
  const [timeoutSec, setTimeoutSec] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [conflict, setConflict] = useState<{
    message: string;
    view: { port: number; provider: string; gradingModel: string };
  } | null>(null);
  const [portChanged, setPortChanged] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // 服务端视图到达 → 灌表单(apiKey 永远留空,占位符显示掩码)。
  // 渲染期派生同步(React 认可的 props→state 调整模式,避免 effect 内同步 setState
  // 触发级联渲染;保存成功 apply 新 view 后同样走这里回灌)
  const [syncedFrom, setSyncedFrom] = useState<unknown>(null);
  if (view && view !== syncedFrom) {
    setSyncedFrom(view);
    setPort(String(view.server.port));
    setProvider(view.llm.provider);
    setBaseUrl(view.llm.baseUrl);
    setGradingModel(view.llm.gradingModel);
    setTimeoutSec(String(view.llm.timeoutSec));
    setApiKey("");
    setPortChanged(false);
  }

  const currentForm = () => ({
    port: Number(port),
    provider,
    baseUrl,
    gradingModel,
    timeoutSec: Number(timeoutSec),
  });

  async function handleTest() {
    const errs = validate(currentForm());
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTestResult({ ok: false, message: "先修正表单错误再测试" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        provider,
        baseUrl,
        gradingModel,
        timeoutSec: Number(timeoutSec),
      };
      if (apiKey) body.apiKey = apiKey; // 留空 → 服务端用已存 key
      const resp = await fetch("/api/config/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      setTestResult({
        ok: !!data.ok,
        message: data.message ?? JSON.stringify(data).slice(0, 200),
        latencyMs: data.latencyMs,
      });
    } catch {
      setTestResult({ ok: false, message: "请求失败(服务未响应)" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const errs = validate(currentForm());
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const resp = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseMtime: fileMtime,
          server: { port: Number(port) },
          llm: {
            provider,
            baseUrl,
            gradingModel,
            timeoutSec: Number(timeoutSec),
            ...(apiKey ? { apiKey } : {}),
          },
        }),
      });
      const data = await resp.json();

      if (resp.status === 409) {
        setConflict({
          message: data.message ?? "config.json 已被外部修改",
          view: {
            port: data.config?.server?.port ?? 0,
            provider: data.config?.llm?.provider ?? "",
            gradingModel: data.config?.llm?.gradingModel ?? "",
          },
        });
        return;
      }
      if (!resp.ok) {
        // 400:字段级错误回填
        const next: FormErrors = {};
        const props = data.issues?.properties ?? {};
        for (const [group, fields] of Object.entries(props)) {
          const fieldErrs = (fields as { properties?: Record<string, { errors?: string[] }> })
            .properties ?? {};
          for (const [field, fe] of Object.entries(fieldErrs)) {
            const msg = (fe as { errors?: string[] }).errors?.[0];
            if (msg) next[`${group}.${field}`] = msg;
          }
        }
        setErrors(
          Object.keys(next).length > 0
            ? next
            : { baseUrl: data.message ?? "保存失败" },
        );
        toast.error(data.message ?? "保存失败");
        return;
      }

      const oldPort = view?.server.port;
      apply(data.config, data.fileMtime);
      toast.success("配置已保存");
      if (oldPort !== undefined && Number(port) !== oldPort) {
        setPortChanged(true); // requiresRestart 提示
      }
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleReloadFromConflict() {
    setConflict(null);
    await load();
    toast.info("已重载最新配置");
  }

  if (loading && !view) {
    return <p className="p-8 text-sm text-muted-foreground">加载配置中…</p>;
  }

  const err = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <main className="mx-auto max-w-2xl p-6 pb-16">
      <h1 className="mb-1 text-xl font-semibold">设置</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        config.json 双通道:此处保存与手改文件互认,以文件 mtime 为准。
        {fileError && (
          <span className="text-destructive">文件校验失败已回退默认:{fileError}</span>
        )}
      </p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>服务</CardTitle>
          <CardDescription>只监听本机回环,不暴露局域网</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="port">端口</Label>
            <Input
              id="port"
              inputMode="numeric"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              aria-invalid={!!errors.port}
            />
            {err("port")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="host">监听地址(host)</Label>
            <Input id="host" value={view?.server.host ?? "127.0.0.1"} disabled />
            <p className="text-xs text-muted-foreground">白名单只读:127.0.0.1 / localhost / ::1</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI(写作批改)</CardTitle>
          <CardDescription>所有 LLM 调用走此处配置;key 只存本机</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v ?? "openai-compatible")}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.provider}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI(官方)</SelectItem>
                  <SelectItem value="openai-compatible">OpenAI 兼容网关</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
              {err("provider")}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                aria-invalid={!!errors.baseUrl}
              />
              {err("baseUrl")}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              placeholder={
                view?.llm.apiKeySet
                  ? `已配置(${view.llm.apiKeyMasked}) · 留空保持不变`
                  : "未配置"
              }
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="model">批改模型</Label>
              <Input
                id="model"
                value={gradingModel}
                onChange={(e) => setGradingModel(e.target.value)}
                aria-invalid={!!errors.gradingModel}
              />
              {err("gradingModel")}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">超时(秒)</Label>
              <Input
                id="timeout"
                inputMode="numeric"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(e.target.value)}
                aria-invalid={!!errors.timeoutSec}
              />
              {err("timeoutSec")}
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                testResult.ok
                  ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {testResult.ok ? "✓ " : "✗ "}
              {testResult.message}
              {testResult.latencyMs !== undefined && `(${testResult.latencyMs}ms)`}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? "测试中…" : "测试连通性"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>

          {portChanged && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              端口已变更:重启应用(或重新双击启动)后生效。
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => !open && setConflict(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配置已被外部修改</DialogTitle>
            <DialogDescription>
              {conflict?.message}。磁盘上的最新值:端口 {conflict?.view.port} ·{" "}
              {conflict?.view.provider} · {conflict?.view.gradingModel}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflict(null)}>
              我知道了
            </Button>
            <Button onClick={handleReloadFromConflict}>一键重载</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
