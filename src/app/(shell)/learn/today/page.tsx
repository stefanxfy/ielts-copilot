"use client";

/**
 * /learn/today — 今日单词记忆轨迹(整页版式)
 *
 * 完整方案里与抽屉/弹窗并存的整体视图:同样的 TodayMemoryPanel,
 * 适合安静地翻整天的评分流水;复习流程内请用抽屉/弹窗入口(不跳页约束)。
 */
import Link from "next/link";
import TodayMemoryPanel, {
  useTodayMemory,
} from "@/components/vocab/today-memory-panel";

export default function TodayMemoryPage() {
  // 整页常驻,open 恒 true → 首次挂载即拉取
  const { data, loading, error, reload } = useTodayMemory(true);
  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <header>
        <div className="text-[12px] text-muted-foreground">
          <Link href="/learn" className="hover:underline">
            背单词
          </Link>
          <span className="px-1.5">/</span>
          <span>今日记忆轨迹</span>
        </div>
        <h2 className="mt-1 text-xl">今日单词记忆轨迹</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          统计与轨迹按今日最后一次评分归类;点开任意词查看 FSRS 遗忘曲线(稳定度 S / 难度 D 逐次演变)。
        </p>
      </header>
      <div className="tm-page-list">
        <TodayMemoryPanel
          data={data}
          loading={loading}
          error={error}
          onRefresh={() => void reload()}
        />
      </div>
    </div>
  );
}
