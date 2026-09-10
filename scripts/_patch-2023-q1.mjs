/** 补抓 2023 年 1-3 月缺口卷(用 cookie+Referer 模式)
 *
 * 1-3 月按 SOURCE 表拉,4-12 月之前 iot-fetch 已抓全,跳过。
 * 拉失败:记录,不抛错,后续 _batch5.mjs 跳过缺料套。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/fanyunxu/Desktop/myproject/ielts-copilot";
const COOKIE = readFileSync(join(ROOT, "data/iot/cookies.txt"), "utf8").trim();
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://www.ieltsonlinetests.com";

const SUBJ_DIR = { listening: "听力", reading: "阅读", writing: "写作", speaking: "口语" };

// 仅 1-3 月,完整 SOURCE(从 _patch-2023.mjs 复制)
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
};

function fetchOne(slug) {
  const url = `${BASE}/zh-hans/${encodeURIComponent(slug)}`;
  const out = {};
  for (const [k, u] of Object.entries({ test: url, solution: url + "/solution" })) {
    try {
      const args = [
        "-sL", "-A", UA, "--max-time", "90",
        "-H", `Cookie: ${COOKIE}`,
        "-H", "Accept: text/html",
        "-H", "Accept-Language: zh-CN,zh;q=0.9",
        "-H", "Referer: https://www.ieltsonlinetests.com/zh-hans",
      ];
      const buf = execFileSync("curl", args.concat(u), { maxBuffer: 100 * 1024 * 1024, timeout: 120_000 });
      out[k] = buf;
    } catch (e) {
      out[k] = null;
      console.error(`  ✗ ${k} ${slug}: ${e.message?.slice(0, 100)}`);
    }
  }
  return out;
}

let ok = 0, fails = [];
for (const [month, sets] of Object.entries(SOURCE)) {
  for (const [tNo, subs] of Object.entries(sets)) {
    for (const [subj, slug] of Object.entries(subs)) {
      const dir = join(ROOT, "questions", SUBJ_DIR[subj], "2023", slug);
      const testFile = join(dir, "test.html");
      const solFile = join(dir, "solution.html");
      const needTest = !existsSync(testFile) || statSync(testFile).size < 5000;
      const needSol = !existsSync(solFile) || statSync(solFile).size < 5000;
      if (!needTest && !needSol) continue; // 已齐
      console.log(`[${month}-T${tNo}-${subj}] ${slug}`);
      mkdirSync(dir, { recursive: true });
      const r = fetchOne(slug);
      if (needTest && r.test) {
        writeFileSync(testFile, r.test);
        console.log(`  test.html ${r.test.length}B`);
        ok++;
      } else if (needTest) {
        fails.push(`${month}-T${tNo}-${subj} test.html`);
      }
      if (needSol && r.solution) {
        writeFileSync(solFile, r.solution);
        console.log(`  solution.html ${r.solution.length}B`);
        ok++;
      } else if (needSol) {
        fails.push(`${month}-T${tNo}-${subj} solution.html`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}
console.log(`\n补抓完成:ok=${ok} 失败=${fails.length}`);
if (fails.length) console.log("失败清单:", fails.join("\n"));