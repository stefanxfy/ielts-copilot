/**
 * /learn — 学习中心页(对齐 prototype view-learn)
 * 占位:M3 重写计划内的弱项雷达 / 错题本 / 专项训练/精听/生词本,统一"V2 提供"。
 * V1 之后接通 attempts/responses 数据。
 */
import Link from "next/link";

const ITEMS = [
  { title: "错题本", desc: "按题型/题号分类回顾", tag: "V2" },
  { title: "专项训练", desc: "按题型组合", tag: "V2" },
  { title: "精听训练", desc: "按音频段对位复听", tag: "V2" },
  { title: "弱项雷达", desc: "按题型统计正确率", tag: "V3" },
  { title: "分数曲线", desc: "随时间的成绩趋势", tag: "V3" },
  { title: "生词本", desc: "Anki 导出", tag: "V3" },
];

export default function LearnPage() {
  return (
    <main style={{ maxWidth: 1180, margin: "24px auto", padding: "0 20px 90px" }}>
      <h1 className="mb-1 text-[20px] font-semibold text-[var(--ink)]">学习中心</h1>
      <p className="mb-6 text-[13px] text-[var(--ink-2)]">
        错题本 / 专项训练 / 弱项雷达等 —— V2 起逐步上线。
      </p>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}
      >
        {ITEMS.map((it) => (
          <div
            key={it.title}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                marginBottom: 8,
                color: "var(--ink-3)",
                border: "1px solid var(--line)",
              }}
            >
              {it.tag}
            </span>
            <h3 className="text-[15px] font-semibold text-[var(--ink)]">{it.title}</h3>
            <p className="text-[12px] text-[var(--ink-3)]">{it.desc}</p>
          </div>
        ))}
        <div
          style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            marginTop: 16,
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          V1 当前可用:{" "}
          <Link href="/papers" className="text-[var(--brand)] hover:underline">
            进入机考模拟 →
          </Link>
        </div>
      </div>
    </main>
  );
}