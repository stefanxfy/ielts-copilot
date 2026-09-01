/**
 * tests/plan-gen.test.ts — 默认模板规则引擎单测(node:test,零依赖)
 *
 * 运行:npm run test:plan
 * 覆盖:mergeRanges 合并 / segmentOfRange 中点归属 / splitPhaseWeeks 阶段划分 /
 *       buildTemplatePhases 缩放与兜底 / validatePhasesOutput LLM 输出校验
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTemplatePhases,
  mergeRanges,
  segmentOfRange,
  segmentBounds,
  splitPhaseWeeks,
  validatePhasesOutput,
} from "@/lib/study/plan-gen";
import { DEFAULT_TEMPLATE_RULES } from "@/lib/prompts/defaults";
import type { PlanAvailability, TemplateRules } from "@/db/schema";

const R: TemplateRules = structuredClone(DEFAULT_TEMPLATE_RULES);

const avail = (over: Partial<PlanAvailability> = {}): PlanAvailability => ({
  mode: "working",
  dailyHours: 2,
  slots: [],
  ...over,
});

/* ---------- ① mergeRanges ---------- */

test("mergeRanges:重叠与相邻 <30min 合并,间隔足够不合并,结果升序", () => {
  const merged = mergeRanges(
    [
      { start: "19:30", end: "22:00" },
      { start: "08:00", end: "10:00" },
      { start: "09:30", end: "11:00" }, // 与 08-10 重叠 → 08-11
      { start: "11:15", end: "12:00" }, // 间隔 15min → 并入 08-12
      { start: "14:00", end: "15:00" }, // 与 12:00 间隔 120min,独立
    ],
    30,
  );
  assert.deepEqual(merged, [
    { start: "08:00", end: "12:00" },
    { start: "14:00", end: "15:00" },
    { start: "19:30", end: "22:00" },
  ]);
});

test("mergeRanges:start>=end 的非法范围被丢弃", () => {
  assert.deepEqual(
    mergeRanges([{ start: "10:00", end: "10:00" }, { start: "12:00", end: "11:00" }], 30),
    [],
  );
});

/* ---------- ② segmentOfRange ---------- */

test("segmentOfRange:按范围中点归属四段(默认作息 07-23)", () => {
  const b = segmentBounds("07:00", "23:00");
  assert.equal(segmentOfRange({ start: "08:00", end: "10:00" }, b), "morning");
  assert.equal(segmentOfRange({ start: "12:00", end: "13:30" }, b), "noon");
  assert.equal(segmentOfRange({ start: "14:00", end: "17:00" }, b), "afternoon");
  assert.equal(segmentOfRange({ start: "19:30", end: "22:00" }, b), "evening");
});

/* ---------- ③ splitPhaseWeeks ---------- */

test("splitPhaseWeeks:≥10 周按百分比 40/40/20(各自取整,冲刺补差)", () => {
  assert.deepEqual(splitPhaseWeeks(10, R.phaseRatios), [4, 4, 2]);
  assert.deepEqual(splitPhaseWeeks(12, R.phaseRatios), [5, 5, 2]);
});

test("splitPhaseWeeks:6–9 周基准 [2,3,1] 余量进强化", () => {
  assert.deepEqual(splitPhaseWeeks(6, R.phaseRatios), [2, 3, 1]);
  assert.deepEqual(splitPhaseWeeks(8, R.phaseRatios), [2, 5, 1]);
});

test("splitPhaseWeeks:3–5 周 [1,2,1],W=3 去基础期,W=5 余量进强化", () => {
  assert.deepEqual(splitPhaseWeeks(3, R.phaseRatios), [0, 2, 1]);
  assert.deepEqual(splitPhaseWeeks(4, R.phaseRatios), [1, 2, 1]);
  assert.deepEqual(splitPhaseWeeks(5, R.phaseRatios), [1, 3, 1]);
});

test("splitPhaseWeeks:<3 周只剩强化+冲刺,<2 周仅冲刺", () => {
  assert.deepEqual(splitPhaseWeeks(2, R.phaseRatios), [0, 1, 1]);
  assert.deepEqual(splitPhaseWeeks(1, R.phaseRatios), [0, 0, 1]);
});

/* ---------- ④ buildTemplatePhases ---------- */

test("在职 2h×8 周:基准表原样,时段按范围归属", () => {
  const phases = buildTemplatePhases({
    weeks: 8,
    availability: avail({
      slots: [
        { start: "12:00", end: "13:30" }, // 90min 整块 → noon
        { start: "19:30", end: "22:00" }, // 150min → evening
      ],
    }),
    rules: R,
  });
  assert.equal(phases.length, 3);
  assert.deepEqual(
    phases.map((p) => p.name),
    ["基础期", "强化期", "冲刺期"],
  );
  assert.deepEqual(phases[0].weeks, [1, 2]);
  assert.deepEqual(phases[2].weeks, [8]);

  const basic = Object.fromEntries(phases[0].weeklyTasks.map((t) => [t.type, t]));
  assert.equal(basic.words.count, 40);
  assert.equal(basic.listening.count, 1);
  assert.equal(basic.listening.slot, "noon"); // 首个 ≥60min 整块
  assert.equal(basic.writing.slot, "evening"); // 最长整块

  const sprint = Object.fromEntries(phases[2].weeklyTasks.map((t) => [t.type, t]));
  assert.equal(sprint.set.count, 1);
  assert.equal(sprint.set.slot, "evening"); // 无上午范围 → 晚上优先
  assert.ok(!("speaking" in basic)); // 基础期无口语
});

test("全职 6h×12 周:任务量 ×3,words 上限 80 生效", () => {
  const phases = buildTemplatePhases({
    weeks: 12,
    availability: avail({ mode: "fulltime", dailyHours: 6 }),
    rules: R,
  });
  const strengthen = Object.fromEntries(phases[1].weeklyTasks.map((t) => [t.type, t]));
  assert.equal(strengthen.listening.count, 6); // 2×3
  assert.equal(strengthen.writing.count, 6);
  assert.equal(strengthen.speaking.count, 3);
  assert.equal(strengthen.words.count, 80); // 30×3=90 → 上限 80
});

test("申报 dailyWords 优先于查表缩放", () => {
  const phases = buildTemplatePhases({
    weeks: 6,
    availability: avail({ dailyWords: 50, dailyHours: 3 }),
    rules: R,
  });
  for (const p of phases) {
    const t = p.weeklyTasks.find((x) => x.type === "words")!;
    assert.equal(t.count, 50);
  }
});

test("每日 <1.5h 时强化期写作降为 1;count 兜底最小值", () => {
  const phases = buildTemplatePhases({
    weeks: 6,
    availability: avail({ dailyHours: 1 }),
    rules: R,
  });
  const strengthen = Object.fromEntries(phases[1].weeklyTasks.map((t) => [t.type, t]));
  assert.equal(strengthen.writing.count, 1);
  assert.equal(strengthen.listening.count, 1); // 2×0.5=1,最小 1 兜底
});

test("科目偏好时段优先于回退规则(用户偏好即真理)", () => {
  const phases = buildTemplatePhases({
    weeks: 6,
    availability: avail({ slots: [{ start: "19:30", end: "22:00" }] }),
    prefs: { wakeTime: "07:00", bedTime: "23:00", subjectSlots: { words: "morning" } },
    rules: R,
  });
  const strengthen = Object.fromEntries(phases[1].weeklyTasks.map((t) => [t.type, t]));
  assert.equal(strengthen.words.slot, "morning"); // 无上午范围仍用偏好
});

test("slots 为空:任务不填 slot", () => {
  const phases = buildTemplatePhases({ weeks: 6, availability: avail(), rules: R });
  for (const p of phases) {
    for (const t of p.weeklyTasks) assert.equal(t.slot, undefined);
  }
});

/* ---------- ⑤ validatePhasesOutput ---------- */

const GOOD = [
  {
    name: "基础期",
    weeks: [1, 2],
    focus: "词汇打底",
    weeklyTasks: [
      { type: "words", count: 30, unit: "个/天", slot: "noon" },
      { type: "listening", count: 2, unit: "套/周" },
    ],
  },
  {
    name: "冲刺期",
    weeks: [3],
    focus: "整套模考",
    weeklyTasks: [{ type: "set", count: 1, unit: "套/周", slot: "evening" }],
  },
];

test("validatePhasesOutput:合法输出通过且周升序归一", () => {
  const r = validatePhasesOutput(structuredClone(GOOD), 3);
  assert.ok(r.ok);
  assert.deepEqual(r.phases!.map((p) => p.weeks), [
    [1, 2],
    [3],
  ]);
});

test("validatePhasesOutput:unit 由 type 查表覆写(LLM 量词写错不拒整份)", () => {
  const fixed = structuredClone(GOOD);
  fixed[0].weeklyTasks[0].unit = "个/日"; // words 写成别的量词
  fixed[0].weeklyTasks[1].unit = "次/周"; // listening 写成口语量词(曾致生成稳定失败)
  const r = validatePhasesOutput(fixed, 3);
  assert.ok(r.ok);
  assert.equal(r.phases![0].weeklyTasks[0].unit, "个/天");
  assert.equal(r.phases![0].weeklyTasks[1].unit, "套/周");
});

test("validatePhasesOutput:周缺漏 / 重复 / 未知 type / 错 slot 均拒绝", () => {
  const miss = structuredClone(GOOD);
  miss[1].weeks = [4]; // 缺第 3 周
  assert.equal(validatePhasesOutput(miss, 3).ok, false);

  const dup = structuredClone(GOOD);
  dup[1].weeks = [2];
  assert.equal(validatePhasesOutput(dup, 3).ok, false);

  const badType = structuredClone(GOOD);
  badType[0].weeklyTasks[0].type = "grammar";
  assert.equal(validatePhasesOutput(badType, 3).ok, false);

  const badSlot = structuredClone(GOOD);
  badSlot[0].weeklyTasks[0].slot = "midnight";
  assert.equal(validatePhasesOutput(badSlot, 3).ok, false);
});
