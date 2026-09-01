/**
 * /settings — 设置页(复刻原型 view-settings,保留 M1 全部功能逻辑)
 *
 * 视觉:AI 服务配置 + 本地数据 两张卡(原型 set-row 左标签布局);服务端口收进「本地服务」。
 * 行为(M1 步骤 5,不变):
 *  - 共享 zod 校验,内联报错
 *  - 「测试连接」用**当前表单值**(未保存可测;apiKey 留空 = 用已存 key)
 *  - 保存 → PUT 带 baseMtime 乐观并发;409 → Dialog「已被外部修改,一键重载」
 *  - apiKey 密码框:显示掩码占位,留空 = 保持现值
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/stores/settings";

/* ---------- 原型同款基础样式 ---------- */
const CARD = "mb-4 max-w-[680px] rounded-xl border border-[#dfe4ec] bg-white p-5";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[130px] shrink-0 text-[13px] text-[#5b6574]";
const INPUT =
  "h-9 flex-1 rounded-md border border-[#dfe4ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#1a6feb] aria-invalid:border-destructive";
const BTN =
  "rounded-md border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px] text-[#1c2330] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8] disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-[#8a93a2]";

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
      toast.success("已保存到 config.json");
      if (oldPort !== undefined && Number(port) !== oldPort) {
        setPortChanged(true);
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
    return <p className="text-sm text-muted-foreground">加载配置中…</p>;
  }

  const err = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <>
      <h2 className="text-xl">设置</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        AI 配置存于本机 <code>config.json</code> · 界面修改与直接编辑文件均生效
        （以文件修改时间较新者为准）
        {fileError && (
          <span className="text-destructive">文件校验失败已回退默认:{fileError}</span>
        )}
      </p>

      {/* ===== AI 服务配置 ===== */}
      <div className={CARD}>
        <h3 className="mb-3.5 text-[15px]">AI 服务配置</h3>

        <div className={ROW}>
          <label className={LABEL}>Provider</label>
          <Select value={provider} onValueChange={(v) => setProvider(v ?? "openai-compatible")}>
            <SelectTrigger className={`h-9 flex-1 ${INPUT}`} aria-invalid={!!errors.provider}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">openai</SelectItem>
              <SelectItem value="openai-compatible">openai-compatible</SelectItem>
              <SelectItem value="anthropic">anthropic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {err("provider")}

        <div className={ROW}>
          <label className={LABEL}>Base URL</label>
          <Input
            className={INPUT}
            value={baseUrl}
            placeholder="https://..."
            onChange={(e) => setBaseUrl(e.target.value)}
            aria-invalid={!!errors.baseUrl}
          />
        </div>
        {err("baseUrl")}

        <div className={ROW}>
          <label className={LABEL}>API Key</label>
          <Input
            className={INPUT}
            type="password"
            value={apiKey}
            placeholder={
              view?.llm.apiKeySet
                ? `已配置(${view.llm.apiKeyMasked}) · 留空保持不变`
                : "sk-..."
            }
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className={ROW}>
          <label className={LABEL}>批改模型</label>
          <Input
            className={INPUT}
            value={gradingModel}
            onChange={(e) => setGradingModel(e.target.value)}
            aria-invalid={!!errors.gradingModel}
          />
        </div>
        {err("gradingModel")}

        <div className={ROW}>
          <label className={LABEL}>超时(秒)</label>
          <Input
            className={INPUT}
            inputMode="numeric"
            value={timeoutSec}
            onChange={(e) => setTimeoutSec(e.target.value)}
            aria-invalid={!!errors.timeoutSec}
          />
        </div>
        {err("timeoutSec")}

        <div className={`${HINT} mb-3.5`}>
          所有 AI 调用均读取此配置，不写死在代码中。也可以直接用文本编辑器打开{" "}
          <code>config.json</code> 修改。
        </div>

        {testResult && (
          <div
            className={`mb-3.5 rounded-lg border px-3 py-2 text-[13px] ${
              testResult.ok
                ? "border-[#cde8da] bg-[#eefaf3] text-[#18925c]"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.ok ? "✓ " : "✗ "}
            {testResult.message}
            {testResult.latencyMs !== undefined && `(${testResult.latencyMs}ms)`}
          </div>
        )}

        <div className="flex gap-2.5">
          <button type="button" className={BTN_PRIMARY} onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : "保存配置"}
          </button>
          <button type="button" className={BTN} onClick={handleTest} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </button>
        </div>

        {portChanged && (
          <p className="mt-3 rounded-lg border border-[#f0e3b8] bg-[#fdf6e3] px-3 py-2 text-xs text-[#7a5c10]">
            端口已变更：重启应用（或重新双击启动）后生效。
          </p>
        )}
      </div>

      {/* ===== 本地数据 ===== */}
      <div className={CARD}>
        <h3 className="mb-3.5 text-[15px]">本地数据</h3>
        <div className={HINT}>
          数据目录：<code>&lt;应用目录&gt;/data/</code>（app.db · SQLite，含题库与全部考试记录）
        </div>
        <div className="mt-2.5 flex gap-2.5">
          <button
            type="button"
            className={BTN}
            onClick={() => toast.info("数据目录在应用安装目录下的 data/ 子目录（含 app.db）")}
          >
            打开数据目录
          </button>
          <button
            type="button"
            className={BTN}
            onClick={() => toast.info("备份为题库包，V3 提供")}
          >
            导出题库包
          </button>
        </div>
      </div>

      {/* ===== 本地服务(M1 功能保留) ===== */}
      <div className={CARD}>
        <h3 className="mb-3.5 text-[15px]">本地服务</h3>
        <div className={ROW}>
          <label className={LABEL}>端口</label>
          <Input
            className={INPUT}
            inputMode="numeric"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            aria-invalid={!!errors.port}
          />
        </div>
        {err("port")}
        <div className={ROW}>
          <label className={LABEL}>监听地址(host)</label>
          <Input className={INPUT} value={view?.server.host ?? "127.0.0.1"} disabled />
        </div>
        <div className={HINT}>白名单只读：127.0.0.1 / localhost / ::1 · 只监听本机回环</div>
      </div>

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => !open && setConflict(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配置已被外部修改</DialogTitle>
            <DialogDescription>
              {conflict?.message}。磁盘上的最新值：端口 {conflict?.view.port} ·{" "}
              {conflict?.view.provider} · {conflict?.view.gradingModel}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={BTN} onClick={() => setConflict(null)}>
              我知道了
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={handleReloadFromConflict}>
              一键重载
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
