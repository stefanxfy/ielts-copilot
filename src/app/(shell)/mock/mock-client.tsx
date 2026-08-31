"use client";

/**
 * 机考模拟交互(复刻原型 view-exam 全部行为)
 * A/G 切换(mod-switch)→ 科目 tab(exam-tabs)→ 雅思综合年份树(年份折叠 + 套题详情)
 * / 听读写单科列表 / 口语 V2 占位。样式与原型逐条对应。
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export type MockPaper = {
  examId: string;
  subject: string;
  title: string;
  durationMin: number;
  recordCount: number;
};

export type MockSet = {
  examSetId: string;
  title: string;
  category: "A" | "G";
  year: number;
  papers: MockPaper[];
};

const YEAR_LIST = [2026, 2025, 2024, 2023];
const SUBJECT_LABEL: Record<string, string> = {
  reading: "阅读",
  listening: "听力",
  writing: "写作",
  speaking: "口语",
};
const MOD_SUB = { A: "A类（Academic · 学术类）", G: "G类（General Training · 培训类）" } as const;
const MOD_INLINE = { A: "A类 · 学术类", G: "G类 · 培训类" } as const;

/* 套题详情的四科卡片元数据(原型 SEC_META) */
const SEC_META = [
  { key: "listening", name: "听力", dur: "约 30 分钟", n: "40 题", desc: "音频播一遍 · Part 1-4" },
  { key: "reading", name: "阅读", dur: "60 分钟", n: "40 题", desc: "3 个 Section：日常短文→职场文本→长文 · 左右分屏" },
  { key: "writing", name: "写作", dur: "60 分钟", n: "Task 1 + 2", desc: "Task 1 图表/书信 + Task 2 议论文 · AI 四维批改" },
  { key: "speaking", name: "口语", dur: "11–14 分钟", n: "三部分", desc: "录音回放、转写、AI 点评" },
] as const;

/* ---------- 原型同款基础样式 ---------- */
const CARD = "rounded-xl border border-[#dfe4ec] bg-white p-5";
const BTN = "rounded-md border border-[#dfe4ec] bg-white px-3 py-1.5 text-[13px] text-[#1c2330] transition-colors hover:border-[#1a6feb] hover:text-[#1a6feb]";
const BTN_PRIMARY = "rounded-md bg-[#1a6feb] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#0d4fa8]";

function YearEmpty({ year }: { year: number }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#dfe4ec] bg-[#fafbfc] px-[18px] py-3 opacity-65">
      <span className="text-sm font-semibold text-[#8a93a2]">{year} 年</span>
      <span className="text-xs text-[#8a93a2]">· 暂无真题</span>
    </div>
  );
}

function YearHead({
  year,
  note,
  done,
  total,
  open,
  onToggle,
}: {
  year: number;
  note: string;
  done: number;
  total: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full cursor-pointer select-none items-center gap-2.5 px-[18px] py-3.5 text-left transition-colors hover:bg-[#e8f0fe]"
    >
      <span className={`text-xs text-[#8a93a2] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
      <span className="text-base font-bold">{year} 年</span>
      <span className="text-xs font-normal text-[#8a93a2]">{note}</span>
      <span className="ml-auto text-xs text-[#8a93a2]">
        已完成 <b className="text-sm text-[#0d4fa8]">{done}</b> / {total} 套
      </span>
    </button>
  );
}

export function MockClient({ initialMod, sets }: { initialMod: "A" | "G"; sets: MockSet[] }) {
  const [mod, setMod] = useState<"A" | "G">(initialMod);
  const [tab, setTab] = useState<"combined" | "listening" | "reading" | "writing" | "speaking">("combined");
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  const banks = useMemo(() => sets.filter((s) => s.category === mod), [sets, mod]);
  const byYear = useMemo(() => {
    const m = new Map<number, MockSet[]>();
    for (const y of YEAR_LIST) m.set(y, []);
    for (const s of banks) if (m.has(s.year)) m.get(s.year)!.push(s);
    return m;
  }, [banks]);

  // 套题完成度:全部单科考过 = 已完成;部分 = 部分完成
  const setStatus = (s: MockSet): "done" | "part" | "todo" => {
    const done = s.papers.filter((p) => p.recordCount > 0).length;
    if (s.papers.length > 0 && done === s.papers.length) return "done";
    return done > 0 ? "part" : "todo";
  };
  const STATUS_TEXT = { done: "已完成", part: "部分完成", todo: "未开始" } as const;

  const toggleYear = (key: string) =>
    setOpenYears((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  const detailSet = banks.find((s) => s.examSetId === detailId) ?? null;

  /* ---------- 单科年份列表(听/读/写;口语无卷 → 全占位) ---------- */
  function singleList(subject: string) {
    const papersOf = banks.flatMap((s) =>
      s.papers.filter((p) => p.subject === subject).map((p) => ({ set: s, paper: p })),
    );
    return YEAR_LIST.map((year) => {
      const list = papersOf.filter((x) => x.set.year === year);
      if (list.length === 0) return <YearEmpty key={year} year={year} />;
      const done = list.filter((x) => x.paper.recordCount > 0).length;
      const key = `sub-${subject}-${year}`;
      const open = openYears[key] ?? true;
      return (
        <div key={year} className="mb-3 overflow-hidden rounded-xl border border-[#dfe4ec] bg-white">
          <YearHead
            year={year}
            note={`${SUBJECT_LABEL[subject]}真题`}
            done={done}
            total={list.length}
            open={open}
            onToggle={() => toggleYear(key)}
          />
          {open && (
            <div className="flex flex-col gap-2 px-[18px] pb-[18px]">
              {list.map(({ set, paper }) => (
                <div
                  key={paper.examId}
                  className="flex items-center gap-3.5 rounded-lg border border-[#dfe4ec] bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{paper.title}</div>
                    <div className="mt-0.5 text-xs text-[#8a93a2]">
                      {SUBJECT_LABEL[subject]} · {STATUS_TEXT[paper.recordCount > 0 ? "done" : "todo"]} ·{" "}
                      {paper.durationMin} 分钟
                    </div>
                  </div>
                  <Link href={`/exam/${paper.examId}`} className={`${BTN_PRIMARY} whitespace-nowrap`}>
                    开始机考
                  </Link>
                  <span className="sr-only">{set.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <>
      <h2 className="text-xl">机考模拟</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        选择考试科目 · 全程还原官方机考体验 · 当前为 {MOD_SUB[mod]}题库
      </p>

      {/* A/G 切换(原型 mod-switch) */}
      <div className="mb-2.5 inline-flex gap-1 rounded-[10px] border border-[#dfe4ec] bg-white p-1">
        {(["A", "G"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMod(m);
              setDetailId(null);
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-[18px] py-[7px] text-[13px] ${
              mod === m
                ? m === "A"
                  ? "bg-[#fdf1e6] font-semibold text-[#a8540c]"
                  : "bg-[#e8f0fe] font-semibold text-[#0d4fa8]"
                : "text-[#5b6574]"
            }`}
          >
            <span
              className={`inline-block size-2 rounded-full ${
                mod === m ? (m === "A" ? "bg-[#d97b1a]" : "bg-[#1a6feb]") : "bg-[#8a93a2]"
              }`}
            />
            {m === "A" ? "A类 · 学术类" : "G类 · 培训类"}
          </button>
        ))}
      </div>

      {/* 科目 tab(原型 exam-tabs) */}
      <div className="mb-[18px] flex max-w-[660px] gap-1 rounded-[10px] border border-[#dfe4ec] bg-white p-1">
        {(
          [
            ["combined", "雅思综合"],
            ["listening", "听力"],
            ["reading", "阅读"],
            ["writing", "写作"],
            ["speaking", "口语"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setDetailId(null);
            }}
            className={`flex-1 cursor-pointer rounded-md py-2 text-[13px] ${
              tab === key ? "bg-[#e8f0fe] font-semibold text-[#0d4fa8]" : "text-[#5b6574]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== 雅思综合 ===== */}
      {tab === "combined" && (
        <div>
          {detailSet ? (
            /* ---- 套题详情(原型 paperDetail) ---- */
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3.5">
                <button type="button" onClick={() => setDetailId(null)} className={BTN}>
                  ← 返回题库
                </button>
                <div>
                  <div className="text-[17px] font-bold">{detailSet.title}</div>
                  <div className="mt-0.5 text-xs text-[#8a93a2]">
                    听力 → 阅读 → 写作 → 口语 · 结构化入库真题，即点即考
                  </div>
                </div>
                {setStatus(detailSet) === "done" && (
                  <span className="rounded-full border border-[#cde8da] bg-[#eefaf3] px-2.5 py-0.5 text-[11px] text-[#18925c]">
                    已完成
                  </span>
                )}
              </div>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {SEC_META.map((sec) => {
                  const paper = detailSet.papers.find((p) => p.subject === sec.key);
                  return (
                    <div key={sec.key} className="rounded-xl border border-[#dfe4ec] bg-white p-4">
                      <div className="flex items-center justify-between text-[13px] font-semibold">
                        {sec.name}
                        {paper ? (
                          <span className="rounded-full bg-[#e8f0fe] px-[7px] py-px text-[10px] text-[#0d4fa8]">
                            可开始
                          </span>
                        ) : (
                          <span className="rounded-full border border-[#dfe4ec] px-[7px] py-px text-[10px] text-[#8a93a2]">
                            V2 提供
                          </span>
                        )}
                      </div>
                      <div className="my-2 text-xs text-[#5b6574]">
                        {sec.dur} · {sec.n}
                      </div>
                      <div className="text-xs leading-relaxed text-[#8a93a2]">{sec.desc}</div>
                      <div className="mt-2.5">
                        {paper ? (
                          <Link href={`/exam/${paper.examId}`} className={BTN_PRIMARY}>
                            进入机考
                          </Link>
                        ) : (
                          <button type="button" className={BTN} disabled>
                            V2 提供
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() =>
                  toast.info(`综合连考（${MOD_INLINE[mod]}）：场次编排将在完整套卷版本开放；当前可先点上方卡片进入单科机考`)
                }
              >
                开始全套模考
              </button>
            </div>
          ) : (
            /* ---- 题库首页(原型 papersHome) ---- */
            <div>
              <div className={`${CARD} mb-4`}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-medium">考试顺序</span>
                  {["听力 · 约30分钟", "阅读 · 60分钟", "写作 · 60分钟", "口语 · 11–14分钟"].map(
                    (step, i) => (
                      <span key={step} className="flex items-center gap-2">
                        {i > 0 && <span className="text-[#8a93a2]">→</span>}
                        <span className="rounded-md bg-[#e8f0fe] px-2.5 py-1 text-xs text-[#0d4fa8]">
                          {step}
                        </span>
                      </span>
                    ),
                  )}
                </div>
                <div className="mt-2.5 text-xs text-[#8a93a2]">
                  当前：<b>{MOD_INLINE[mod]}</b> · 按题库分组选择一套真题 → 点开查看四科详情 →
                  开始全套模考。已完成套题绿色标注。
                </div>
              </div>

              <div>
                {YEAR_LIST.map((year) => {
                  const items = byYear.get(year) ?? [];
                  if (items.length === 0) return <YearEmpty key={year} year={year} />;
                  const done = items.filter((s) => setStatus(s) === "done").length;
                  const key = `yr-${year}`;
                  const open = openYears[key] ?? true;
                  return (
                    <div key={year} className="mb-3 overflow-hidden rounded-xl border border-[#dfe4ec] bg-white">
                      <YearHead
                        year={year}
                        note={MOD_INLINE[mod]}
                        done={done}
                        total={items.length}
                        open={open}
                        onToggle={() => toggleYear(key)}
                      />
                      {open && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5 px-[18px] pb-[18px]">
                          {items.map((s) => {
                            const st = setStatus(s);
                            return (
                              <button
                                key={s.examSetId}
                                type="button"
                                onClick={() => setDetailId(s.examSetId)}
                                className="cursor-pointer rounded-[9px] border border-[#dfe4ec] bg-white px-3 py-2.5 text-left transition-all hover:border-[#1a6feb] hover:shadow-[0_3px_10px_rgba(16,35,63,0.08)]"
                              >
                                <div className="text-[13px] font-semibold">{s.title}</div>
                                <div
                                  className={`mt-0.5 text-[11px] ${
                                    st === "done"
                                      ? "text-[#18925c]"
                                      : st === "part"
                                        ? "text-[#c07d10]"
                                        : "text-[#8a93a2]"
                                  }`}
                                >
                                  {STATUS_TEXT[st]}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 单科面板 ===== */}
      {tab === "listening" && (
        <div>
          <div className="mb-3.5 text-[13px] text-[#5b6574]">
            选择一套听力真题开始机考 · 约 30 分钟 · Part 1-4 · A/G 类同卷
          </div>
          {singleList("listening")}
        </div>
      )}
      {tab === "reading" && (
        <div>
          <div className="mb-3.5 text-[13px] text-[#5b6574]">
            选择一套阅读真题开始机考 · 60 分钟 · 3 个 Section（日常短文→职场文本→长文）· 40 题 ·
            左右分屏 + 原文高亮
          </div>
          {singleList("reading")}
        </div>
      )}
      {tab === "writing" && (
        <div>
          <div className="mb-3.5 text-[13px] text-[#5b6574]">
            选择一套写作真题开始机考 · 60 分钟 · Task 1 + Task 2 议论文 · 交卷后 AI 四维批改（批改功能即将开放）
          </div>
          {singleList("writing")}
        </div>
      )}
      {tab === "speaking" && (
        <div>
          <div className="mb-3.5 text-[13px] text-[#5b6574]">
            选择一套口语真题开始机考 · 11–14 分钟 · Part 1-3 · A/G 类同卷（V2 待开放）
          </div>
          {YEAR_LIST.map((y) => (
            <YearEmpty key={y} year={y} />
          ))}
        </div>
      )}
    </>
  );
}
