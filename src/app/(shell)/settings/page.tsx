/**
 * /settings — 设置页(P7 v2.7 §3.4 四分区)
 *
 * ①AI 连接:原「AI 服务配置」卡原样迁移(config.json 现状,保存/测试/409 冲突重载不变)
 * ②提示词模板:PromptCard(三张折叠编辑卡,PUT/DELETE)
 * ③备考:PunchRulesCard + StudyPrefsCard + TemplateRulesCard
 * ④通用:原「本地数据」「本地服务」两卡
 * 页面内锚点导航(不做多路由);除分区编排外原有逻辑一律不动。
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
import { PromptCard } from "@/components/settings/prompt-card";
import { PunchRulesCard } from "@/components/settings/punch-rules-card";
import { StudyPrefsCard } from "@/components/settings/study-prefs-card";
import { TemplateRulesCard } from "@/components/settings/template-rules-card";
import { useSettings } from "@/stores/settings";
import {
  DEFAULT_UI_THEME,
  UI_THEMES,
  applyUiTheme,
  currentUiTheme,
  type UiThemeId,
} from "@/lib/ui-theme";

/* ---------- 原型同款基础样式 ---------- */
const CARD = "rounded-xl border border-border bg-card p-5";
const SECTION = "mb-10";
const ROW = "mb-3 flex items-center gap-2.5";
const LABEL = "w-[130px] shrink-0 text-[13px] text-muted-foreground";
const INPUT =
  "h-9 flex-1 rounded-md border border-border bg-card px-2.5 text-[13px] outline-none focus:border-primary aria-invalid:border-destructive";
const BTN =
  "rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";
const H2 = "mb-3 text-[15px] font-medium text-foreground";
const CARD_W = "mb-4 max-w-[680px]";

/* 分区锚点 */
const SECTIONS = [
  { id: "ai", label: "AI 连接" },
  { id: "prompts", label: "提示词模板" },
  { id: "study", label: "备考" },
  { id: "general", label: "通用" },
] as const;

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

  // 皮肤选择:以 SSR 直出的 <html data-theme> 为初始值;切换即时生效并持久化到 app_settings
  const [uiTheme, setUiTheme] = useState<UiThemeId>(DEFAULT_UI_THEME);
  useEffect(() => setUiTheme(currentUiTheme()), []);

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
      <p className="mb-5 text-[13px] text-muted-foreground">
        AI 配置存于本机 <code>config.json</code> · 界面修改与直接编辑文件均生效
        （以文件修改时间较新者为准）
        {fileError && (
          <span className="text-destructive">文件校验失败已回退默认:{fileError}</span>
        )}
      </p>

      {/* 锚点导航(页面内跳转,不做多路由) */}
      <nav className="mb-6 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border bg-card px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* ===== ① AI 连接(原「AI 服务配置」卡原样迁移) ===== */}
      <section id="ai" className={SECTION}>
        <h2 className={H2}>AI 连接</h2>
        <div className={CARD_W}>
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
                    ? "border-success/30 bg-success/10 text-success"
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
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                端口已变更：重启应用（或重新双击启动）后生效。
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== ② 提示词模板(PromptCard 自带同名标题,不再叠 h2) ===== */}
      <section id="prompts" className={SECTION}>
        <PromptCard />
      </section>

      {/* ===== ③ 备考 ===== */}
      <section id="study" className={SECTION}>
        <h2 className={H2}>备考</h2>
        <PunchRulesCard />
        <StudyPrefsCard />
        <TemplateRulesCard />
      </section>

      {/* ===== ④ 通用 ===== */}
      <section id="general" className={SECTION}>
        <h2 className={H2}>通用</h2>

        {/* 界面皮肤(glearn 同源 8 套;即时生效,存 app_settings) */}
        <div className={CARD_W}>
          <div className={CARD}>
            <h3 className="mb-3.5 text-[15px]">界面皮肤</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {UI_THEMES.map((t) => {
                const active = uiTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      applyUiTheme(t.id);
                      setUiTheme(t.id);
                      void fetch("/api/ui-theme", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ theme: t.id }),
                      }).catch(() => undefined);
                    }}
                    className={`press-bubble rounded-lg border p-2 text-left transition-colors ${
                      active
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    aria-pressed={active}
                  >
                    {/* 色条:底色 / 品牌色 / 点缀色,还原 glearn 主题卡观感 */}
                    <span
                      className="mb-1.5 flex h-7 overflow-hidden rounded-md border border-border"
                      style={{ background: t.swatch[0] }}
                    >
                      <span className="h-full flex-[3]" style={{ background: t.swatch[1] }} />
                      <span className="h-full flex-1" style={{ background: t.swatch[2] }} />
                    </span>
                    <span className="flex items-center justify-between text-[12px] leading-none">
                      <span className={active ? "font-semibold text-primary" : "text-foreground"}>
                        {t.label}
                      </span>
                      {active && <span className="text-[11px] text-primary">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={`${HINT} mt-3`}>
              皮肤即时生效并保存;「夜读·灯下」为暗色护眼皮肤,顶栏按钮可在夜读与上次浅色皮肤间快切。
            </div>
          </div>
        </div>

        {/* 本地数据 */}
        <div className={CARD_W}>
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
        </div>

        {/* 本地服务 */}
        <div className={CARD_W}>
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
        </div>
      </section>

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
