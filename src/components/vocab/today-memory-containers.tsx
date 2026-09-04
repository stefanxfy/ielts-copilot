"use client";

/**
 * TodayMemoryDrawer / TodayMemoryModal — 「今日单词记忆轨迹」两种宿主容器
 *
 * 用户约束:不跳转新页面、不与当前复习流程割裂。
 *   - Drawer:复习进行中,从顶部进度行「今日轨迹」进入,右侧滑出;
 *   - Modal :复习完成后,从「查看今日单词轨迹 →」进入,居中弹窗。
 * 两者尺寸不够看时都可「放大」到页面级覆盖层(max-w 720),右上角提供
 * 缩小(回到默认尺寸)与关闭,全程留在当前路由。
 */
import { useCallback, useEffect, useState } from "react";
import TodayMemoryPanel, {
  useTodayMemory,
} from "@/components/vocab/today-memory-panel";

/* ---------------- 公共:右上角控制钮 ---------------- */

function CornerControls(props: {
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  titleId: string;
}) {
  return (
    <div className="tm-corner">
      <button
        type="button"
        className="tm-corner-btn"
        onClick={props.onToggleExpand}
        title={props.expanded ? "缩小" : "放大"}
        aria-label={props.expanded ? "缩小" : "放大"}
      >
        {props.expanded ? (
          // 缩小:两箭头向内
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="10" y1="14" x2="3" y2="21" />
            <line x1="14" y1="10" x2="21" y2="3" />
          </svg>
        ) : (
          // 放大:两箭头向外
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="tm-corner-btn"
        onClick={props.onClose}
        aria-label="关闭"
        title="关闭"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ---------------- 抽屉宿主(复习进行中) ---------------- */

export function TodayMemoryDrawer(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error, reload } = useTodayMemory(open);
  // 关闭时一并复位放大态,下次打开回到默认尺寸
  const close = useCallback(() => {
    setExpanded(false);
    onClose();
  }, [onClose]);

  // 打开时锁背景滚动;Esc 关闭(输入聚焦不抢)
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div className={`tm-drawer-root${expanded ? " tm-expanded" : ""}`} role="dialog" aria-modal="true" aria-label="今日单词记忆轨迹">
      <div className="tm-scrim" onClick={close} />
      <aside className="tm-drawer" data-slot="tm-drawer">
        <header className="tm-head">
          <h3 className="tm-title" id="tm-drawer-title">今日单词记忆轨迹</h3>
          <CornerControls
            titleId="tm-drawer-title"
            expanded={expanded}
            onToggleExpand={() => setExpanded((e) => !e)}
            onClose={close}
          />
        </header>
        <div className="tm-body">
          <TodayMemoryPanel data={data} loading={loading} error={error} onRefresh={() => void reload()} />
        </div>
      </aside>
    </div>
  );
}

/* ---------------- 弹窗宿主(复习完成页) ---------------- */

export function TodayMemoryModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error, reload } = useTodayMemory(open);
  // 关闭时一并复位放大态,下次打开回到默认尺寸
  const close = useCallback(() => {
    setExpanded(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div className={`tm-modal-root${expanded ? " tm-expanded" : ""}`} role="dialog" aria-modal="true" aria-label="今日单词记忆轨迹">
      <div className="tm-scrim" onClick={close} />
      <div className="tm-modal" data-slot="tm-modal">
        <header className="tm-head">
          <h3 className="tm-title" id="tm-modal-title">今日单词记忆轨迹</h3>
          <CornerControls
            titleId="tm-modal-title"
            expanded={expanded}
            onToggleExpand={() => setExpanded((e) => !e)}
            onClose={close}
          />
        </header>
        <div className="tm-body">
          <TodayMemoryPanel data={data} loading={loading} error={error} onRefresh={() => void reload()} />
        </div>
      </div>
    </div>
  );
}
