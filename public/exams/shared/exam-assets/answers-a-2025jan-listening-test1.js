/* A类听力 · IELTS Mock Test 2025 January · Test 1 · 正确答案数据
 * 答案来源:源卷存档页答案键(.list-answer-item .sys-answer;页面双份渲染已去重)
 * 生成时间:2026-08-30
 *
 * 评分引擎:scoring.js(通用 40 题循环,letter/text/block 三种题型)
 *   - 文本题:textEq 自动 strip 括号内单词 + 按 '/' 拆 alt(货币/单位题加了 £X/X/X pounds 备选)
 *   - Q6 双选 checkbox 单题(name="q-6"):scoring collect 的 checkbox 分支累计勾选,
 *     setEq 严格双对才得 1 分(对齐 IELTS 选两项全对才给分口径)
 *   - Q28-30 multi-select 共享一组 checkbox (name="q-28-30"),blocks 按命中数计分,共 3 分
 *   - Q31-40 radio 单选(A-D)
 * band 表:源卷存档页 #score 模考成绩 tab(听力官方 13 档,A/G 类听力同表)
 */
window.IELTS_EXAM = {
  id: 'a-2025jan-listening-test1',
  title: 'IELTS Mock Test 2025 January · Listening Practice Test 1',
  module: 'A',
  skill: 'listening',
  duration: 32,        // A类听力 32 分钟(对齐源 HTML data-time="1920")
  total: 40,
  answersUrl: 'answers.html',
  bandTable: [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7],
    [26, 6.5], [23, 6], [18, 5.5], [16, 5],
    [13, 4.5], [11, 4], [9, 3.5], [5, 3]
  ],
  /* Q28-30 multi-select 复合题:3 选,共享一组 checkbox,正确 D,E,F
     scoring.js judge 逻辑:hit = |用户选集 ∩ 正确集|,每命中计 1 分,共 3 分 */
  blocks: [
    { name: 'q-28-30', from: 28, to: 30, answer: 'D,E,F' }
  ],
  /* 单题答案(Q1-27、Q31-40);Q28-30 由 blocks 处理,不在 answers 里 */
  answers: {
    /* Part 1 - Homestay application / sports centre */
    "1":  "Keiko",
    "2":  "JO6337",
    "3":  "Advanced English studies",
    "4":  "5 months/5",
    "5":  "About 4 months/4 months/4",
    "6":  "B,D",                  // checkbox 双选单题,setEq 严格双对
    "7":  "Seafood",
    "8":  "Tennis",
    "9":  "Take the train/the train",
    "10": "This afternoon",
    /* Part 2 - Travel to Enzia (visas / customs) */
    "11": "90 days/90",
    "12": "30 pounds/£30/30",
    "13": "Confirm your nationality",
    "14": "Page 13/13",
    "15": "Currency form",
    "16": "Tourist export form",
    "17": "BM276",
    "18": "International student card",
    "19": "12",
    "20": "Australian dollar/Australian dollars",
    /* Part 3 - Interview: work & shopping */
    "21": "Cashier",
    "22": "£50/50",
    "23": "Big department stores/department stores",
    "24": "Jeans",
    "25": "45 pounds/£45/45",
    "26": "75 pounds/£75/75",
    "27": "20 pounds/£20/20",
    // Q28-30 由 blocks 处理
    /* Part 4 - Lecture (multiple choice A-D) */
    "31": "B",
    "32": "B",
    "33": "A",
    "34": "C",
    "35": "D",
    "36": "C",
    "37": "D",
    "38": "A",
    "39": "A",
    "40": "A"
  }
};
