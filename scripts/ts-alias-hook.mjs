/**
 * scripts/ts-alias-hook.mjs — node:test 运行 .ts 单测时的 "@/..." 别名解析钩子
 *
 * 项目运行时别名由 Next/tsc paths 处理;node --test 直跑 .ts 时需要这里手动映射:
 *   "@/lib/study/date" → <root>/src/lib/study/date.ts
 * TS 语法由 Node 22 --experimental-strip-types 剥离(项目仅用可擦除类型,无 enum/namespace)。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  // "@/..." 别名 → src/ 下补 .ts 扩展
  if (specifier.startsWith("@/")) {
    const base = path.join(ROOT, "src", specifier.slice(2));
    for (const cand of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(cand)) {
        return next(pathToFileURL(cand).href, context);
      }
    }
  }
  // 相对导入无扩展名(如 src/db/index.ts 的 "./schema")→ 补 .ts
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    !path.extname(specifier)
  ) {
    const parentPath = new URL(context.parentURL).pathname;
    const base = path.resolve(path.dirname(parentPath), specifier);
    for (const cand of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(cand)) {
        return next(pathToFileURL(cand).href, context);
      }
    }
  }
  return next(specifier, context);
}
