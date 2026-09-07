/**
 * /api/ui-theme — 界面皮肤读写(app_settings.ui_theme)
 *
 * GET:读当前皮肤(未配置返回默认 wheat)
 * PUT:整体覆盖;非法 id 拒绝
 */
import { NextResponse } from "next/server";
import { DEFAULT_UI_THEME, isUiThemeId, type UiThemeId } from "@/lib/ui-theme";
import { getSetting, setSetting } from "@/lib/study/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "ui_theme";

export async function GET() {
  const raw = getSetting<{ theme: UiThemeId }>(KEY);
  const theme = raw && isUiThemeId(raw.theme) ? raw.theme : DEFAULT_UI_THEME;
  return NextResponse.json({ theme });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const theme = (body as { theme?: unknown } | null)?.theme;
  if (!isUiThemeId(theme)) {
    return NextResponse.json({ error: "未知皮肤 id" }, { status: 400 });
  }
  setSetting(KEY, { theme });
  return NextResponse.json({ ok: true, theme });
}
