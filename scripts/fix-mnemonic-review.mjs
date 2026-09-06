#!/usr/bin/env node
/**
 * scripts/fix-mnemonic-review.mjs — 2026-09-06 复审真伤批量小修(确定性手术,不调 LLM)
 *
 * 修复范围(复审 review-result.json error 级 38 条 → 人工裁决 20 处真伤):
 *   morph 注记 8 处: deliver/establish/accelerate/aggregate/anticipate/demonstrate/emphasize/distinct
 *     ——只改 meaningZh/literal 注记,不动 piece 拼写(pieces 拼合 === 整词是硬校验)
 *   derives 3 删 1 改: circumstance 删 condition(不同源)、ignore 删 ignoring(屈折形式)、
 *     confront 删 unconfronted(罕词)、justify 改 justifiably 释义
 *   context 1 处: accompany ctx2 "accompany with" 中国式英语 → 及物直接宾语(音频重合成)
 *   syl 8 处: innovative(n 音节归属+combo desc)、involve(parts/ipa 3段→2段)、
 *     contribute/influence/exclude/integrate(combO desc 措辞)、emphasize/ežate desc
 *
 * 误报不动(数据核验自洽): adequate/advocate/appropriate/explicit/facilitate/contemporary/
 *   comprehensive/conduct/demonstrate-syl/circumstance-morph(st=stare 正统)/integrate-morph 等
 *
 * 用法: NODE_PATH=<managed workspace node_modules> node scripts/fix-mnemonic-review.mjs [--dry-run]
 */
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const sqlite = new Database("./data/app.db");
sqlite.pragma("foreign_keys = ON");

// ===== 工具 =====
const normIpa = (x) => String(x).replace(/[/ˈˌ.\s]/g, "");
const patchPiece = (content, piece, meaningZh) => {
  const p = content.morph.pieces.find((x) => x.piece === piece);
  if (!p) throw new Error(`piece 不存在: ${piece}`);
  if (p.meaningZh === meaningZh) return false; // 已是目标值(幂等)
  p.meaningZh = meaningZh;
  return true;
};
const patchLiteral = (content, literal) => {
  if (content.morph.literal === literal) return false;
  content.morph.literal = literal;
  return true;
};

// ===== 修复清单 =====
/** @type {Array<{word:string, field:string, why:string, apply:(c:any)=>boolean|string}>} */
const FIXES = [
  // ---------- morph: 注记修正(拼写不动) ----------
  {
    word: "deliver", field: "morph", why: "liver 词根注记易与『肝脏』混淆 + liber 词源链不清",
    apply: (c) => {
      const a = patchPiece(c, "de-", "使脱离，解除（=拉丁 de-，此处引申『使自由』）");
      const b = patchPiece(c, "liver", "使自由（拉丁词根 liber「自由」经古法语 delivrer 传入；拼写 liver 是 liber 的法语化形式，与 liver「肝脏」无关）");
      const d = patchLiteral(c, "de- 使脱离 + liver 使自由(=liber,法语化拼写)");
      return a || b || d;
    },
  },
  {
    word: "establish", field: "morph", why: "stabl 释『站立』错——词根是 stabil-(稳固),非 stab-(站立)",
    apply: (c) => {
      const a = patchPiece(c, "stabl", "稳固，坚定（拉丁词根 stabil-，stabilis「稳固的」；与 stab-「站立」同源但本词取『稳固』义）");
      const d = patchLiteral(c, "e- 向外/强调 + stabl 稳固 + -ish 动词后缀");
      return a || d;
    },
  },
  {
    word: "accelerate", field: "morph", why: "ac- 是 ad- 在 c 前的同化形式,原义『朝向』非『加强』",
    apply: (c) => {
      const a = patchPiece(c, "ac-", "朝向，到（=ad- 在 c 前的同化形式）");
      const d = patchLiteral(c, "ac- 朝向(=ad- 同化) + celer 快速的 + -ate 使…");
      return a || d;
    },
  },
  {
    word: "aggregate", field: "morph", why: "ag- 注记应标明是 ad- 的同化形式",
    apply: (c) => {
      const a = patchPiece(c, "ag-", "朝，向（=ad- 在 g 前的同化形式）");
      const d = patchLiteral(c, "ag-(=ad- 同化) 朝向 + greg 群 + -ate 动词/名词后缀");
      return a || d;
    },
  },
  {
    word: "anticipate", field: "morph", why: "anti- 实为 ante- 在 c 前的变体(勿与 anti-『反』混淆);cip 是 capere 词干 cep-/cip-",
    apply: (c) => {
      const a = patchPiece(c, "anti-", "在前（ante- 在 c 前的变体；勿与 anti-「反」混淆）");
      const b = patchPiece(c, "cip", "取（拉丁 capere 的词干 cep-/cip-）");
      const d = patchLiteral(c, "anti-(=ante-) 在前 + cip 取 + -ate 动词后缀");
      return a || b || d;
    },
  },
  {
    word: "demonstrate", field: "morph", why: "de- 此处表加强/完全,非『离开』(de+monstrare=充分展示)",
    apply: (c) => {
      const a = patchPiece(c, "de-", "加强，完全（de- 在此表强调，非「离开」）");
      const d = patchLiteral(c, "de- 加强/完全 + monstr 显示 + -ate 动词后缀");
      return a || d;
    },
  },
  {
    word: "emphasize", field: "morph", why: "phas 释义『表现』与 phainein『显示、显现』不符",
    apply: (c) => {
      const a = patchPiece(c, "phas", "显示，显现（希腊 phainein「to show」）");
      const d = patchLiteral(c, "em- 进入/使 + phas 显示 + -ize 使…化");
      return a || d;
    },
  },
  {
    word: "distinct", field: "morph", why: "di- 是 dis- 在 t 前的同化形式,义『分开』非『加强』",
    apply: (c) => {
      const a = patchPiece(c, "di-", "分开（=dis- 在 t 前的同化形式）");
      const d = patchLiteral(c, "di-(=dis-) 分开 + stinct 刺、标记（拉丁 distinguere「区分」）");
      return a || d;
    },
  },

  // ---------- derives: 删伪派生/罕词/屈折,改释义 ----------
  {
    word: "circumstance", field: "derives", why: "condition 与 circumstance 不同源(近义≠同族)",
    apply: (c) => {
      const before = c.derives.length;
      c.derives = c.derives.filter((d) => d.word !== "condition");
      if (c.derives.length === before) return "已是(无 condition)";
      return true;
    },
  },
  {
    word: "ignore", field: "derives", why: "ignoring 是现在分词(屈折形式),非派生词,词性标 adj. 更错",
    apply: (c) => {
      const before = c.derives.length;
      c.derives = c.derives.filter((d) => d.word !== "ignoring");
      if (c.derives.length === before) return "已是(无 ignoring)";
      return true;
    },
  },
  {
    word: "confront", field: "derives", why: "unconfronted 非通用词汇,删去",
    apply: (c) => {
      const before = c.derives.length;
      c.derives = c.derives.filter((d) => d.word !== "unconfronted");
      if (c.derives.length === before) return "已是(无 unconfronted)";
      return true;
    },
  },
  {
    word: "justify", field: "derives", why: "justifiably 释义『情有可原地』不准,应为『可证明为正当地』",
    apply: (c) => {
      const it = c.derives.find((d) => d.word === "justifiably");
      if (!it) throw new Error("justifiably 不存在");
      const target = "可证明为正当地;无可非议地";
      if (it.meaningZh === target) return "已是";
      it.meaningZh = target;
      return true;
    },
  },

  // ---------- context: accompany with 中国式英语 ----------
  {
    word: "accompany", field: "contexts", why: "ctx2『accompany with』是中式英语,及物动词直接接宾语",
    apply: (c) => {
      const ctx = c.contexts[2];
      const targetColl = "accompany heavy rain";
      const targetEn = "Strong winds usually accompany heavy rain during the autumn storm season here.";
      if (ctx.coll === targetColl && ctx.en === targetEn) return "已是";
      ctx.coll = targetColl;
      ctx.collZh = "伴随着暴雨";
      ctx.en = targetEn;
      ctx.cn = "这里的秋季风暴季节，大风通常伴随着暴雨。";
      return "tts"; // 需要重合成 ctx2 音频
    },
  },

  // ---------- syl: 音节归属 + 描述措辞 ----------
  {
    word: "innovative", field: "syl", why: "双写 nn 的 /n/ 应归后音节(parts[1]=nno→/nə/),combo desc 措辞不通",
    apply: (c) => {
      const s = c.syl;
      const n = s.phonemes.find((p) => p.p === "n" && p.syl === 0);
      if (n) n.syl = 1;
      const combo = s.combos?.find((x) => x.letters === "nno");
      const target = "双写 nn 只读一个 /n/，/n/ 划入后一音节作声母，前音节仅剩 /ɪ/";
      if (combo && combo.desc !== target) combo.desc = target;
      return n || (combo && combo.desc === target) ? true : "已是";
    },
  },
  {
    word: "involve", field: "syl", why: "词尾 -ve 的 e 不发音,单独成段/ipa[2]=v 不合理 → 2 段式 in+volve",
    apply: (c) => {
      const s = c.syl;
      if (s.parts.length === 2) return "已是";
      s.parts = ["in", "volve"];
      s.ipa = ["ɪn", "ˈvɑːlv"];
      const v2 = s.phonemes[s.phonemes.length - 1];
      if (v2.p !== "v" || v2.syl !== 2) throw new Error("involve 末音素非 syl2 的 v");
      v2.syl = 1;
      return true;
    },
  },
  {
    word: "contribute", field: "syl", why: "4 段结构缺陷:末段 te→ipa 仅 /t/ 无元音核(自检发现) → 3 段式,combo desc 一并修正",
    apply: (c) => {
      const s = c.syl;
      if (s.parts.length === 4 && s.parts[3] === "te") {
        s.parts = ["con", "tri", "bute"];
        s.ipa = ["kən", "ˈtrɪb", "juːt"];
        const t = s.phonemes[s.phonemes.length - 1];
        if (t.p !== "t" || t.syl !== 3) throw new Error("contribute 末音素非 syl3 的 t");
        t.syl = 2;
        const combo = s.combos?.find((x) => x.letters === "bu");
        if (combo) { combo.letters = "bute"; combo.sound = "/bjuːt/"; combo.desc = "词尾 -bute 读 /bjuːt/，b 划入末音节作声母，j 为 /uː/ 的滑音起始；同 dispute /dɪˈspjuːt/"; }
        else throw new Error("bu combo 不存在");
        return true;
      }
      if (s.parts.length === 3) return "已是";
      throw new Error(`contribute parts 异常: ${s.parts.join(",")}`);
    },
  },
  {
    word: "influence", field: "syl", why: "combo desc 应明确 u 读长音 /uː/(非 /ʌ/)",
    apply: (c) => {
      const combo = c.syl.combos?.find((x) => x.letters === "flu");
      const target = "字母组合 flu 读 /flu/，此处 u 读长音 /uː/ 而非短音 /ʌ/，同 fluent /ˈfluːənt/";
      if (!combo) throw new Error("flu combo 不存在");
      if (combo.desc === target) return "已是";
      combo.desc = target;
      return true;
    },
  },
  {
    word: "exclude", field: "syl", why: "combo desc『如 exit、express』误导(x 在此与 s 连读 /ks/);notes 若有『d 不送气』一并改",
    apply: (c) => {
      const s = c.syl;
      const combo = s.combos?.find((x) => x.letters === "ex");
      const target = "ex- 在重音前弱读 /ɪk/，此处 x 读 /k/ 并与后接 s 连为 /ks/，同 excuse /ɪkˈskjuːs/";
      if (!combo) throw new Error("ex combo 不存在");
      let changed = false;
      if (combo.desc !== target) { combo.desc = target; changed = true; }
      if (Array.isArray(s.notes)) {
        s.notes = s.notes.map((n) => {
          if (typeof n === "string" && n.includes("不送气")) {
            changed = true;
            return "词尾 /d/ 保持浊音，不因词尾位置清化为 /t/（与 include 词尾一致）";
          }
          return n;
        });
      }
      return changed ? true : "已是";
    },
  },
  {
    word: "integrate", field: "syl", why: "combo desc 称『重读音节中 a 发长音』——本词主重音在首音节,/ɡreɪt/ 非重读",
    apply: (c) => {
      const combo = c.syl.combos?.find((x) => x.letters === "gra");
      const target = "词尾音 gra 读 /ɡreɪ/，a 保留长音 /eɪ/，同 migrate /maɪˈɡreɪt/ 的词尾（动词重音前移后词尾 -ate 仍读全音）";
      if (!combo) throw new Error("gra combo 不存在");
      if (combo.desc === target) return "已是";
      combo.desc = target;
      return true;
    },
  },
  {
    word: "emphasize", field: "syl", why: "phonemes[0] desc 未点明 /e/=/ɛ/(em- 中)",
    apply: (c) => {
      const p0 = c.syl.phonemes[0];
      const target = "前中元音 /e/：舌位前中，口半开，即 /ɛm/ 中的元音";
      if (p0.desc === target) return "已是";
      p0.desc = target;
      return true;
    },
  },
  {
    word: "coordinate", field: "syl", why: "phonemes 中 d 的 desc『清塞音对应浊音』措辞不通,直书浊塞音",
    apply: (c) => {
      const d = c.syl.phonemes.find((p) => p.p === "d");
      const target = "浊塞音：舌尖抵上齿龈成阻，声带振动，气流爆破而出";
      if (!d) throw new Error("coordinate 无 d 音素");
      if (d.desc === target) return "已是";
      d.desc = target;
      return true;
    },
  },

  // ---------- 第二批:全库结构自检发现的复审漏网(成音节辅音 /l̩/ /n̩/ 合法放行) ----------
  {
    word: "capacity", field: "syl", why: "5 段怪切分(p/a 孤立成段) → 规整 4 段 ca-pa-ci-ty",
    apply: (c) => {
      const s = c.syl;
      if (s.parts.length === 4) return "已是";
      if (s.parts.join("") !== "capacity") throw new Error(`parts 拼合异常: ${s.parts.join("")}`);
      s.parts = ["ca", "pa", "ci", "ty"];
      s.ipa = ["kə", "ˈpæ", "sə", "ti"];
      // 音素重归属: k,ə→0 / p,æ→1 / s,ə→2 / t,i→3(依序拼合 kəpæsəti 不变)
      const want = [
        { p: "k", syl: 0 }, { p: "ə", syl: 0 },
        { p: "p", syl: 1 }, { p: "æ", syl: 1 },
        { p: "s", syl: 2 }, { p: "ə", syl: 2 },
        { p: "t", syl: 3 }, { p: "i", syl: 3 },
      ];
      if (s.phonemes.length !== want.length) throw new Error(`phonemes 数异常: ${s.phonemes.length}`);
      s.phonemes.forEach((ph, i) => {
        if (ph.p !== want[i].p) throw new Error(`phoneme[${i}] ${ph.p} ≠ ${want[i].p}`);
        ph.syl = want[i].syl;
      });
      return true;
    },
  },
  {
    word: "evolve", field: "syl", why: "词尾 -ve 的 e 不发音,ve→/v/ 独立成段(与 involve 同病) → 2 段式;ipa[0] i 规范为 ɪ",
    apply: (c) => {
      const s = c.syl;
      if (s.parts.length === 2) return "已是";
      s.parts = ["e", "volve"];
      s.ipa = ["ɪ", "ˈvɑːlv"];
      if (s.phonemes[0].p === "i") s.phonemes[0].p = "ɪ";
      const v2 = s.phonemes[s.phonemes.length - 1];
      if (v2.p !== "v" || v2.syl !== 2) throw new Error("evolve 末音素非 syl2 的 v");
      v2.syl = 1;
      return true;
    },
  },
  {
    word: "interpret", field: "syl", why: "末段 t 单独成段无元音核(contribute 同病) → 3 段式 in-ter-pret",
    apply: (c) => {
      const s = c.syl;
      if (s.parts.length === 3) return "已是";
      if (s.parts.join("") !== "interpret") throw new Error(`parts 拼合异常: ${s.parts.join("")}`);
      s.parts = ["in", "ter", "pret"];
      s.ipa = ["ɪn", "ˈtɜːr", "prɪt"];
      const t = s.phonemes[s.phonemes.length - 1];
      if (t.p !== "t" || t.syl !== 3) throw new Error("interpret 末音素非 syl3 的 t");
      t.syl = 2;
      return true;
    },
  },
  {
    word: "controversial", field: "syl", why: "ipa[0] 带 ˌ 但 secondary 为空(重音标记硬校验盲区,该词生成于校验加固前)",
    apply: (c) => {
      const s = c.syl;
      if ((s.secondary ?? []).includes(0)) return "已是";
      if (!String(s.ipa[0]).includes("ˌ")) throw new Error(`ipa[0] 无 ˌ: ${s.ipa[0]}`);
      s.secondary = [0];
      return true;
    },
  },
  {
    word: "foundation", field: "syl", why: "-tion 中 /n/ 是齿龈鼻音,desc 误写为 /ŋ/ 的『舌后鼻音:舌根贴软腭』",
    apply: (c) => {
      const n = c.syl.phonemes.find((p) => p.p === "n" && p.syl === c.syl.parts.length - 1);
      const target = "齿龈鼻音(成音节):舌尖抵上齿龈,气流从鼻腔通过,独立作音节核心";
      if (!n) throw new Error("foundation 无末音节 n");
      if (n.desc === target) return "已是";
      n.desc = target;
      return true;
    },
  },
  {
    word: "essential", field: "syl", why: "末音节 tial(/ʃl/) 整体无音素——/ʃ/ /l/ 误归 syl1 → 归 syl2,/l/ 标成音节核",
    apply: (c) => {
      const s = c.syl;
      const sh = s.phonemes.find((p) => p.p === "ʃ");
      const l = s.phonemes.find((p) => p.p === "l");
      if (!sh || !l) throw new Error("essential 缺 ʃ/l 音素");
      let changed = false;
      if (sh.syl !== 2) { sh.syl = 2; changed = true; }
      if (l.syl !== 2) { l.syl = 2; changed = true; }
      const lTarget = "边音(成音节):舌尖抵上齿龈,气流从舌两侧通过,独立作末音节核心";
      if (l.desc !== lTarget) { l.desc = lTarget; changed = true; }
      return changed ? true : "已是";
    },
  },
];

// ===== 自检(morph 拼合 / syl 内部自洽) =====
function selfCheck(word, content) {
  const errs = [];
  if (content.morph) {
    const joined = content.morph.pieces.map((p) => p.piece ?? "").join("").replace(/[-\s]/g, "").toLowerCase();
    if (joined !== word.toLowerCase()) errs.push(`morph 拼合「${joined}」≠ ${word}`);
  }
  if (content.syl) {
    const s = content.syl;
    if (s.parts.join("") !== word) errs.push(`parts 拼合「${s.parts.join("")}」≠ ${word}`);
    const pj = normIpa(s.phonemes.map((p) => p.p).join(""));
    const ij = normIpa(s.ipa.join(""));
    if (pj !== ij) errs.push(`phonemes「${pj}」≠ ipa「${ij}」`);
    const main = s.ipa[s.stress] ?? "";
    if (!String(main).startsWith("ˈ")) errs.push(`主重音段缺 ˈ: ${main}`);
    // 每个音节必须有元音核(成音节辅音 /l̩/ /n̩/ 放行:desc 含「成音节」标记)
    for (let i = 0; i < s.parts.length; i++) {
      const seg = s.phonemes.filter((p) => p.syl === i);
      if (!seg.some((p) => p.type === "vowel") && !seg.some((p) => String(p.desc ?? "").includes("成音节")))
        errs.push(`音节 ${i} 无元音核`);
    }
  }
  return errs;
}

// ===== 执行 =====
const getStmt = sqlite.prepare("SELECT id, word, content_json FROM words WHERE word = ?");
const setStmt = sqlite.prepare("UPDATE words SET content_json = ?, updated_at = ? WHERE id = ?");
const summary = [];
let fail = 0;

for (const fix of FIXES) {
  const row = getStmt.get(fix.word);
  if (!row) { console.error(`✗ ${fix.word}: 词库不存在`); fail++; continue; }
  const content = JSON.parse(row.content_json);
  try {
    const r = fix.apply(content);
    if (r === false) { summary.push(`- ${fix.word}/${fix.field}: 无变更`); continue; }
    const errs = selfCheck(fix.word, content);
    if (errs.length) throw new Error(`自检不过: ${errs.join("; ")}`);
    const skipped = r === "已是" || r === undefined;
    if (!skipped) {
      if (!DRY_RUN) setStmt.run(JSON.stringify(content), new Date().toISOString(), row.id);
      summary.push(`- ${fix.word}/${fix.field}: 已修(${fix.why})${r === "tts" ? " + 音频重合成" : ""}`);
    } else {
      summary.push(`- ${fix.word}/${fix.field}: 幂等跳过(${r})`);
    }
  } catch (e) {
    console.error(`✗ ${fix.word}/${fix.field}: ${e.message}`);
    fail++;
  }
}

// ===== accompany ctx2 音频重合成(edge-tts Emma --rate=-8%;3 次退避重试——SSL reset 瞬态已知) =====
async function reTtsAccompany() {
  if (DRY_RUN) return "dry-run 跳过";
  const row = getStmt.get("accompany");
  const content = JSON.parse(row.content_json);
  const en = content.contexts[2].en;
  const out = join(process.cwd(), "public", "audio", "contexts", "accompany_2.mp3");
  const PY = "/Users/fanyunxu/.workbuddy/binaries/python/envs/default/bin/python3";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await new Promise((resolve) => {
      const child = spawn(PY, ["-m", "edge_tts", "--voice", "en-US-EmmaMultilingualNeural", "--rate=-8%", "--text", en, "--write-media", out], { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("exit", async (code) => {
        const size = existsSync(out) ? (await stat(out).catch(() => null))?.size ?? 0 : 0;
        resolve(code === 0 && size > 1000 ? { ok: true, size } : { ok: false, msg: `exit=${code} ${stderr.slice(-160)}` });
      });
    });
    if (r.ok) return `🔊 accompany_2.mp3 重合成 OK(${r.size}B)`;
    if (attempt < 3) { console.warn(`  [tts] attempt ${attempt}/3 失败,重试...`); await new Promise((res) => setTimeout(res, 800 * attempt)); }
    else return `⚠ TTS 3 次均失败: ${r.msg}`;
  }
}

const needTts = summary.some((s) => s.includes("音频重合成"));
const ttsMsg = needTts ? await reTtsAccompany() : null;

sqlite.close();
console.log("===== 修复汇总 =====");
for (const s of summary) console.log(s);
if (ttsMsg) console.log(`- TTS: ${ttsMsg}`);
console.log(`\n${fail ? `✗ ${fail} 处失败` : "[fix-mnemonic-review] 全部通过"}${DRY_RUN ? "(dry-run 未写库)" : ""}`);
process.exit(fail ? 1 : 0);
