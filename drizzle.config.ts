import { defineConfig } from "drizzle-kit";

/**
 * 开发期 `npm run db:generate`:schema.ts 变更 → 生成版本化 SQL 到 src/db/migrations
 * (迁移文件进 git,schema 演进可追溯;见 docs/M1-实施计划.md「迁移策略」)。
 * `npm run db:studio` 需要真实库文件,指向 data/app.db。
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.IELTS_DB_FILE ?? "./data/app.db",
  },
});
