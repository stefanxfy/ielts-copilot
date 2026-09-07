/**
 * scripts/ts-alias-register.mjs — 注册 "@/..." 别名解析钩子(node:test 运行 .ts 单测用)
 *
 * 用法:npm run test:plan
 *   node --experimental-strip-types --import ./scripts/ts-alias-register.mjs --test tests/*.test.ts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./ts-alias-hook.mjs", import.meta.url));
