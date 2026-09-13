/**
 * /api/reading/import — 阅读库导入(真题 passage / 手动粘贴)
 *
 * GET  无参数     → 可选真题卷清单(reading 科目) + 每卷已导入 passage 标记
 * GET  ?examId=   → 某卷三篇 passage 的预览(标题/词数/段数/是否已导入)
 * POST            → 导入一篇:{ way:'paper', examId, passageNo, libraryId, translate }
 *                     或 { way:'paste', title, text, libraryId, translate }
 *                  可选 newLibraryName:先建自定义库再导入(前端「＋新建库」)。
 *
 * 每次只导一篇,进度由前端逐篇驱动(对应原型的导入进度列表)。
 * TTS 本期不做(2026-09-09 定稿:暂不生成音频);词库命中打开文章时实时计算。
 */
import { NextResponse } from "next/server";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { papers, readingArticles, readingLibraries } from "@/db/schema";
import { parsePaperPassage, parsePastedText, suggestTags, translateParagraphs } from "@/lib/reading/import-core";

interface SourceRef {
  examSetId?: string;
  examId?: string;
  paperTitle?: string;
  passageNo?: number;
  origin?: string;
}

/** 全部文章的 sourceRef(examId → passageNo[]) 已导入索引(sourceRefJson 为 json 列,drizzle 已反序列化) */
function importedIndex(): Map<string, number[]> {
  const db = getDb();
  const rows = db
    .select({ ref: readingArticles.sourceRefJson })
    .from(readingArticles)
    .all();
  const map = new Map<string, number[]>();
  for (const r of rows) {
    const ref = r.ref as SourceRef | null;
    if (ref?.examId && ref.passageNo) {
      const list = map.get(ref.examId) ?? [];
      list.push(ref.passageNo);
      map.set(ref.examId, list);
    }
  }
  return map;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  if (!examId) {
    const db = getDb();
    const rows = db
      .select({ examId: papers.examId, examSetId: papers.examSetId, title: papers.title })
      .from(papers)
      .where(eq(papers.subject, "reading"))
      .orderBy(papers.examId)
      .all();
    const imported = importedIndex();
    return NextResponse.json({
      papers: rows.map((p) => ({
        ...p,
        importedPassages: imported.get(p.examId) ?? [],
      })),
    });
  }

  // 某卷 passage 预览:直接读 public/exams/<examId>/reading.html
  const htmlPath = path.join(process.cwd(), "public", "exams", examId, "reading.html");
  let html: string;
  try {
    html = await fsp.readFile(htmlPath, "utf8");
  } catch {
    return NextResponse.json({ error: `找不到该卷的阅读页面文件: ${examId}` }, { status: 404 });
  }
  const db = getDb();
  const paper = db
    .select({ examSetId: papers.examSetId, title: papers.title })
    .from(papers)
    .where(eq(papers.examId, examId))
    .get();
  if (!paper) return NextResponse.json({ error: `试卷不存在: ${examId}` }, { status: 404 });

  const imported = importedIndex();
  const done = imported.get(examId) ?? [];
  const passages = [1, 2, 3].map((no) => {
    const p = parsePaperPassage(html, no, `${paper.title} · Passage ${no}`);
    return p
      ? {
          passageNo: no,
          title: p.title,
          wordCount: p.wordCount,
          paraCount: p.paras.length,
          imported: done.includes(no),
        }
      : { passageNo: no, title: null, wordCount: 0, paraCount: 0, imported: done.includes(no) };
  });
  return NextResponse.json({ examId, examSetId: paper.examSetId, passages });
}

interface ImportBody {
  way: "paper" | "paste";
  examId?: string;
  passageNo?: number;
  title?: string;
  text?: string;
  libraryId?: number;
  newLibraryName?: string;
  translate?: boolean;
}

export async function POST(request: Request) {
  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const db = getDb();

  // 目标库:显式 libraryId 或现场新建
  let libraryId = body.libraryId;
  if (!libraryId && body.newLibraryName?.trim()) {
    const libId = `custom-${Date.now()}`;
    db.insert(readingLibraries)
      .values({
        libraryId: libId,
        name: body.newLibraryName.trim(),
        source: "custom",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();
    const created = db
      .select({ id: readingLibraries.id })
      .from(readingLibraries)
      .where(eq(readingLibraries.libraryId, libId))
      .get();
    libraryId = created?.id;
  }
  if (!libraryId) {
    return NextResponse.json({ error: "缺少目标库(libraryId 或 newLibraryName)" }, { status: 400 });
  }
  const lib = db
    .select({ id: readingLibraries.id, name: readingLibraries.name })
    .from(readingLibraries)
    .where(eq(readingLibraries.id, libraryId))
    .get();
  if (!lib) return NextResponse.json({ error: `目标库不存在: ${libraryId}` }, { status: 404 });

  let title: string;
  let paras: string[];
  let source: "past_paper" | "manual";
  let sourceRef: SourceRef;
  let articleId: string;

  if (body.way === "paper") {
    if (!body.examId || !body.passageNo) {
      return NextResponse.json({ error: "真题导入需要 examId 和 passageNo" }, { status: 400 });
    }
    const paper = db
      .select({ examId: papers.examId, examSetId: papers.examSetId, title: papers.title })
      .from(papers)
      .where(eq(papers.examId, body.examId))
      .get();
    if (!paper) return NextResponse.json({ error: `试卷不存在: ${body.examId}` }, { status: 404 });

    const htmlPath = path.join(process.cwd(), "public", "exams", body.examId, "reading.html");
    let html: string;
    try {
      html = await fsp.readFile(htmlPath, "utf8");
    } catch {
      return NextResponse.json({ error: "找不到该卷的阅读页面文件" }, { status: 404 });
    }
    const parsed = parsePaperPassage(html, body.passageNo, `${paper.title} · Passage ${body.passageNo}`);
    if (!parsed) {
      return NextResponse.json({ error: `第 ${body.passageNo} 篇解析失败(有效段落不足或容器缺失)` }, { status: 422 });
    }
    // articleId 与既有导入管线一致: <examSetId>-r-t<testNo>-p<passageNo>
    const m = /test(\d+)$/i.exec(paper.examId);
    const testNo = m ? m[1] : "1";
    articleId = `${paper.examSetId}-r-t${testNo}-p${body.passageNo}`;
    const dup = db
      .select({ articleId: readingArticles.articleId })
      .from(readingArticles)
      .where(eq(readingArticles.articleId, articleId))
      .get();
    if (dup) {
      return NextResponse.json({ error: `该 passage 已导入(${articleId})`, duplicated: true }, { status: 409 });
    }
    title = parsed.title;
    paras = parsed.paras;
    source = "past_paper";
    sourceRef = {
      examSetId: paper.examSetId,
      examId: paper.examId,
      paperTitle: paper.title,
      passageNo: body.passageNo,
    };
  } else if (body.way === "paste") {
    title = body.title?.trim() || "";
    if (!title) return NextResponse.json({ error: "请填写文章标题" }, { status: 400 });
    if (!body.text?.trim()) return NextResponse.json({ error: "请粘贴英文正文" }, { status: 400 });
    paras = parsePastedText(body.text);
    if (paras.length < 3) {
      return NextResponse.json({ error: `有效段落仅 ${paras.length} 段(按空行分段),至少需要 3 段` }, { status: 422 });
    }
    articleId = `custom-${Date.now()}`;
    source = "manual";
    sourceRef = { origin: "手动粘贴" };
  } else {
    return NextResponse.json({ error: `不支持的导入方式: ${body.way}` }, { status: 400 });
  }

  const wordCount = paras.reduce((s, x) => s + x.split(/\s+/).filter(Boolean).length, 0);
  let zh: Array<string | null> = new Array(paras.length).fill(null);
  let tags: string[] = [];
  if (body.translate) {
    // 翻译(多批)与话题打标(单次)并行
    const [zhRes, tagRes] = await Promise.all([
      translateParagraphs(paras),
      suggestTags(title, paras.join("\n\n")),
    ]);
    zh = zhRes;
    tags = tagRes;
  }
  const paragraphs = paras.map((en, i) => ({ idx: i, en, zh: zh[i], audio: null }));

  const now = new Date();
  db.insert(readingArticles)
    .values({
      articleId,
      libraryId,
      title,
      source,
      sourceRefJson: sourceRef,
      wordCount,
      topicTagsJson: tags,
      paragraphsJson: paragraphs,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const translatedCount = zh.filter((x) => x != null).length;
  return NextResponse.json({
    articleId,
    title,
    paraCount: paras.length,
    wordCount,
    translatedCount,
    failedCount: paras.length - translatedCount,
    tags,
    library: { id: lib.id, name: lib.name },
  });
}
