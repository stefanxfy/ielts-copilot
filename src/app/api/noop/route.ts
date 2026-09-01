/**
 * /api/noop — 静默 204,配合 next.config.ts rewrites 吞掉静态卷页
 * 发往原 Drupal 后端的统计上报(statistics.php 与 history/…/read)。
 * 本地机考不需要这些遥测,返回 204 让 jQuery ajax 静默成功,console 不再刷 404。
 */
export async function POST() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response(null, { status: 204 });
}
