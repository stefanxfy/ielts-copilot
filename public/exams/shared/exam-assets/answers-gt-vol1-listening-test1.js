/* G类听力 · 雅思真题试卷 一月 · Test 1 · 正确答案数据
 * 答案来源:源卷 Master 页答案键(162000-184000 区间结构化 .list-answer-item)
 * 生成时间:2026-08-30
 *
 * 评分引擎:scoring.js(通用 40 题循环,letter/text/block 三种题型)
 *   - 文本题:textEq 自动 strip 括号内单词 + 按 '/' 拆 alt(支持 Q1、Q3、Q26、Q27 等)
 *   - 复合题:Q38-40 multi-select 共享一组 checkbox (name="q-38-40"),blocks 按命中数计分
 *   - Q11-16 matching 是 6 个独立 select(非复合),不进 blocks,走 textEq
 */
window.IELTS_EXAM = {
  id: 'gt-vol1-listening-test1',
  title: '雅思真题试卷 一月 · 雅思听力真题 1',
  module: 'G',
  skill: 'listening',
  duration: 32,        // G 类听力 32 分钟(对齐源 HTML data-time="1920")
  total: 40,
  /* 答案速查页(2026-08-30 已建):判分成绩条「答案速查」入口指向本页 */
  answersUrl: 'answers.html',
  /* G类听力 band table(从 Master 页 #score-N tab 确认,标准 IELTS GT 听力 raw→band) */
  bandTable: [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7],
    [26, 6.5], [23, 6], [19, 5.5], [15, 5],
    [13, 4.5], [11, 4], [9, 3.5], [5, 3], [3, 2.5]
  ],
  /* Q38-40 multi-select 复合题:3 选自 A-G,共享一组 checkbox,正确 C,E,F
     scoring.js judge 逻辑:hit = |用户选集 ∩ 正确集|,每命中计 1 分,共 3 分 */
  blocks: [
    { name: 'q-38-40', from: 38, to: 40, answer: 'C,E,F' }
  ],
  /* 单题答案(Q1-37);Q38-40 由 blocks 处理,不在 answers 里 */
  answers: {
    /* Part 1 - Sports club */
    "1":  "(a) Keep-fit (studio)",
    "2":  "swimming",
    "3":  "yoga (classes)",
    "4":  "(a) salad bar",
    "5":  "500",
    "6":  "1",
    "7":  "4:30",
    "8":  "180",
    "9":  "assessment",
    "10": "Kynchley",
    /* Part 2 - Rivenden City Theatre / Fitness Holidays */
    "11": "B",
    "12": "G",
    "13": "C",
    "14": "A",
    "15": "E",
    "16": "D",
    "17": "October 19th",
    "18": "7",
    "19": "Thursday",
    "20": "18",
    /* Part 3 - College facilities */
    "21": "A",
    "22": "in advance",
    "23": "nursery",
    "24": "annual fee",
    "25": "tutor",
    "26": "laptops/printers",   // textEq 按 '/' 拆 alt
    "27": "printers/laptops",   // 同上,顺序可互换
    "28": "report writing",
    "29": "marketing",
    "30": "Individual",
    /* Part 4 - Social history of the East End of London */
    "31": "feed",
    "32": "leather",
    "33": "restrictions",
    "34": "ships",
    "35": "England",
    "36": "built",
    "37": "poverty"
    // Q38-40 由 blocks 处理
  }
};