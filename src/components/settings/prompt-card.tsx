/**
 * prompt-card.tsx — 提示词模板编辑卡(P7 v2.7,设置页「提示词模板」分区)
 *
 * 三条 system 提示词:折叠展开 / 占位符说明 / 实时校验(必需占位符 + ≤8000 字符)
 * / 保存(PUT 即生效)/ 恢复默认(DELETE 删键)。
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CARD = "mb-4 max-w-[680px] rounded-xl border border-border bg-card p-5";
const BTN =
  "rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-md bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const HINT = "text-xs text-muted-foreground";

interface PromptItem {
  key: string;
  label: string;
  description: string;
  placeholders: { name: string; desc: string }[];
  required: string[];
  text: string;
  isDefault: boolean;
}

/** 客户端预检:必填集 = GET 返回的 required(与 PROMPT_META 同源;服务端仍是权威校验) */
function validate(item: PromptItem, text: string): string | null {
  if (!text.trim()) return "内容不能为空";
  if (text.length > 8000) return "长度不能超过 8000 字符";
  const missing = item.required.filter((name) => !text.includes(name));
  return missing.length ? `缺少必需占位符:${missing.join(" ")}` : null;
}

export function PromptCard() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<PromptItem | null>(null);

  useEffect(() => {
    void (async () => {
      const resp = await fetch("/api/prompts");
      if (!resp.ok) return;
      const data = (await resp.json()) as { prompts: PromptItem[] };
      setItems(data.prompts);
      setDrafts(Object.fromEntries(data.prompts.map((p) => [p.key, p.text])));
    })();
  }, []);

  async function save(item: PromptItem) {
    const text = drafts[item.key] ?? "";
    const err = validate(item, text);
    setErrors((e) => ({ ...e, [item.key]: err }));
    if (err) return;
    setSavingKey(item.key);
    try {
      const resp = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, text }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        setErrors((e) => ({ ...e, [item.key]: data.error ?? "保存失败" }));
        toast.error(data.error ?? "保存失败");
        return;
      }
      setItems((list) =>
        list.map((p) => (p.key === item.key ? { ...p, text, isDefault: false } : p)),
      );
      toast.success(`「${item.label}」提示词已保存,立即生效`);
    } catch {
      toast.error("保存请求失败");
    } finally {
      setSavingKey(null);
    }
  }

  async function resetToDefault(item: PromptItem) {
    setConfirmReset(null);
    try {
      const resp = await fetch(`/api/prompts?key=${item.key}`, { method: "DELETE" });
      const data = (await resp.json()) as { ok?: boolean; text?: string; error?: string };
      if (!resp.ok || !data.ok) {
        toast.error(data.error ?? "恢复默认失败");
        return;
      }
      setItems((list) =>
        list.map((p) =>
          p.key === item.key ? { ...p, text: data.text ?? p.text, isDefault: true } : p,
        ),
      );
      setDrafts((d) => ({ ...d, [item.key]: data.text ?? item.text }));
      setErrors((e) => ({ ...e, [item.key]: null }));
      toast.info(`「${item.label}」已恢复默认`);
    } catch {
      toast.error("恢复默认请求失败");
    }
  }

  return (
    <div className={CARD}>
      <h3 className="mb-1 text-[15px]">提示词模板</h3>
      <p className={`${HINT} mb-3.5`}>
        只开放 AI 的 system 指令段(考生数据由系统注入 user 段,防止改坏数据契约);保存即生效。
      </p>

      {items.length === 0 && <p className={HINT}>加载中…</p>}

      <div className="grid gap-2">
        {items.map((item) => {
          const open = openKey === item.key;
          const draft = drafts[item.key] ?? "";
          const dirty = draft !== item.text;
          const err = errors[item.key] ?? null;
          return (
            <div key={item.key} className="rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                onClick={() => setOpenKey(open ? null : item.key)}
              >
                <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    item.isDefault
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.isDefault ? "默认" : "已自定义"}
                </span>
                <span className="flex-1 truncate text-[12px] text-muted-foreground">{item.description}</span>
                <span className="text-muted-foreground">{open ? "⌃" : "⌄"}</span>
              </button>

              {open && (
                <div className="border-t border-border px-3 pb-3 pt-2.5">
                  <div className="mb-2 grid gap-1">
                    {item.placeholders.map((p) => (
                      <div key={p.name} className="text-[11px] text-muted-foreground">
                        <code className="rounded bg-secondary px-1 text-primary">{p.name}</code>
                        {" "}
                        {p.desc}
                        {!item.required.includes(p.name) && (
                          <span className="ml-1 text-muted-foreground/60">(可选,写了就近注入)</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="min-h-[180px] w-full resize-y rounded-md border border-border bg-card px-2.5 py-2 font-mono text-[12px] leading-relaxed outline-none focus:border-primary"
                    value={draft}
                    onChange={(e) => {
                      setDrafts((d) => ({ ...d, [item.key]: e.target.value }));
                      setErrors((er) => ({ ...er, [item.key]: null }));
                    }}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className={HINT}>
                      {draft.length}/8000
                      {dirty && !err ? " · 有未保存的修改" : ""}
                    </span>
                    <span className="text-xs text-destructive">{err}</span>
                  </div>
                  <div className="mt-2 flex gap-2.5">
                    <button
                      type="button"
                      className={BTN_PRIMARY}
                      disabled={savingKey === item.key}
                      onClick={() => void save(item)}
                    >
                      {savingKey === item.key ? "保存中…" : "保存"}
                    </button>
                    <button
                      type="button"
                      className={BTN}
                      disabled={item.isDefault}
                      onClick={() => setConfirmReset(item)}
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={confirmReset !== null} onOpenChange={(o) => !o && setConfirmReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复默认提示词?</DialogTitle>
            <DialogDescription>
              「{confirmReset?.label}」的自定义内容将被删除,回到内置默认文本。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={BTN} onClick={() => setConfirmReset(null)}>
              取消
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => confirmReset && void resetToDefault(confirmReset)}
            >
              确认恢复
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
