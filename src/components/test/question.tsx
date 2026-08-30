/**
 * src/components/test/question.tsx — 题面渲染(M3-2)
 *
 * 通用题面:接收 question 描述 + choices + 受控值 + onChange。
 * 题型枚举九值全部支持;复杂布局(MATCH/TRUE_FALSE_NG) 用下拉即可。
 *
 * 数据来源:M2-3 入库的 questions / choices 表,通过 /api/papers/[slug]/start(待补 M3-4)
 * 拉取。当前 M3-2 只渲染结构,数据由 props 传入。
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
  stemHtml: string | null;
  instructionHtml: string | null;
  /** 块题共享选项(groupId) → choices 全挂在这 */
  groupId: string | null;
  /** 普通题 options(questionId) → choices 挂在这 */
  choices: ChoiceView[];
}

export interface QuestionProps {
  question: QuestionView;
  value?: string | string[]; // string 单选/填空;string[] 多选
  onChange?: (value: string | string[]) => void;
}

const SELECT_TPL: Record<string, string[]> = {
  TRUE_FALSE_NG: ["TRUE", "FALSE", "NOT GIVEN"],
  // MATCH_* 系列用统一的 A-E / i-iii 等由 choices 决定
};

export function TestQuestion({ question, value, onChange }: QuestionProps) {
  const q = question;
  const set = (v: string | string[]) => onChange?.(v);

  // 单选(字母 A-D)
  if (q.type === "SINGLE_CHOICE") {
    return (
      <fieldset className="space-y-2">
        {q.stemHtml && (
          <legend
            className="text-sm leading-relaxed text-[var(--ink)]"
            // M2 解析器已 sanitize,这里直接渲染
            dangerouslySetInnerHTML={{ __html: q.stemHtml ?? "" }}
          />
        )}
        {q.choices.map((c) => {
          const id = `q-${q.number}-${c.label}`;
          const checked = value === c.label;
          return (
            <label
              key={id}
              htmlFor={id}
              className="flex items-start gap-2 rounded border p-2 text-sm"
              style={{ borderColor: checked ? "var(--brand)" : "var(--line)" }}
            >
              <input
                id={id}
                type="radio"
                name={`q-${q.number}`}
                value={c.label}
                checked={checked}
                onChange={() => set(c.label)}
                className="mt-0.5"
              />
              <span>
                <strong className="mr-1">{c.label}</strong>
                {c.textHtml && (
                  <span dangerouslySetInnerHTML={{ __html: c.textHtml }} />
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  // 多选(MULTI_CHOICE + 块题共享 groupId)— 双选/多选 checkbox
  if (q.type === "MULTI_CHOICE") {
    const current = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <fieldset className="space-y-2">
        {q.stemHtml && (
          <legend
            className="text-sm leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        {q.choices.map((c) => {
          const id = `q-${q.number}-${c.label}`;
          const checked = current.includes(c.label);
          return (
            <label
              key={id}
              htmlFor={id}
              className="flex items-start gap-2 rounded border p-2 text-sm"
              style={{ borderColor: checked ? "var(--brand)" : "var(--line)" }}
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
                className="mt-0.5"
              />
              <span>
                <strong className="mr-1">{c.label}</strong>
                {c.textHtml && (
                  <span dangerouslySetInnerHTML={{ __html: c.textHtml }} />
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  // 下拉(TRUE_FALSE_NG / MATCH_*)
  if (q.type === "TRUE_FALSE_NG" || q.type.startsWith("MATCH_")) {
    const options =
      q.type === "TRUE_FALSE_NG"
        ? SELECT_TPL.TRUE_FALSE_NG.map((l) => ({ label: l, value: l, text: null }))
        : q.choices.map((c) => ({ label: c.label, value: c.label, text: c.textHtml }));
    return (
      <div>
        {q.stemHtml && (
          <div
            className="mb-2 text-sm"
            dangerouslySetInnerHTML={{ __html: q.stemHtml }}
          />
        )}
        <select
          className="rounded border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--line)" }}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value)}
        >
          <option value=""></option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}{o.text ? ` ${o.text}` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // 填空 / 简答
  const fillVal = typeof value === "string" ? value : "";
  return (
    <div>
      {q.stemHtml && (
        <div
          className="mb-2 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: q.stemHtml }}
        />
      )}
      <input
        type="text"
        value={fillVal}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded border px-3 py-1.5 text-sm"
        style={{ borderColor: "var(--line)" }}
      />
    </div>
  );
}