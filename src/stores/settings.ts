/**
 * src/stores/settings.ts — 设置页服务端状态(zustand,M1 步骤 5)
 *
 * 持有 /api/config 的脱敏视图 + fileMtime(乐观并发基准)。
 * 表单草稿不入 store(局部 state 即可),store 只管「与服务端同步的那份」。
 */
import { create } from "zustand";

export interface ConfigView {
  server: { port: number; host: string };
  llm: {
    provider: "openai" | "anthropic" | "openai-compatible";
    baseUrl: string;
    gradingModel: string;
    timeoutSec: number;
    apiKeySet: boolean;
    apiKeyMasked: string;
  };
}

interface SettingsState {
  view: ConfigView | null;
  fileMtime: number | null;
  fileError: string | null;
  loading: boolean;
  load: () => Promise<void>;
  /** PUT 成功后直接采用响应(免一次往返) */
  apply: (view: ConfigView, fileMtime: number) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  view: null,
  fileMtime: null,
  fileError: null,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const resp = await fetch("/api/config", { cache: "no-store" });
      const data = await resp.json();
      set({
        view: data.config ?? null,
        fileMtime: data.fileMtime ?? null,
        fileError: data.fileError ?? null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
  apply: (view, fileMtime) => set({ view, fileMtime, fileError: null }),
}));
