/**
 * /(仪表盘 + 学习中心合一页)— 对齐 prototype index.html
 *
 * 三 tab 视图复用顶栏 tab 切换(仪表盘 / 机考模拟 / 学习中心)。
 * prototype 学习中心 6 张 paper-card:错题本/专项/精听/弱项雷达/分数曲线/生词本
 * (V2/V3 提供)— 本地做 2 个可点("机考模拟"和"近期做题历史"),其余标"V2 提供"。
 *
 * 原型配色:.view 主区 1180px 居中;.paper-card 圆角 12px + 灰边框 + hover 阴影。
 */
import Link from "next/link";
import { headers } from "next/headers";

interface PaperCard {
  href?: string;
  title: string;
  desc: string;
  tag?: string;
  status?: "available" | "coming";
}

const FEATURE_CARDS: PaperCard[] = [
  {
    href: "/papers",
    title: "机考模拟",
    desc: "完整还原 IELTS 真考界面 · 进入真考模式",
    tag: "已上线",
    status: "available",
  },
  {
    title: "近期做题历史",
    desc: "查看最近 5 次做题记录与得分(数据来源 attempts/responses)",
    tag: "V1",
    status: "coming",
  },
  {
    title: "错题本",
    desc: "按题型/题号分类的错题回顾(原型 V2 提供)",
    tag: "V2",
    status: "coming",
  },
  {
    title: "专项训练",
    desc: "按题型组合的练习集(M2 入库后再展开)",
    tag: "V2",
    status: "coming",
  },
  {
    title: "弱项雷达",
    desc: "按题型统计正确率,V3 提供",
    tag: "V3",
    status: "coming",
  },
  {
    title: "生词本 / 分数曲线",
    desc: "Anki 导出与时间序列分数曲线,V3 提供",
    tag: "V3",
    status: "coming",
  },
];

function PaperCardView({ card }: { card: PaperCard }) {
  const isAvailable = card.status === "available" && card.href;
  const body = (
    <div
      className="paper-card"
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        position: "relative",
        cursor: isAvailable ? "pointer" : "default",
        transition: "box-shadow .15s",
      }}
    >
      {card.tag && (
        <span
          className="paper-card-tag"
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
          {card.tag}
        </span>
      )}
      <h3 className="mb-0.5 text-[15px] font-semibold text-[var(--ink)]">{card.title}</h3>
      <p className="text-[12px] text-[var(--ink-3)]">{card.desc}</p>
      {isAvailable && (
        <span
          className="paper-card-go"
          style={{
            marginTop: 12,
            display: "inline-block",
            background: "var(--brand)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
          }}
        >
          进入
        </span>
      )}
    </div>
  );
  return isAvailable ? <Link href={card.href!}>{body}</Link> : body;
}

export default async function DashboardPage() {
  // 服务端读 health → SSR 三状态卡
  const h = await import("next/headers");
  const hdrs = await h.headers();
  const host = hdrs.get("host") ?? "127.0.0.1:3177";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";

  let health: { ok: boolean; db: boolean; papers: number; configLoaded: boolean; llmConfigured: boolean } | null = null;
  try {
    const r = await fetch(`${proto}://${host}/api/health`, { cache: "no-store" });
    health = await r.json();
  } catch {
    health = null;
  }

  return (
    <main style={{ maxWidth: 1180, margin: "24px auto", padding: "0 20px 90px" }}>
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="mb-1 text-[20px] font-semibold text-[var(--ink)]">学习中心</h1>
        <p className="text-[13px] text-[var(--ink-2)]">
          选择下方任一功能开始。A 类学术类优先,G 类培训类兼容(V1 后再议)。
        </p>
      </div>

      {/* 三状态卡(对齐原型 dashboard) */}
      <div
        className="grid-3 mb-6"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}
      >
        <StatusCard
          label="数据库"
          ok={!!health?.db}
          desc={health?.db ? `已连接 · 试卷 ${health.papers} 份` : "连接失败"}
        />
        <StatusCard
          label="配置"
          ok={health?.configLoaded ?? false}
          desc={health?.configLoaded ? "config.json 已加载" : "未加载"}
        />
        <StatusCard
          label="AI 批改"
          ok={health?.llmConfigured ?? false}
          desc={health?.llmConfigured ? "API Key 已配置" : "未配置(去设置页填写)"}
        />
      </div>

      {/* 学习中心 6 张 paper-card */}
      <h2 className="mb-3 text-[14px] font-medium text-[var(--ink-2)]">功能列表</h2>
      <div
        className="grid-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {FEATURE_CARDS.map((c) => (
          <PaperCardView key={c.title} card={c} />
        ))}
      </div>
    </main>
  );
}

function StatusCard({ label, ok, desc }: { label: string; ok: boolean; desc: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div className="flex items-center gap-2 text-[14px]">
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 999,
            background: ok ? "var(--green)" : "var(--red)",
          }}
        />
        <strong>{label}</strong>
      </div>
      <p className="mt-1 text-[12px] text-[var(--ink-2)]">{desc}</p>
    </div>
  );
}