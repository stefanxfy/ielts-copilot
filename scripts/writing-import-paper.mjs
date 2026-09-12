#!/usr/bin/env node
/**
 * scripts/writing-import-paper.mjs — 写作仿真真题导入(W1,docs/写作仿真数据模型与交互设计.md v1.1 §5)
 *
 * 数据流:papers(subject=writing) → assetsJson.entry 定位 public/exams/<examId>/writing.html
 *   → 按 <section class="test-contents"> 切 Task 1 / Task 2 区块
 *   → 题干 = 区块内非样板 <p>(剥标签);G 类书信 bullet 以 "- " 行保留;
 *     A 类 Task 1 另存区块内 <img>(相对路径解析为 /exams/** web 路径)
 *   → 样板句剔除:You should spend about / You should write at least /
 *     Summarise the information / Give reasons for your answer /
 *     Write about the following topic / Begin your letter as follows / Dear ....
 *   → promptId = "<examId>:t<taskNo>" 幂等(--fill 跳过已有;缺省即 fill 行为)
 *   → minWords/timeSuggest 从题面解析(at least N words / about N minutes),解析不到按 T1=150/20 T2=250/40 兜底
 *   → A/G 全量入库(/writing 一期只出 category=A,见 v1.1 用户拍板)
 *   → 报告落盘 data/writing/import-report.json
 *
 * 用法:
 *   node scripts/writing-import-paper.mjs            # 导入全部(幂等,已有跳过)
 *   node scripts/writing-import-paper.mjs --dry      # 只解析打印,不写库
 *   node scripts/writing-import-paper.mjs --force    # 覆盖重导(upsert 重写题干字段)
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, posix } from "node:path";

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const DRY = !!args.dry;
const FORCE = !!args.force;
const ONLY_EXAM = args.exam ?? null;

const ROOT = process.cwd();
const db = new Database(join(ROOT, "data", "app.db"));

// ===== HTML 工具 =====
const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
const stripTags = (h) => decodeEntities(h.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/** 样板句(所有卷共通的说明文字,不属于题干) */
const BOILERPLATE_RES = [
  /^you should spend about/i,
  /^you should write/i,
  /^summarise the information/i,
  /^give reasons for your answer/i,
  /^write about the following topic/i,
  /^begin your letter as follows/i,
  /^dear\s*\.{3,}/i,
];
const isBoilerplate = (t) => BOILERPLATE_RES.some((re) => re.test(t));

/** 切出单个 <section class="test-contents">…</section> 区块(div 平衡无关,section 不嵌套) */
function splitSections(html) {
  const out = [];
  const re = /<section class="test-contents[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const end = html.indexOf("</section>", m.index);
    if (end < 0) break;
    out.push(html.slice(m.index, end));
    re.lastIndex = end;
  }
  return out;
}

/** 从区块解析一道题;返回 null = 不含 Writing Task 标题(非题区块) */
function parseSection(sectionHtml, category, entryDir) {
  const t = sectionHtml.match(/test-contents__title">\s*Writing Task (\d)/);
  if (!t) return null;
  const taskNo = Number(t[1]);

  // 按出现顺序收集 <p> 与 <img>
  const tokens = [...sectionHtml.matchAll(/<(p|img)\b([^>]*)>([\s\S]*?)<\/\1>|<img\b([^>]*)>/g)];
  const lines = [];
  let imageUrl = null;
  for (const tk of tokens) {
    if (tk[1] === "p") {
      const text = stripTags(tk[3]);
      if (!text || isBoilerplate(text)) continue;
      // G 类 bullet "• xxx" → "- xxx"
      lines.push(text.replace(/^•\s*/, "- "));
    } else {
      const attrs = tk[2] ?? tk[4] ?? "";
      const src = attrs.match(/src="([^"]+)"/)?.[1];
      if (!src) continue;
      // 只认 A 类 Task 1 的图表图;G 类卷的 img 是题面文字渲染物/装饰,跳过
      if (category === "A" && taskNo === 1) {
        const norm = src.replace(/\\/g, "/");
        const web = norm.startsWith("../")
          ? posix.join(posix.dirname(entryDir), norm.slice(3))
          : posix.join(entryDir, norm);
        if (existsSync(join(ROOT, "public", web))) imageUrl = "/" + web;
      }
    }
  }

  const promptText = lines.join("\n");
  if (promptText.length < 20) return { taskNo, error: "题干过短(" + promptText.length + "字符)" };

  // minWords / timeSuggest 从题面解析,兜底 T1=150/20 T2=250/40
  const atLeast = sectionHtml.match(/at least\s*(?:<[^>]+>)?\s*(\d+)\s*words/i);
  const spendAbout = sectionHtml.match(/spend about\s*(?:<[^>]+>)?\s*(\d+)\s*minutes/i);
  const minWords = atLeast ? Number(atLeast[1]) : taskNo === 1 ? 150 : 250;
  const timeSuggest = spendAbout ? Number(spendAbout[1]) : taskNo === 1 ? 20 : 40;

  return { taskNo, promptText, minWords, timeSuggest, imageUrl };
}

// ===== 主流程 =====
const papers = db
  .prepare("SELECT exam_id, title, category, assets_json FROM papers WHERE subject='writing' ORDER BY exam_id")
  .all()
  .filter((r) => !ONLY_EXAM || r.exam_id === ONLY_EXAM);

mkdirSync(join(ROOT, "data", "writing"), { recursive: true });
const report = { total: papers.length, imported: 0, skipped: 0, failed: [], details: [] };

const upsert = DRY
  ? null
  : db.prepare(
      `INSERT INTO writing_prompts (prompt_id, task_no, category, prompt_text, min_words, time_suggest, image_url, source_ref_json)
       VALUES (@promptId, @taskNo, @category, @promptText, @minWords, @timeSuggest, @imageUrl, @sourceRefJson)
       ON CONFLICT(prompt_id) DO UPDATE SET
         task_no=@taskNo, category=@category, prompt_text=@promptText,
         min_words=@minWords, time_suggest=@timeSuggest, image_url=@imageUrl
       WHERE @force`,
    );

const tx = DRY ? null : db.transaction((rows) => rows.forEach((r) => upsert.run({ ...r, force: FORCE ? 1 : 0 })));

for (const p of papers) {
  const entry = JSON.parse(p.assets_json).entry;
  const htmlPath = join(ROOT, "public", entry);
  if (!existsSync(htmlPath)) {
    report.failed.push({ exam: p.exam_id, reason: "HTML 缺失: " + entry });
    continue;
  }
  const entryDir = posix.dirname(entry.slice(1)); // "exams/a-2025jan-writing-test1"
  const html = readFileSync(htmlPath, "utf8");
  const sections = splitSections(html);
  if (sections.length === 0) {
    report.failed.push({ exam: p.exam_id, reason: "无 test-contents 区块" });
    continue;
  }

  const rows = [];
  for (const sec of sections) {
    const parsed = parseSection(sec, p.category, entryDir);
    if (!parsed) continue;
    if (parsed.error) {
      report.failed.push({ exam: p.exam_id, task: parsed.taskNo, reason: parsed.error });
      continue;
    }
    rows.push({
      promptId: `${p.exam_id}:t${parsed.taskNo}`,
      taskNo: parsed.taskNo,
      category: p.category,
      promptText: parsed.promptText,
      minWords: parsed.minWords,
      timeSuggest: parsed.timeSuggest,
      imageUrl: parsed.imageUrl ?? null,
      sourceRefJson: JSON.stringify({ examId: p.exam_id, paperTitle: p.title }),
    });
  }

  if (rows.length === 0) {
    report.failed.push({ exam: p.exam_id, reason: "两题均解析失败" });
    continue;
  }

  const existed = DRY ? 0 : rows.filter((r) => db.prepare("SELECT 1 FROM writing_prompts WHERE prompt_id=?").get(r.promptId)).length;
  if (!DRY) tx(rows);
  report.imported += rows.length;
  report.skipped += FORCE ? 0 : existed;
  report.details.push({ exam: p.exam_id, category: p.category, tasks: rows.map((r) => "t" + r.taskNo) });
  const head = rows[0].promptText.slice(0, 46).replace(/\n/g, " ");
  console.log(`${DRY ? "[dry] " : ""}${p.exam_id} → ${rows.map((r) => r.promptId).join(", ")} | ${head}…`);
}

writeFileSync(join(ROOT, "data", "writing", "import-report.json"), JSON.stringify(report, null, 2));
console.log(
  `\n完成:${report.imported} 道题${DRY ? "(dry run 未写库)" : ""},失败 ${report.failed.length},报告 data/writing/import-report.json`,
);
if (report.failed.length) console.log("失败清单:", JSON.stringify(report.failed, null, 1));
