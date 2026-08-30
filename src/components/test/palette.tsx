/**
 * src/components/test/palette.tsx — 题号板(M3-2)
 *
 * 视觉对齐 prototype 的 .question-palette:每 part 一行,题号可点(React onClick 即可,
 * 不需要原型的 jQuery 委托)。状态可由外部传入(后续 M3-3 接 scoring)。
 */
"use client";

export interface PaletteProps {
  parts: Array<{
    sectionNo: number;
    title: string;
    questionNumbers: number[];
  }>;
  activeSection: number;
  answered?: Record<number, string | string[]>; // qNum -> user value
  onPick?: (qNum: number) => void;
}

export function TestPalette({ parts, activeSection, answered, onPick }: PaletteProps) {
  return (
    <aside
      className="rounded-lg border p-3 text-sm"
      style={{
        background: "var(--card)",
        borderColor: "var(--line)",
      }}
    >
      {parts.map((p) => {
        const isActive = p.sectionNo === activeSection;
        return (
          <div
            key={p.sectionNo}
            className={`mb-3 last:mb-0 rounded-md p-2 ${
              isActive ? "" : ""
            }`}
            style={isActive ? { background: "var(--brand-bg)" } : undefined}
          >
            <div className="mb-2 text-[12px] font-semibold text-[var(--ink-2)]">
              {p.title}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.questionNumbers.map((qNum) => {
                const ans = answered?.[qNum];
                const tone = ans
                  ? "bg-[var(--green)] text-white border-[var(--green)]"
                  : "bg-white text-[var(--ink-2)] hover:border-[var(--brand)]";
                return (
                  <button
                    key={qNum}
                    type="button"
                    onClick={() => onPick?.(qNum)}
                    className={`min-w-7 rounded border px-2 py-1 text-[12px] ${tone}`}
                    style={{ borderColor: "var(--line)" }}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}