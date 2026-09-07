#!/usr/bin/env node
/**
 * 音标一致性修复(2026-09-07):11 词 syl 拆分与 phonetic_uk 对齐
 *
 * 起因:check-phonetic-consistency.mjs 首跑抓出 11/100 词不一致。
 * 权威口径:phonetic_uk 为准(库内铁律),syl 的 ipa/phonemes/notes/combos 向它修齐。
 *  - 真伤 7:ability(ɪ→ə) aggregate(ə→ɪ) contemporary(rə→re) determine(缺ː)
 *            distinct/distort(重音位错,/s/ 划归重读音节作首音) evolve(ɪ→i)
 *  - 成音节辅音 4:concentrate(sən→sn) crucial(ʃəl→ʃl) flexible(bəl→bl)
 *            inevitable(ɛ→e 且 bəl→bl)——/l̩/ /n̩/ 独立作音节核,desc 标"成音节"
 *            (essential 先例),顺带把 inevitable 的 ɛ 统一为 e 与音标同形
 * 每处断言旧值,幂等可重跑;修后自动调用 check-phonetic-consistency.mjs 全量验证。
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
import { join } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const db = new Database(join(process.cwd(), "data", "app.db"));
const getStmt = db.prepare("SELECT content_json FROM words WHERE word = ?");
const setStmt = db.prepare("UPDATE words SET content_json = ? WHERE word = ?");

const fixes = [
  {
    word: "ability",
    why: "第三音节 ɪ→ə(uk=əˈbɪləti);notes 同步;ty combo 删幻觉尾巴『非 nature 类 ture 规则』",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[2] === "ə") return "已是";
      if (s.ipa.join("") !== "əˈbɪlɪti") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[2] = "ə";
      const i = s.phonemes.find((p) => p.syl === 2);
      if (i.p !== "ɪ") throw new Error("phonemes s2 非 ɪ");
      i.p = "ə";
      i.desc = "中元音:舌身平放,口腔自然松开,-ity 词尾弱读,不读饱满的 /ɪ/";
      s.notes[1] = "词尾 -ity 中 i 弱读为 schwa /ə/,整段读 /əti/,不读饱满的 /ɪti/";
      const ty = s.combos.find((x) => x.letters === "ty");
      if (ty) ty.desc = "-ty 词尾通常读作 /ti/,如 city、university";
      return true;
    },
  },
  {
    word: "aggregate",
    why: "第二音节 ə→ɪ(uk=ˈæɡrɪɡət);gre combo 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[1] === "rɪ") return "已是";
      if (s.ipa.join("") !== "ˈæɡrəɡət") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[1] = "rɪ";
      const v = s.phonemes.find((p) => p.syl === 1 && p.type === "vowel");
      if (v.p !== "ə") throw new Error("phonemes s1 元音非 ə");
      v.p = "ɪ";
      v.desc = "短前元音:舌前部抬向硬腭,唇形扁平,短促";
      const gre = s.combos.find((x) => x.letters === "gre");
      if (gre) {
        gre.sound = "/rɪ/";
        gre.desc = "辅音连缀 gr,字母 e 在此读短元音 /ɪ/(词典标音 /ˈæɡrɪɡət/)";
      }
      return true;
    },
  },
  {
    word: "contemporary",
    why: "第四音节 rə→re(uk=kənˈtempəreri);notes/ry combo 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[3] === "re") return "已是";
      if (s.ipa.join("") !== "kənˈtempərəri") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[3] = "re";
      const v = s.phonemes.find((p) => p.syl === 3 && p.type === "vowel");
      if (v.p !== "ə") throw new Error("phonemes s3 元音非 ə");
      v.p = "e";
      v.desc = "短前元音:舌前部抬向硬腭,唇形扁平,短促";
      s.notes[1] = "第四音节 ra 按词典标音读饱满短元音 /re/,不弱化为 schwa";
      const ry = s.combos.find((x) => x.letters === "ry");
      if (ry) ry.desc = "词尾 -ry 读 /ri/,ra+ry 连读为 /reri/,同 memory 的 -ry";
      return true;
    },
  },
  {
    word: "determine",
    why: "第二音节补长音符 ː(uk=dɪˈtɜːrmɪn)",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[1] === "ˈtɜːr") return "已是";
      if (s.ipa.join("") !== "dɪˈtɜrmɪn") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[1] = "ˈtɜːr";
      const v = s.phonemes.find((p) => p.p === "ɜ");
      if (!v) throw new Error("phonemes 无 ɜ");
      v.p = "ɜː";
      v.desc = "长中元音:舌位居中稍抬,音长拉足,后接卷舌 /r/";
      return true;
    },
  },
  {
    word: "distinct",
    why: "重音位错:/s/ 划归重读音节作首音(uk=dɪˈstɪŋkt)",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[0] === "dɪ") return "已是";
      if (s.ipa.join("") !== "dɪsˈtɪŋkt") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[0] = "dɪ";
      s.ipa[1] = "ˈstɪŋkt";
      const sc = s.phonemes.find((p) => p.p === "s");
      if (!sc) throw new Error("phonemes 无 s");
      sc.syl = 1;
      sc.desc = "清擦音:舌尖接近上齿龈,气流摩擦成声,作重读音节首音与 /t/ 连读";
      return true;
    },
  },
  {
    word: "distort",
    why: "重音位错:/s/ 划归重读音节作首音(uk=dɪˈstɔːrt)",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[0] === "dɪ") return "已是";
      if (s.ipa.join("") !== "dɪsˈtɔːrt") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[0] = "dɪ";
      s.ipa[1] = "ˈstɔːrt";
      const sc = s.phonemes.find((p) => p.p === "s");
      if (!sc) throw new Error("phonemes 无 s");
      sc.syl = 1;
      sc.desc = "清擦音:舌尖接近上齿龈,气流摩擦成声,作重读音节首音与 /t/ 连读";
      return true;
    },
  },
  {
    word: "evolve",
    why: "首音节 ɪ→i(uk=iˈvɑːlv);notes 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[0] === "i") return "已是";
      if (s.ipa.join("") !== "ɪˈvɑːlv") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[0] = "i";
      const v = s.phonemes.find((p) => p.syl === 0 && p.type === "vowel");
      if (v.p !== "ɪ") throw new Error("phonemes s0 元音非 ɪ");
      v.p = "i";
      v.desc = "紧高前元音:舌前部高抬,比松短的 /ɪ/ 更紧更饱满";
      s.notes[0] = "重音落在第二个音节,首音节读紧元音 /i/(非松的 /ɪ/),不承重音但保持饱满";
      return true;
    },
  },
  {
    word: "concentrate",
    why: "第二音节 sən→sn,/n/ 成音节作核(uk=ˈkɑːnsntreɪt);notes 去无中生有的『o 弱化』",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[1] === "sn") return "已是";
      if (s.ipa.join("") !== "ˈkɑːnsəntreɪt") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[1] = "sn";
      const schwa = s.phonemes.find((p) => p.syl === 1 && p.type === "vowel");
      if (!schwa || schwa.p !== "ə") throw new Error("phonemes s1 无 ə");
      s.phonemes.splice(s.phonemes.indexOf(schwa), 1);
      const n = s.phonemes.find((p) => p.syl === 1 && p.p === "n");
      if (!n) throw new Error("phonemes s1 无 n");
      n.desc = "齿龈鼻音(成音节):舌尖抵上齿龈,气流从鼻腔通过,独立作音节核心";
      s.notes[0] =
        "主重音在第一音节 /ˈkɑːn/,第二音节 cen 读成音节鼻音 /sn/(/n/ 独立作音节核,中间不插 schwa),与词典标音一致";
      return true;
    },
  },
  {
    word: "crucial",
    why: "末音节 ʃəl→ʃl,/l/ 成音节作核(uk=ˈkruːʃl);notes/cial combo 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[1] === "ʃl") return "已是";
      if (s.ipa.join("") !== "ˈkruːʃəl") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[1] = "ʃl";
      const schwa = s.phonemes.find((p) => p.syl === 1 && p.type === "vowel");
      if (!schwa || schwa.p !== "ə") throw new Error("phonemes s1 无 ə");
      s.phonemes.splice(s.phonemes.indexOf(schwa), 1);
      const l = s.phonemes.find((p) => p.syl === 1 && p.p === "l");
      if (!l) throw new Error("phonemes s1 无 l");
      l.desc = "边音(成音节):舌尖抵上齿龈,气流从舌两侧通过,独立作音节核心";
      s.notes[1] = "第二音节 /ʃl/ 轻读,成音节边音 /l/ 直接作音节核,中间不插 schwa";
      s.notes[2] = "ʃ 嘴唇略前突,与后面的成音节 /l/ 衔接要顺滑";
      const cial = s.combos.find((x) => x.letters === "cial");
      if (cial) {
        cial.sound = "/ʃl/";
        cial.desc = "c 后接 ia 常读 /ʃə/,如 special、official;此处按词典读成音节 /ʃl/";
      }
      return true;
    },
  },
  {
    word: "flexible",
    why: "末音节 bəl→bl,/l/ 成音节作核(uk=ˈfleksəbl);notes/ible combo 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[2] === "bl") return "已是";
      if (s.ipa.join("") !== "ˈfleksəbəl") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[2] = "bl";
      const schwa2 = s.phonemes.find((p) => p.syl === 2 && p.type === "vowel");
      if (!schwa2 || schwa2.p !== "ə") throw new Error("phonemes s2 无 ə");
      s.phonemes.splice(s.phonemes.indexOf(schwa2), 1);
      const l = s.phonemes.find((p) => p.syl === 2 && p.p === "l");
      if (!l) throw new Error("phonemes s2 无 l");
      l.desc = "边音(成音节):舌尖抵上齿龈,气流从舌两侧通过,独立作音节核心";
      s.notes[1] = "词尾 -ble 的 e 不发音,直接读成音节 /bl/(/l/ 作音节核,不插 schwa)";
      const ible = s.combos.find((x) => x.letters === "ible");
      if (ible) {
        ible.sound = "/əbl/";
        ible.desc = "形容词后缀弱读为 /əbl/,同 possible/comfortable(l 为成音节)";
      }
      return true;
    },
  },
  {
    word: "inevitable",
    why: "ɛ→e 与音标同形 + 末音节 bəl→bl 成音节(uk=ɪnˈevɪtəbl);notes/ble combo 同步",
    apply: (c) => {
      const s = c.syl;
      if (s.ipa[1] === "ˈe" && s.ipa[4] === "bl") return "已是";
      if (s.ipa.join("") !== "ɪnˈɛvɪtəbəl") throw new Error(`ipa 现值异常: ${s.ipa}`);
      s.ipa[1] = "ˈe";
      s.ipa[4] = "bl";
      const e = s.phonemes.find((p) => p.syl === 1 && p.type === "vowel");
      if (!e || e.p !== "ɛ") throw new Error("phonemes s1 元音非 ɛ");
      e.p = "e";
      e.desc = "短前元音:舌前部抬向硬腭,唇形扁平,短促";
      const schwa4 = s.phonemes.find((p) => p.syl === 4 && p.type === "vowel");
      if (!schwa4 || schwa4.p !== "ə") throw new Error("phonemes s4 无 ə");
      s.phonemes.splice(s.phonemes.indexOf(schwa4), 1);
      const l = s.phonemes.find((p) => p.syl === 4 && p.p === "l");
      if (!l) throw new Error("phonemes s4 无 l");
      l.desc = "边音(成音节):舌尖抵上齿龈,气流从舌两侧通过,独立作音节核心";
      s.notes[0] = "主重音落在第二个音节 'ev' 上,元音发饱满的 /e/";
      s.notes[2] = "词尾 -ble 读成音节 /bl/(/l/ 独立作音节核,不插 schwa)";
      const ble = s.combos.find((x) => x.letters === "ble");
      if (ble) {
        ble.sound = "/bl/";
        ble.desc = "词尾 -ble 读成音节 /bl/(/l/ 作音节核),同 possible/comfortable";
      }
      return true;
    },
  },
];

let applied = 0;
let skipped = 0;
let failed = 0;

for (const f of fixes) {
  try {
    const row = getStmt.get(f.word);
    if (!row) throw new Error("词不存在");
    const content = JSON.parse(row.content_json);
    const r = f.apply(content);
    if (r === "已是") {
      skipped += 1;
      console.log(`  - ${f.word}: ${r}(幂等跳过)`);
      continue;
    }
    if (!DRY_RUN) setStmt.run(JSON.stringify(content), f.word);
    applied += 1;
    console.log(`  ✓ ${f.word}: ${f.why}`);
  } catch (e) {
    failed += 1;
    console.log(`  ✗ ${f.word}: ${e.message}`);
  }
}

console.log(
  `\n[fix-syl-uk-consistency] 应用=${applied} 幂等跳过=${skipped} 失败=${failed}${DRY_RUN ? "(dry-run 未落库)" : ""}`,
);

// 修后全量硬性校验
if (!DRY_RUN && failed === 0) {
  const r = spawnSync(
    process.execPath,
    [join(process.cwd(), "scripts", "check-phonetic-consistency.mjs"), "--book=10"],
    { stdio: "inherit", env: { ...process.env, NODE_PATH: process.env.NODE_PATH ?? "" } },
  );
  if (r.status !== 0) console.log("⚠ 硬性校验仍有残留,见上");
}
process.exit(failed ? 1 : 0);
