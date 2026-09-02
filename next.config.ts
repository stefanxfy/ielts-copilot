import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* standalone 产物(PRD §3.1「文件夹即应用」):build 产出 .next/standalone,
     步骤 6 的 postbuild.mjs 修补为 next-server/(拷 migrations/public/static/better-sqlite3) */
  output: "standalone",
  /* Turbopack 根推断:家目录有 package-lock.json 时 Next 会误把 /Users/<me> 当 workspace 根,
     导致 @vercel/turbopack-next 内部模块(如 google 字体 loader)解析失败、字体 404。显式钉住。 */
  turbopack: {
    root: __dirname,
  },
  /* better-sqlite3 是原生模块(.node),不进 bundle —— 否则 standalone 运行时加载失败
     (docs/M1-实施计划.md 风险 #1) */
  serverExternalPackages: ["better-sqlite3"],
  async rewrites() {
    return [
      /* 静态卷页是从 Drupal 站抓取的原样页面,卷页 JS 会向原站后端发访问统计:
         POST /core/modules/statistics/statistics.php
         POST /zh-hans/history/<nid>/read (已读上报)
         本地无 Drupal 后端,直接 404 刷屏。重写到 /api/noop(204)静默吞掉。 */
      {
        source: "/core/modules/statistics/statistics.php",
        destination: "/api/noop",
      },
      {
        source: "/zh-hans/history/:nid/read",
        destination: "/api/noop",
      },
    ];
  },
};

export default nextConfig;
