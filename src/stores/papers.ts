/**
 * src/stores/papers.ts — 题库/详情页 zustand store(M2 步骤 4)
 *
 * 持有 /api/papers 的列表 + 单卷详情 + 详情加载状态。
 */
import { create } from "zustand";

export interface PaperSummary {
  id: number;
  slug: string;
  title: string;
  category: "A" | "G";
  skill: string;
  status: "DRAFT" | "PUBLISHED";
  questionCount: number;
  writingTaskCount: number;
}

export interface PaperDetail extends PaperSummary {
  source: string | null;
  durationSec: number;
  bandTable: Array<[number, number]>;
  sections: Array<{ sectionNo: number; sectionType: string; title: string | null; questionCount: number }>;
}

interface PapersState {
  list: PaperSummary[];
  detail: PaperDetail | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  loadDetail: (slug: string) => Promise<void>;
}

export const usePapers = create<PapersState>((set) => ({
  list: [],
  detail: null,
  loading: false,
  detailLoading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const r = await fetch("/api/papers", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      set({ list: data.papers ?? [], loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },
  loadDetail: async (slug: string) => {
    set({ detailLoading: true, detail: null, error: null });
    try {
      const r = await fetch(`/api/papers/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      set({ detail: data.paper ?? null, detailLoading: false });
    } catch (e) {
      set({ detailLoading: false, error: String(e) });
    }
  },
}));