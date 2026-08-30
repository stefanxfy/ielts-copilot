import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 本仓库非工程目录:原型/真题源/解析脚本不进 eslint(全是第三方 minified JS 与存档资产)
    "prototype/**",
    "questions/**",
    "exam-analysis/**",
    "docs/**",
    "next-server/**",
  ]),
]);

export default eslintConfig;
