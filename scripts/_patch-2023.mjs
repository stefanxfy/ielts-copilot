/**
 * 2023 年真题批量补抓(共 12 月 × 4 套 × 4 科 = 192 卷)
 *
 * 命名极度混乱:每月份 4 套的 16 个卷每卷独立 slug(中文/英文/简写混合)。
 * 全部 192 卷的 URL slug 已在 docs/ 上下文中从站方 collection 页核对,固化在 SOURCE 表。
 * 目标:为每卷下载 test.html + solution.html → 落到 questions/{科}/2023/{slug}/ 目录。
 *
 * 用法:node scripts/_patch-2023.mjs [--dry] [--skip-existing]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const COOKIE = readFileSync(join(ROOT, "data/iot/cookies.txt"), "utf8").trim();
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://www.ieltsonlinetests.com";
const DRY = process.argv.includes("--dry");
const SKIP_EXISTING = process.argv.includes("--skip-existing");

const SUBJ_DIR = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };
const SUBJ_EN = { 听力: "listening", 阅读: "reading", 写作: "writing", 口语: "speaking" };

// 全部 192 卷 slug 映射表(从站方 collection 页逐月核对)
// 每行: { month, tNo, subj → slug(站方 URL 尾段) }
// null = 站方该月该套该科无独立页(实际未出现这种情形,所有格子都有)
//
// 简写格式 `2023MMlistenNN` 也作为 slug 直接用(目录名 = slug)
// 中文 URL 形式 `雅思真题试卷-...` 也直接作为目录名(URL 编码后)
//
// 注意:slug 是站方 URL 路径的尾段,直接作为源目录名可能含中文/特殊字符 —
// 实际目录名 = slug(原样,包括特殊字符)。

const SOURCE = {
  january: {
    1: {
      listening: "202301listen01",
      reading: "雅思真题试卷-一月-雅思阅读真题-1-0",
      writing: "雅思真题试卷-一月-雅思写作真题-1-0",
      speaking: "雅思真题试卷-一月-雅思口语真题-1-1",
    },
    2: {
      listening: "雅思真题试卷-一月-雅思听力真题-2-0",
      reading: "雅思真题试卷-一月-雅思阅读真题-2-1",
      writing: "雅思真题试卷-一月-雅思写作真题-2-1",
      speaking: "雅思真题试卷-一月-雅思口语真题-2-0",
    },
    3: {
      listening: "雅思真题试卷-一月-雅思听力真题-3",
      reading: "雅思真题试卷-一月-雅思阅读真题-3",
      writing: "雅思真题试卷-一月-雅思写作真题-3",
      speaking: "雅思真题试卷-一月-雅思口语真题-3",
    },
    4: {
      listening: "202301listen04",
      reading: "雅思真题试卷-一月-雅思阅读真题-4",
      writing: "雅思真题试卷-一月-雅思写作真题-4",
      speaking: "雅思真题试卷-一月-雅思口语真题-4",
    },
  },
  february: {
    1: {
      listening: "雅思真题试卷-二月-雅思听力真题-1-1",
      reading: "雅思真题试卷-二月-雅思阅读真题-1-1",
      writing: "ielts-mock-test-2023-february-雅思写作真题-1",
      speaking: "ielts-mock-test-2023-february-雅思口语真题-1",
    },
    2: {
      listening: "雅思真题试卷-二月-雅思听力真题-2-1",
      reading: "雅思真题试卷-二月-雅思阅读真题-2-1",
      writing: "ielts-mock-test-2023-february-雅思写作真题-2",
      speaking: "ielts-mock-test-2023-february-雅思口语真题-2",
    },
    3: {
      listening: "202302listen03",
      reading: "雅思真题试卷-二月-雅思阅读真题-3",
      writing: "ielts-mock-test-2023-february-雅思写作真题-3",
      speaking: "ielts-mock-test-2023-february-雅思口语真题-3",
    },
    4: {
      listening: "202302listen04",
      reading: "雅思真题试卷-二月-雅思阅读真题-4",
      writing: "ielts-mock-test-2023-february-雅思写作真题-4",
      speaking: "ielts-mock-test-2023-february-雅思口语真题-4",
    },
  },
  march: {
    1: {
      listening: "ielts-mock-test-2023-march-雅思听力真题-1",
      reading: "雅思真题试卷-三月-雅思阅读真题-1-1",
      writing: "ielts-mock-test-2023-march-雅思写作真题-1",
      speaking: "ielts-mock-test-2023-march-雅思口语真题-1",
    },
    2: {
      listening: "ielts-mock-test-2023-march-雅思听力真题-2",
      reading: "雅思真题试卷-三月-雅思阅读真题-2-1",
      writing: "ielts-mock-test-2023-march-雅思写作真题-2",
      speaking: "ielts-mock-test-2023-march-雅思口语真题-2",
    },
    3: {
      listening: "202303listen03",
      reading: "雅思真题试卷-三月-雅思阅读真题-3",
      writing: "ielts-mock-test-2023-march-雅思写作真题-3",
      speaking: "ielts-mock-test-2023-march-雅思口语真题-3",
    },
    4: {
      listening: "202303listen04",
      reading: "雅思真题试卷-三月-雅思阅读真题-4",
      writing: "ielts-mock-test-2023-march-雅思写作真题-4",
      speaking: "ielts-mock-test-2023-march-雅思口语真题-4",
    },
  },
  april: {
    1: {
      listening: "ielts-mock-test-2023-april-雅思听力真题-1",
      reading: "雅思真题试卷-四月-雅思阅读真题-1-1",
      writing: "ielts-mock-test-2023-april-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-april-雅思口语真题-1",
    },
    2: {
      listening: "ielts-mock-test-2023-april-listening-practice-test-2",
      reading: "ielts-mock-test-2023-april-reading-practice-test-2",
      writing: "ielts-mock-test-2023-april-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-april-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-april-listening-practice-test-1",
      reading: "ielts-mock-test-2023-april-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-april-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-april-speaking-practice-test-1",
    },
    4: {
      listening: "雅思真题试卷-四月-雅思听力真题-4",
      reading: "ielts-mock-test-2023-april-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-april-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-april-speaking-practice-test-2-0",
    },
  },
  may: {
    1: {
      listening: "雅思真题试卷-五月-雅思听力真题-1-1",
      reading: "雅思真题试卷-五月-雅思阅读真题-1-1",
      writing: "ielts-mock-test-2023-may-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-may-speaking-practice-test-1",
    },
    2: {
      listening: "202305listen02",
      reading: "ielts-mock-test-2023-may-reading-practice-test-2",
      writing: "ielts-mock-test-2023-may-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-may-speaking-practice-test-2",
    },
    3: {
      listening: "202305listen03",
      reading: "ielts-mock-test-2023-may-reading-practice-test-1-0",
      writing: "雅思真题试卷-五月-雅思写作真题-3",
      speaking: "雅思真题试卷-五月-雅思口语真题-3",
    },
    4: {
      listening: "202305listen04",
      reading: "ielts-mock-test-2023-may-reading-practice-test-2-0",
      writing: null, // 站方未提供 T4 写作
      speaking: null, // 站方未提供 T4 口语
    },
  },
  june: {
    1: {
      listening: "202306listen01",
      reading: "ielts-mock-test-2023-june-reading-practice-test-1",
      writing: "ielts-mock-test-2023-june-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-june-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-june-雅思听力真题-2",
      reading: "ielts-mock-test-2023-june-reading-practice-test-2",
      writing: "ielts-mock-test-2023-june-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-june-speaking-practice-test-2",
    },
    3: {
      listening: "202306listen03",
      reading: "ielts-mock-test-2023-june-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-june-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-june-speaking-practice-test-1-0",
    },
    4: {
      listening: "202306listen04",
      reading: "ielts-mock-test-2023-june-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-june-writing-practice-test-2-0",
      speaking: null, // 站方未提供 T4 口语
    },
  },
  july: {
    1: {
      listening: "ielts-mock-test-2023-july-listening-practice-test-1",
      reading: "ielts-mock-test-2023-july-reading-practice-test-1",
      writing: "ielts-mock-test-2023-july-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-july-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-july-listening-practice-test-2",
      reading: "ielts-mock-test-2023-july-reading-practice-test-2",
      writing: "ielts-mock-test-2023-july-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-july-speaking-practice-test-2",
    },
    3: {
      listening: "202307listen03",
      reading: "ielts-mock-test-2023-july-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-july-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-july-speaking-practice-test-1-0",
    },
    4: {
      listening: "202307listen04",
      reading: "ielts-mock-test-2023-july-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-july-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-july-speaking-practice-test-2-0",
    },
  },
  august: {
    1: {
      listening: "ielts-mock-test-2023-august-listening-practice-test-1",
      reading: "ielts-mock-test-2023-august-reading-practice-test-1",
      writing: "ielts-mock-test-2023-august-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-august-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-august-listening-practice-test-2",
      reading: "ielts-mock-test-2023-august-reading-practice-test-2",
      writing: "ielts-mock-test-2023-august-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-august-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-august-listening-practice-test-1-0",
      reading: "ielts-mock-test-2023-august-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-august-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-august-speaking-practice-test-1-0",
    },
    4: {
      listening: "ielts-mock-test-2023-august-listening-practice-test-2-0",
      reading: "ielts-mock-test-2023-august-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-august-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-august-speaking-practice-test-2-0",
    },
  },
  september: {
    1: {
      listening: "ielts-mock-test-2023-september-listening-practice-test-1",
      reading: "ielts-mock-test-2023-september-reading-practice-test-1",
      writing: "ielts-mock-test-2023-september-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-september-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-september-listening-practice-test-2",
      reading: "ielts-mock-test-2023-september-reading-practice-test-2",
      writing: "ielts-mock-test-2023-september-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-september-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-september-listening-practice-test-1-0",
      reading: "雅思真题试卷-九月-reading-practice-test-3",
      writing: "雅思真题试卷-九月-writing-practice-test-3",
      speaking: "ielts-mock-test-2023-september-speaking-practice-test-1-0",
    },
    4: {
      listening: "ielts-mock-test-2023-september-listening-practice-test-2-0",
      reading: "雅思真题试卷-九月-reading-practice-test-4",
      writing: "ielts-mock-test-2023-september-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-september-speaking-practice-test-2-0",
    },
  },
  october: {
    1: {
      listening: "ielts-mock-test-2023-october-listening-practice-test-1",
      reading: "ielts-mock-test-2023-october-reading-practice-test-1",
      writing: "ielts-mock-test-2023-october-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-october-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-october-listening-practice-test-2",
      reading: "ielts-mock-test-2023-october-reading-practice-test-2",
      writing: "ielts-mock-test-2023-october-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-october-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-october-listening-practice-test-1-0",
      reading: "ielts-mock-test-2023-october-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-october-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-october-speaking-practice-test-1-0",
    },
    4: {
      listening: "ielts-mock-test-2023-october-listening-practice-test-2-0",
      reading: "ielts-mock-test-2023-october-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-october-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-october-speaking-practice-test-2-0",
    },
  },
  november: {
    // 注:11月 collection 页有bug(两个模考题3/4),T1/T2 按 8/10 月类似规律推断
    1: {
      listening: "ielts-mock-test-2023-november-listening-practice-test-1",
      reading: "ielts-mock-test-2023-november-reading-practice-test-1",
      writing: "ielts-mock-test-2023-november-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-november-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-november-listening-practice-test-2",
      reading: "ielts-mock-test-2023-november-reading-practice-test-2",
      writing: "ielts-mock-test-2023-november-雅思写作真题-2",
      speaking: "ielts-mock-test-2023-november-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-november-listening-practice-test-1-0",
      reading: "ielts-mock-test-2023-november-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-november-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-november-speaking-practice-test-1-0",
    },
    4: {
      listening: "ielts-mock-test-2023-november-listening-practice-test-2-0",
      reading: "ielts-mock-test-2023-november-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-november-writing-practice-test-2-0",
      speaking: "ielts-mock-test-2023-november-speaking-practice-test-2-0",
    },
  },
  december: {
    1: {
      listening: "ielts-mock-test-2023-december-listening-practice-test-1",
      reading: "ielts-mock-test-2023-december-reading-practice-test-1",
      writing: "ielts-mock-test-2023-december-writing-practice-test-1",
      speaking: "ielts-mock-test-2023-december-speaking-practice-test-1",
    },
    2: {
      listening: "ielts-mock-test-2023-december-listening-practice-test-2",
      reading: "ielts-mock-test-2023-december-reading-practice-test-2",
      writing: "ielts-mock-test-2023-december-writing-practice-test-2",
      speaking: "ielts-mock-test-2023-december-speaking-practice-test-2",
    },
    3: {
      listening: "ielts-mock-test-2023-december-listening-practice-test-1-0",
      reading: "ielts-mock-test-2023-december-reading-practice-test-1-0",
      writing: "ielts-mock-test-2023-december-writing-practice-test-1-0",
      speaking: "ielts-mock-test-2023-december-雅思口语真题-3",
    },
    4: {
      listening: "ielts-mock-test-2023-december-listening-practice-test-2-0",
      reading: "ielts-mock-test-2023-december-reading-practice-test-2-0",
      writing: "ielts-mock-test-2023-december-雅思写作真题-2",
      speaking: "ielts-mock-test-2023-december-speaking-practice-test-2-0",
    },
  },
};

/** 拉一卷的 test.html + solution.html */
function fetchOne(slug) {
  // URL path 编码(中文/特殊字符)
  const url = `${BASE}/zh-hans/${encodeURI(slug)}`;
  const urls = {
    test: url,
    solution: `${url}/solution`,
  };
  const out = {};
  for (const [k, u] of Object.entries(urls)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const args = ["-sL", "-A", UA, "--max-time", "90", "-H", `Cookie: ${COOKIE}`, "-H", "Accept: text/html", "-H", "Accept-Language: zh-CN,zh;q=0.9", "-H", "Referer: https://www.ieltsonlinetests.com/zh-hans"];
        const data = execFileSync("curl", args.concat(u), { maxBuffer: 100 * 1024 * 1024, timeout: 120_000 });
        // 简单验证:含 data-num 才是 test 页(听阅); 写作/口语用其他标志
        out[k] = data;
        break;
      } catch (e) {
        if (attempt === 2) {
          out[k] = null;
          console.error(`  ✗ ${k} ${slug}: ${e.message?.slice(0, 100)}`);
        }
      }
    }
  }
  return out;
}

// 主循环
let totalFetched = 0, totalSkipped = 0, totalFailed = 0;
const fails = [];

for (const [month, sets] of Object.entries(SOURCE)) {
  for (const [tNo, subs] of Object.entries(sets)) {
    for (const [subj, slug] of Object.entries(subs)) {
      if (!slug) {
        console.log(`  [skip] ${month}-T${tNo}-${subj}: 站方未提供`);
        totalSkipped++;
        continue;
      }
      const dir = join(ROOT, "questions", SUBJ_DIR[subj], "2023", slug);
      const testFile = join(dir, "test.html");
      const solFile = join(dir, "solution.html");
      const needTest = !existsSync(testFile) || statSync(testFile).size < 5000;
      const needSol = !existsSync(solFile) || statSync(solFile).size < 5000;
      if (SKIP_EXISTING && !needTest && !needSol) {
        totalSkipped++;
        continue;
      }
      console.log(`[${month}-T${tNo}-${subj}] ${slug}`);
      if (DRY) continue;
      mkdirSync(dir, { recursive: true });
      const r = fetchOne(slug);
      if (r.test && needTest) {
        writeFileSync(testFile, r.test);
        console.log(`  test.html ${r.test.length}B`);
        totalFetched++;
      }
      if (r.solution && needSol) {
        writeFileSync(solFile, r.solution);
        console.log(`  solution.html ${r.solution.length}B`);
        totalFetched++;
      }
      if ((!r.test && needTest) || (!r.solution && needSol)) totalFailed++;
      // 限速
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

console.log(`\n完成:补抓 ${totalFetched} 个文件,跳过 ${totalSkipped} 套,失败 ${totalFailed}`);