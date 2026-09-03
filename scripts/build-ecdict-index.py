#!/usr/bin/env python3
"""
scripts/build-ecdict-index.py — 把 ECDICT 全量 csv 构建成紧凑本地索引(一次性)

产出: data/ecdict-index.db (sqlite)
  - ecdict(word PK, phonetic, definition, translation, collins, tag, bnc, frq, exchange)
  - wordroot(word PK, root)  # 已格式化为 enrich 脚本同款 "root = meaning (origin)"

为什么: #61 导入 API 运行时不能每次解析 66MB csv(踩坑记录见
scripts/enrich-words-ecdict.mjs 顶部)。索引库 77 万行 sqlite 查询毫秒级,
API 只做 point lookup。data/ 已 gitignore,clone 后跑本脚本一键重建。

数据准备(同 enrich 脚本):
  curl --http1.1 https://codeload.github.com/skywind3000/ECDICT/zip/refs/heads/master -o /tmp/ecdict.zip
  cd /tmp && unzip -o ecdict.zip ECDICT-master/ecdict.csv -d /tmp/ecdict-extract/
  curl -s -o /tmp/wordroot.txt https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/wordroot.txt

用法: python3 scripts/build-ecdict-index.py
"""
import csv
import json
import os
import sqlite3
import sys
import time

CSV_PATH = "/tmp/ecdict-extract/ECDICT-master/ecdict.csv"
WORDROOT_PATH = "/tmp/wordroot.txt"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ecdict-index.db")

for f in (CSV_PATH, WORDROOT_PATH):
    if not os.path.exists(f):
        print(f"[build-index] 缺依赖文件: {f},先按脚本顶部「数据准备」下载", file=sys.stderr)
        sys.exit(1)


def main():
    t0 = time.time()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    if os.path.exists(OUT_PATH):
        os.remove(OUT_PATH)
    db = sqlite3.connect(OUT_PATH)
    db.execute(
        """CREATE TABLE ecdict (
            word TEXT PRIMARY KEY, phonetic TEXT, definition TEXT, translation TEXT,
            collins INTEGER, tag TEXT, bnc INTEGER, frq INTEGER, exchange TEXT
        ) WITHOUT ROWID"""
    )
    db.execute("CREATE TABLE wordroot (word TEXT PRIMARY KEY, root TEXT) WITHOUT ROWID")

    # ---- wordroot 反索引(与 enrich-words-ecdict.mjs loadWordroot 同语义) ----
    raw = json.load(open(WORDROOT_PATH, encoding="utf-8"))
    word2root = {}
    for root_key, info in raw.items():
        meaning = info.get("meaning", "")
        origin = info.get("origin", "")
        formatted = f"{root_key} = {meaning}" + (f" ({origin})" if origin else "")
        for ex in info.get("example", []):
            w = "".join(ch for ch in ex.lower() if ch.isalpha() or ch in "'-")
            if w and w not in word2root:
                word2root[w] = formatted
    db.executemany(
        "INSERT OR IGNORE INTO wordroot(word, root) VALUES (?, ?)", word2root.items()
    )
    print(f"[build-index] wordroot 反索引 {len(word2root)} 词")

    # ---- ECDICT 全量 ----
    n = 0
    batch = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = (row.get("word") or "").strip().lower()
            if not word:
                continue

            def _int(v):
                v = (v or "").strip()
                return int(v) if v.isdigit() else None

            batch.append(
                (
                    word,
                    (row.get("phonetic") or "").strip() or None,
                    (row.get("definition") or "").strip() or None,
                    (row.get("translation") or "").strip() or None,
                    _int(row.get("collins")),
                    (row.get("tag") or "").strip() or None,
                    _int(row.get("bnc")),
                    _int(row.get("frq")),
                    (row.get("exchange") or "").strip() or None,
                )
            )
            n += 1
            if len(batch) >= 20000:
                db.executemany(
                    "INSERT OR REPLACE INTO ecdict VALUES (?,?,?,?,?,?,?,?,?)", batch
                )
                batch = []
    if batch:
        db.executemany("INSERT OR REPLACE INTO ecdict VALUES (?,?,?,?,?,?,?,?,?)", batch)

    db.commit()
    cnt = db.execute("SELECT count(*) FROM ecdict").fetchone()[0]
    rcnt = db.execute("SELECT count(*) FROM wordroot").fetchone()[0]
    db.close()
    print(f"[build-index] ecdict {cnt} 行(读入 {n}),wordroot {rcnt} 行 → {OUT_PATH}")
    print(f"[build-index] 完成,耗时 {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
