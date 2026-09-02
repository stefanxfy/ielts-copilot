"use client";

/**
 * /learn 学习中心(复刻原型 view-learn)
 * 提分闭环功能占位:V2/V3 逐版开放,点击 toast 说明
 */

import { toast } from "sonner";

const FEATURES = [
  { name: "错题本", ver: "V2", desc: "按题型归类错题，快速定位薄弱题型" },
  { name: "专项训练", ver: "V2", desc: "只刷某一种题型，随机抽题反复练" },
  { name: "精听训练", ver: "V2", desc: "听力逐句循环、跟读、听写" },
  { name: "弱项雷达", ver: "V3", desc: "题型维度能力分布，一眼看清短板" },
  { name: "分数曲线", ver: "V3", desc: "历次模考 band 追踪，看趋势" },
  { name: "生词本", ver: "V3", desc: "阅读点词收藏，导出 Anki 背单词" },
];

export default function LearnPage() {
  return (
    <>
      <h2 className="text-xl">学习中心</h2>
      <p className="mb-5 text-[13px] text-muted-foreground">提分闭环功能 · 按版本逐步开放</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => toast.info(`${f.name} ${f.ver} 提供`)}
            className="card-float cursor-pointer rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              {f.name}
              <span className="rounded-full border border-border px-[7px] py-px text-[10px] font-normal text-muted-foreground">
                {f.ver}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{f.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
