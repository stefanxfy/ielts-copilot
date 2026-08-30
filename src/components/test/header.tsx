/**
 * src/components/test/header.tsx — 机考页顶栏(M3-2)
 *
 * 视觉对齐 prototype 的 .realtest-header:蓝渐变 logo + 卷名 brand + 倒计时 + 提交按钮 + 草稿本图标。
 * 颜色已通过 globals.css 走 --brand / --brand-deep。
 * 倒计时走 useCountdown hook(M3-4 接入)。
 */
"use client";

import Link from "next/link";

export interface TestHeaderProps {
  title: string;
  brand: string;
  remainingSec: number;
  totalSec: number;
  onSubmit?: () => void;
  rightSlot?: React.ReactNode; // 听力音量 UI / 写作草稿本等扩展点
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TestHeader({ title, brand, remainingSec, totalSec, onSubmit, rightSlot }: TestHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-4 px-5 text-white"
      style={{
        height: 52,
        background: "linear-gradient(180deg, #1a6feb 0%, #0d4fa8 100%)",
        boxShadow: "0 2px 6px rgba(13, 52, 96, .18)",
      }}
    >
      {/* Logo + brand */}
      <div
        className="flex items-center justify-center rounded-lg font-bold text-sm"
        style={{ width: 30, height: 30, background: "rgba(255,255,255,.18)" }}
        aria-label="IELTS Copilot"
      >
        雅
      </div>
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="text-[15px] font-semibold">
          IELTS 本地机考
        </span>
        <span className="text-[11px] opacity-85">{brand}</span>
      </div>
      <div className="hidden md:block text-[13px] text-white/85">
        {title}
      </div>

      <div className="flex-1" />

      {/* 倒计时 */}
      <div className="flex flex-col items-center justify-center leading-none">
        <span className="text-[18px] font-semibold tabular-nums">
          {fmtTime(remainingSec)}
        </span>
        <span className="text-[10px] opacity-75">
          {remainingSec === 0 ? "已到时" : "剩余"}
        </span>
      </div>

      {rightSlot && (
        <div className="ml-3 hidden md:flex items-center gap-2">{rightSlot}</div>
      )}

      {/* 提交按钮(原型 .realtest-header__bt-submit 蓝主按钮) */}
      <button
        type="button"
        onClick={onSubmit}
        className="ml-3 rounded-md bg-white px-4 py-1.5 text-[13px] font-medium text-[var(--brand-deep)] hover:opacity-90"
      >
        交卷
      </button>

      <Link href="/papers" className="ml-1 text-[12px] text-white/70 hover:text-white">
        返回
      </Link>
    </header>
  );
}