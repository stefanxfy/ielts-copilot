import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* standalone 产物(PRD §3.1「文件夹即应用」):build 产出 .next/standalone,
     步骤 6 的 postbuild.mjs 修补为 next-server/(拷 migrations/public/static/better-sqlite3) */
  output: "standalone",
  /* better-sqlite3 是原生模块(.node),不进 bundle —— 否则 standalone 运行时加载失败
     (docs/M1-实施计划.md 风险 #1) */
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
