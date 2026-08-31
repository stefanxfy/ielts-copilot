/**
 * src/components/test/question.tsx — 九题型真渲染(M4-2)
 *
 * 题型: SINGLE_CHOICE / MULTI_CHOICE / FILL_BLANK / TRUE_FALSE_NG /
 *       MATCH_HEADINGS / MATCH_INFO / MATCH_FEATURES / MATCH_ENDINGS / SHORT_ANSWER
 *
 * 数据由 /api/papers/<slug>/start 返回(stemHtml / instructionHtml / choices)。
 * 块题共享 choices(groupId 在父组件聚合,这里只负责单题渲染)。
 *
 * 安全:所有 stemHtml/instructionHtml/choice.textHtml 都已在 M2 parser 阶段 sanitize,
 * 渲染层直接 dangerouslySetInnerHTML。
 */
"use client";

import type { QuestionType } from "@/lib/seed-validate";

export interface ChoiceView {
  label: string;
  textHtml: string | null;
}

export interface QuestionView {
  number: number;
  type: QuestionType;
  sectionId?: number;
  groupId?: string | number | null;
  stemHtml: string | null;
  instructionHtml: string | null;
  /** 块题共享选项;单选/填空可空 */
  choices: ChoiceView[];
}

export interface QuestionProps {
  question: QuestionView;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
}

const TF_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"] as const;

export function TestQuestion({ question, value, onChange }: QuestionProps) {
  const q = question;
  const set = (v: string | string[]) => onChange?.(v);

  // 顶部 instruction(块题共享 instruction 在父组件展示,这里只展示单题 instruction)
  const InstructionBlock = q.instructionHtml ? (
    <div
      className="mb-2 rounded-md bg-[var(--brand-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--brand-deep)]"
      dangerouslySetInnerHTML={{ __html: q.instructionHtml }}
    />
  ) : null;

  // SINGLE_CHOICE — radio 列表
  if (q.type === "SINGLE_CHOICE") {
    return (
      <div>
        {InstructionBlock}
        {q.stemHtml && (
          <div
            className="mb-2 text-sm leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        <fieldset className="space-y-1.5">
          {q.choices.map((c) => {
            const id = `q-${q.number}-${c.label}`;
            const checked = value === c.label;
            return (
              <label
                key={id}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-[var(--brand)]"
                style={{ borderColor: checked ? "var(--brand)" : "var(--line)", background: checked ? "var(--brand-bg)" : "#fff" }}
              >
                <input
                  id={id}
                  type="radio"
                  name={`q-${q.number}`}
                  value={c.label}
                  checked={checked}
                  onChange={() => set(c.label)}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span className="flex-1">
                  <strong className="mr-1.5">{c.label}</strong>
                  {c.textHtml && (
                    <span dangerouslySetInnerHTML={{ __html: c.textHtml }} />
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>
    );
  }

  // MULTI_CHOICE — checkbox 列表(可多选)
  if (q.type === "MULTI_CHOICE") {
    const current = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <div>
        {InstructionBlock}
        {q.stemHtml && (
          <div
            className="mb-2 text-sm leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        <fieldset className="space-y-1.5">
          {q.choices.map((c) => {
            const id = `q-${q.number}-${c.label}`;
            const checked = current.includes(c.label);
            return (
              <label
                key={id}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-[var(--brand)]"
                style={{ borderColor: checked ? "var(--brand)" : "var(--line)", background: checked ? "var(--brand-bg)" : "#fff" }}
              >
                <input
                  id={id}
                  type="checkbox"
                  value={c.label}
                  checked={checked}
                  onChange={() => {
                    const next = checked ? current.filter((v) => v !== c.label) : [...current, c.label];
                    set(next);
                  }}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span className="flex-1">
                  <strong className="mr-1.5">{c.label}</strong>
                  {c.textHtml && (
                    <span dangerouslySetInnerHTML={{ __html: c.textHtml }} />
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>
    );
  }

  // TRUE_FALSE_NG — 三个固定 option(TRUE / FALSE / NOT GIVEN)
  if (q.type === "TRUE_FALSE_NG") {
    return (
      <div>
        {InstructionBlock}
        {q.stemHtml && (
          <div
            className="mb-2 text-sm leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        <fieldset className="flex flex-wrap gap-1.5">
          {TF_OPTIONS.map((opt) => {
            const id = `q-${q.number}-${opt}`;
            const checked = value === opt;
            return (
              <label
                key={opt}
                htmlFor={id}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--brand)]"
                style={{
                  borderColor: checked ? "var(--brand)" : "var(--line)",
                  background: checked ? "var(--brand-bg)" : "#fff",
                  color: checked ? "var(--brand-deep)" : "var(--ink-2)",
                }}
              >
                <input
                  id={id}
                  type="radio"
                  name={`q-${q.number}`}
                  value={opt}
                  checked={checked}
                  onChange={() => set(opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            );
          })}
        </fieldset>
      </div>
    );
  }

  // MATCH_* — 下拉选 options(共用的 choices 来自 groupId 聚合)
  if (q.type.startsWith("MATCH_")) {
    const options = q.choices.length > 0
      ? q.choices.map((c) => ({ value: c.label, text: c.textHtml }))
      : []; // 兜底:无 choices 时用空
    return (
      <div>
        {InstructionBlock}
        {q.stemHtml && (
          <div
            className="mb-2 text-sm leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        <select
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--line)" }}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">— 选择 —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}{o.text ? ` · ${o.text.replace(/<[^>]+>/g, "").slice(0, 60)}` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // FILL_BLANK / SHORT_ANSWER — input 文本框
  const fillVal = typeof value === "string" ? value : "";
  return (
    <div>
      {InstructionBlock}
      {q.stemHtml && (
        <div
          className="mb-2 text-sm leading-relaxed text-[var(--ink)]"
          dangerouslySetInnerHTML={{ __html: q.stemHtml }}
        />
      )}
      <input
        type="text"
        value={fillVal}
        onChange={(e) => set(e.target.value)}
        placeholder={q.type === "SHORT_ANSWER" ? "在此输入简短回答…" : "在此填入答案…"}
        className="w-full rounded-md border px-3 py-1.5 text-sm focus:border-[var(--brand)] focus:outline-none"
        style={{ borderColor: "var(--line)" }}
      />
    </div>
  );
}