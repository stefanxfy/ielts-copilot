# -*- coding: utf-8 -*-
"""
从 ieltsonlinetests 保存页抽取真题内容，套用自有主题重建单文件机考页面。
内容为结构化引用，主题/交互全部重写（不使用对方任何 CSS/JS/品牌素材）。
"""
import re, json, base64, os, html as htmlmod

SRC = "/Users/fanyunxu/Desktop/雅思真题html/雅思真题试卷 一月 雅思阅读真题 1.html"
ASSET = "/Users/fanyunxu/Desktop/雅思真题html/雅思真题试卷 一月 雅思阅读真题 1_files"
OUT = "/Users/fanyunxu/WorkBuddy/2026-08-28-15-08-37/prototype/gt-reading-test.html"

raw = open(SRC, encoding="utf-8").read()

# ---------- 定位 6 个 section ----------
marks = []
for m in re.finditer(r'<section class="(test-contents ckeditor-wrapper|test-panel)"[^>]*>', raw):
    marks.append((m.start(), m.end(), m.group(1)))
end_all = raw.find('<div class="take-test__bottom-palette')
sections = []
for idx, (s, e, kind) in enumerate(marks):
    nxt = marks[idx + 1][0] if idx + 1 < len(marks) else end_all
    sections.append((kind, raw[e:nxt]))

def strip_tail(x):
    return re.sub(r'(?:\s*</div>|\s*</section>)+\s*$', '', x)

def embed_img(src):
    fname = os.path.basename(src.split("?")[0])
    p = os.path.join(ASSET, fname)
    if os.path.exists(p):
        ext = "png" if fname.lower().endswith("png") else "jpeg"
        b = base64.b64encode(open(p, "rb").read()).decode()
        return 'src="data:image/%s;base64,%s"' % (ext, b)
    return 'src="%s"' % src

def retext(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

# ---------- 抽取篇章 ----------
passages = []
for kind, sec in sections:
    if not kind.startswith("test-contents"):
        continue
    sec = re.sub(r'\sstyle="[^"]*"', '', sec)
    desc = re.search(r'field--name-field-passage-desc[^>]*>([\s\S]*?)</div>', sec)
    img = re.search(r'<img src="(\./[^"]+)"', sec)
    sub = re.search(r'field--name-field-subtitle-section[^>]*>([\s\S]*?)</div>', sec)
    pas = re.search(r'field--name-field-passage[^>]*>([\s\S]*)$', sec)
    img_tag = ''
    if img:
        w = re.search(r'width="(\d+)"', sec)
        img_tag = '<figure class="psg-figure">%s</figure>' % re.sub(
            r'src="\./[^"]+"', lambda m: embed_img(m.group(0)[5:-1]), img.group(0))
    passages.append({
        "desc": desc.group(1) if desc else '',
        "img": img_tag,
        "subtitle": retext(sub.group(1)) if sub else '',
        "html": strip_tail(pas.group(1)) if pas else '',
    })

# ---------- 抽取题目面板 ----------
panels = []
for kind, sec in sections:
    if kind != "test-panel":
        continue
    title = re.search(r'<h2 class="test-panel__title"[^>]*>([\s\S]*?)</h2>', sec)
    items_raw = re.split(r'(?=<div class="test-panel__item">)', sec)
    items = []
    for chunk in items_raw:
        if not chunk.lstrip().startswith('<div class="test-panel__item">'):
            continue
        t = re.search(r'<h4 class="test-panel__question-title"[^>]*>([\s\S]*?)</h4>', chunk)
        d = re.search(r'test-panel__question-desc[^>]*>([\s\S]*?)</div>', chunk)
        a = re.search(r'<div class="test-panel__answer">([\s\S]*?)$', chunk)
        items.append({
            "title": retext(t.group(1)) if t else '',
            "desc": d.group(1) if d else '',
            "html": strip_tail(a.group(1)) if a else '',
        })
    panels.append({"title": retext(title.group(1)) if title else '', "items": items})

print("passages:", len(passages), "panels:", len(panels),
      "items:", [len(p["items"]) for p in panels])

# ---------- 题号总集 ----------
qnums = set()
for p in panels:
    for it in p["items"]:
        qnums |= set(int(x) for x in re.findall(r'data-num="(\d+)"', it["html"]))
        qnums |= set(int(x) for x in re.findall(r'name="q-(\d+)"', it["html"]))
QMAX = max(qnums)
print("questions:", QMAX)

# ---------- 组装 HTML ----------
def esc(s):
    return htmlmod.escape(s, quote=False)

passage_html = []
for i, p in enumerate(passages):
    passage_html.append(f'''
<section class="psg" data-part="{i+1}">
  <div class="psg-desc">{p["desc"]}</div>
  {p["img"]}
  <h2 class="psg-subtitle">{esc(p["subtitle"])}</h2>
  <div class="psg-body">{p["html"]}</div>
</section>''')

panel_html = []
for i, p in enumerate(panels):
    items = ""
    for it in p["items"]:
        items += f'''
    <div class="qgroup">
      <div class="qgroup-head"><h4>{esc(it["title"])}</h4><div class="qgroup-desc">{it["desc"]}</div></div>
      <div class="qgroup-body">{it["html"]}</div>
    </div>'''
    prev_dis = 'disabled' if i == 0 else ''
    panel_html.append(f'''
<section class="qpanel" data-part="{i+1}">
  <header class="qpanel-head"><span class="qpanel-badge">Part {i+1}</span><span>{esc(p["title"])}</span></header>
  {items}
  <div class="qpanel-nav">
    <button class="btn ghost" id="prevPart" {prev_dis}>‹ 上一篇</button>
    <button class="btn ghost" id="nextPart" {'disabled' if i == len(panels)-1 else ''}>下一篇 ›</button>
  </div>
</section>''')

CSS = '''
:root{
  --blue:#1a6feb; --blue-d:#0d4fa8; --blue-bg:#e8f0fe;
  --ink:#1c2330; --ink-2:#5a6472; --line:#dfe4ec;
  --bg:#f4f6fa; --card:#ffffff;
  --green:#18925c; --red:#d33c3c; --amber:#c07d10;
  --hl:#ffe58a;
  --fs:16px;
  --hh:56px; --ph:92px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);overflow:hidden}

/* ===== 顶栏 ===== */
.topbar{height:var(--hh);background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:0 16px;position:relative;z-index:20}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--blue-d));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none}
.brand .t1{font-weight:600;font-size:14px;white-space:nowrap}
.brand .t2{font-size:12px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand .tag{font-size:11px;color:var(--blue);background:var(--blue-bg);border-radius:4px;padding:2px 6px;margin-left:6px;flex:none}
.topbar .spacer{flex:1}
.timer{display:flex;align-items:center;gap:8px;background:var(--blue-bg);color:var(--blue-d);font-weight:600;font-variant-numeric:tabular-nums;border-radius:8px;padding:6px 12px;font-size:15px}
.timer.warn{background:#fdf3e2;color:var(--amber)}
.timer.danger{background:#fdecec;color:var(--red)}
.iconbtn{width:34px;height:34px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink-2);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:.15s}
.iconbtn:hover{border-color:var(--blue);color:var(--blue)}
.fs-ctrl{display:flex;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.fs-ctrl button{border:none;background:#fff;color:var(--ink-2);width:32px;height:32px;cursor:pointer;font-size:13px}
.fs-ctrl button:hover{background:var(--blue-bg);color:var(--blue)}
.btn{border:none;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:600;cursor:pointer;transition:.15s}
.btn.primary{background:var(--blue);color:#fff}
.btn.primary:hover{background:var(--blue-d)}
.btn.ghost{background:#fff;border:1px solid var(--line);color:var(--ink)}
.btn.ghost:hover:not(:disabled){border-color:var(--blue);color:var(--blue)}
.btn.ghost:disabled{opacity:.4;cursor:not-allowed}
.btn.danger{background:var(--red);color:#fff}

/* ===== 分屏考区 ===== */
.board{display:flex;height:calc(100vh - var(--hh) - var(--ph));background:var(--card)}
.board .pane{flex:1 1 50%;overflow-y:auto;padding:28px 32px 60px;scroll-behavior:smooth}
.board .pane.right{border-left:2px solid var(--line);padding:24px 28px 60px}
.pane::-webkit-scrollbar{width:8px}
.pane::-webkit-scrollbar-thumb{background:#c9d2df;border-radius:4px}
.psg,.qpanel{display:none}
.psg.active,.qpanel.active{display:block}

/* 篇章排版 */
.psg-desc h1{font-size:18px;letter-spacing:.06em;color:var(--ink);margin-bottom:4px}
.psg-desc p{font-size:var(--fs);color:var(--ink-2);font-style:italic;margin-bottom:10px}
.psg-figure{margin:10px 0 14px}
.psg-figure img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}
.psg-subtitle{font-size:15px;font-weight:700;color:var(--blue-d);letter-spacing:.04em;border-bottom:2px solid var(--blue-bg);padding-bottom:8px;margin-bottom:14px}
.psg-body{font-size:var(--fs);line-height:1.85;color:var(--ink)}
.psg-body p{margin:0 0 12px}
.psg-body table{border-collapse:collapse;width:100%;margin:12px 0;table-layout:fixed}
.psg-body caption h3{font-size:calc(var(--fs) - 1px);text-align:left;color:var(--ink);padding:6px 0}
.psg-body td{border:1px solid var(--line);padding:10px 12px;vertical-align:top;font-size:calc(var(--fs) - 1px);line-height:1.7}
.psg-body a{color:var(--blue);text-decoration:none}
mark.hl{background:var(--hl);color:inherit;border-radius:2px;padding:0 1px}
mark.hl[data-note]::after{content:"✎";color:var(--amber);font-size:.8em;vertical-align:super;margin-left:1px;cursor:pointer}

/* 题目排版 */
.qpanel-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;position:sticky;top:-24px;background:var(--card);padding:10px 0;z-index:5}
.qpanel-badge{background:var(--blue);color:#fff;font-size:12px;font-weight:700;border-radius:6px;padding:3px 10px}
.qpanel-head span:last-child{font-size:13px;color:var(--ink-2)}
.qgroup{border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-bottom:16px;background:#fff}
.qgroup-head h4{font-size:14px;color:var(--blue-d);margin-bottom:6px}
.qgroup-desc{font-size:13px;color:var(--ink-2);line-height:1.6}
.qgroup-body{font-size:var(--fs);line-height:1.9;margin-top:8px}
.qgroup-body p{margin:0 0 10px}
.qgroup-body table{border-collapse:collapse;margin:10px 0;width:100%}
.qgroup-body td,.qgroup-body th{border:1px solid var(--line);padding:6px 10px;font-size:calc(var(--fs) - 2px)}
.iot-question-number{font-weight:700;color:var(--blue-d)}
.test-panel__question-num{font-weight:700;color:var(--blue-d);margin-right:2px}
input.iot-question{border:none;border-bottom:2px solid var(--blue);background:var(--blue-bg);border-radius:6px 6px 0 0;width:110px;padding:2px 8px;font-size:var(--fs);color:var(--ink);outline:none;text-align:center}
input.iot-question:focus{background:#dbe9fd}
select.iot-question{border:1px solid var(--blue);background:#fff;border-radius:6px;padding:2px 6px;font-size:calc(var(--fs) - 2px);color:var(--ink);outline:none;cursor:pointer}
.test-panel__answer-item{display:flex;align-items:flex-start;gap:10px;padding:7px 10px;border-radius:8px;transition:.12s}
.test-panel__answer-item:hover{background:var(--bg)}
.test-panel__answer-option{flex:none;width:24px;height:24px;border:1.5px solid var(--line);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--ink-2);margin-top:2px}
label.iot-radio{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--fs);line-height:1.6;flex:1}
label.iot-radio input{accent-color:var(--blue);width:16px;height:16px;flex:none}
.qpanel-nav{display:flex;justify-content:space-between;margin-top:6px}

/* ===== 底部题号板 ===== */
.palette{height:var(--ph);background:var(--card);border-top:1px solid var(--line);display:flex;align-items:center;gap:18px;padding:0 18px;overflow-x:auto;position:relative;z-index:20}
.pgroup{flex:none}
.pgroup-title{font-size:11px;color:var(--ink-2);margin-bottom:6px;display:flex;gap:8px;align-items:center}
.pgroup-title .cnt{color:var(--blue);font-weight:600}
.chips{display:flex;gap:6px}
.chip{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--line);background:#fff;color:var(--ink-2);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.12s;position:relative}
.chip.answered{background:var(--blue);border-color:var(--blue);color:#fff}
.chip.flagged::after{content:"";position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:var(--amber);border:2px solid #fff}
.chip.current{box-shadow:0 0 0 2.5px var(--blue-bg),0 0 0 4px var(--blue)}
.chip:hover{transform:translateY(-2px)}
.palette .meta{margin-left:auto;flex:none;text-align:right}
.palette .meta .m1{font-size:13px;font-weight:700;color:var(--ink)}
.palette .meta .m1 b{color:var(--blue)}
.palette .meta .m2{font-size:11px;color:var(--ink-2)}
.palette .meta .m2 i{font-style:normal;color:var(--amber)}

/* ===== 高亮浮条 ===== */
.hltip{position:fixed;z-index:100;display:none;background:var(--ink);border-radius:8px;padding:5px;gap:4px;box-shadow:0 6px 24px rgba(0,0,0,.25)}
.hltip.show{display:flex}
.hltip button{border:none;background:transparent;color:#cfd6e0;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap}
.hltip button:hover{background:rgba(255,255,255,.14);color:#fff}

/* ===== 笔记侧栏 ===== */
.notepad{position:fixed;top:var(--hh);right:-340px;width:320px;height:calc(100vh - var(--hh));background:var(--card);border-left:1px solid var(--line);box-shadow:-8px 0 24px rgba(0,0,0,.08);z-index:60;transition:right .25s;display:flex;flex-direction:column}
.notepad.open{right:0}
.notepad h5{font-size:14px;padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
.notepad h5 button{border:none;background:none;cursor:pointer;color:var(--ink-2);font-size:16px}
.note-list{flex:1;overflow-y:auto;padding:10px 14px}
.note-item{border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:13px;line-height:1.6;cursor:pointer}
.note-item:hover{border-color:var(--blue)}
.note-item .ref{color:var(--blue);font-size:11px;margin-bottom:4px}
.note-item .txt{color:var(--ink)}
.note-empty{color:var(--ink-2);font-size:12px;text-align:center;padding:30px 0}

/* ===== 弹窗 ===== */
.modal-mask{position:fixed;inset:0;background:rgba(20,26,38,.45);z-index:200;display:none;align-items:center;justify-content:center}
.modal-mask.show{display:flex}
.modal{background:#fff;border-radius:14px;width:400px;max-width:90vw;padding:28px;text-align:center;animation:pop .18s ease}
@keyframes pop{from{transform:scale(.92);opacity:0}}
.modal .ic{width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px}
.modal .ic.blue{background:var(--blue-bg);color:var(--blue)}
.modal .ic.red{background:#fdecec;color:var(--red)}
.modal h4{font-size:17px;margin-bottom:8px}
.modal .desc{font-size:13px;color:var(--ink-2);line-height:1.7;margin-bottom:18px}
.modal .desc b{color:var(--ink)}
.modal .row{display:flex;gap:10px;justify-content:center}
.stats{display:flex;gap:10px;margin:14px 0 18px}
.stat{flex:1;border:1px solid var(--line);border-radius:10px;padding:10px}
.stat .v{font-size:20px;font-weight:700}
.stat .k{font-size:11px;color:var(--ink-2)}
.stat.ok .v{color:var(--green)}
.stat.miss .v{color:var(--red)}

/* ===== 成绩覆盖层 ===== */
.result{position:fixed;inset:0;background:var(--bg);z-index:150;overflow-y:auto;display:none;padding:36px 20px}
.result.show{display:block}
.result-card{max-width:760px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px}
.result-card h3{font-size:18px;margin-bottom:4px}
.result-card .sub{font-size:13px;color:var(--ink-2);margin-bottom:18px}
.ans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:14px 0 22px}
.ans-cell{border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:13px;display:flex;justify-content:space-between;gap:6px}
.ans-cell .n{font-weight:700;color:var(--blue-d)}
.ans-cell .v{color:var(--ink)}
.ans-cell.empty .v{color:var(--red)}
.notice{background:var(--blue-bg);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--blue-d);line-height:1.7}
'''

JS = '''
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const QMAX=__QMAX__;
let curPart=1, submitted=false, remain=60*60, notes=[];

/* ---------- 计时 ---------- */
const timerEl=$('#timer');
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
setInterval(()=>{
  if(submitted)return;
  remain=Math.max(0,remain-1);
  timerEl.textContent=fmt(remain);
  timerEl.className='timer'+(remain<=600?' danger':remain<=1200?' warn':'');
  if(remain===0){timeUp()}
},1000);

/* ---------- Part 切换 ---------- */
function gotoPart(i,scroll=true){
  curPart=i;
  $$('.psg').forEach(el=>el.classList.toggle('active',+el.dataset.part===i));
  $$('.qpanel').forEach(el=>el.classList.toggle('active',+el.dataset.part===i));
  $$('.pgroup').forEach(g=>g.classList.toggle('active',g.dataset.part==i));
  const pv=$('#prevPart'),nx=$('#nextPart');
  if(pv)pv.disabled=(i===1);
  if(nx)nx.disabled=(i===$$('.qpanel').length);
  if(scroll){$('.pane.left').scrollTop=0;$('.pane.right').scrollTop=0;}
  $$('.chip').forEach(c=>c.classList.remove('current'));
  syncCurrentChip();
}
function syncCurrentChip(){
  const first=$(`.qpanel[data-part="${curPart}"] [data-num]`);
  if(first)highlightChip(first.dataset.num||first.name.split('-')[1]);
}
function highlightChip(n){
  const c=$(`.chip[data-n="${n}"]`);
  if(c)c.classList.add('current');
}
$('#prevPart').onclick=()=>gotoPart(curPart-1);
$('#nextPart').onclick=()=>gotoPart(curPart+1);

/* ---------- 答题状态 ---------- */
function answered(n){
  const els=$$(`[data-num="${n}"]`);
  if(!els.length)els.push(...$$(`input[name="q-${n}"]`));
  for(const el of els){
    if(el.type==='radio'){if(el.checked)return true}
    else if(el.value&&el.value.trim())return true;
  }
  return false;
}
function refreshPalette(){
  let done=0;
  for(let n=1;n<=QMAX;n++){
    const ok=answered(n); if(ok)done++;
    const c=$(`.chip[data-n="${n}"]`);
    if(c)c.classList.toggle('answered',ok);
  }
  $('#doneCnt').textContent=done;
}
document.addEventListener('input',e=>{if(e.target.matches('.iot-question'))refreshPalette()});
document.addEventListener('change',e=>{if(e.target.matches('.iot-question'))refreshPalette()});

/* ---------- 题号板 ---------- */
$$('.pgroup').forEach(g=>g.addEventListener('click',()=>gotoPart(+g.dataset.part)));
$$('.chip').forEach(c=>{
  c.addEventListener('click',()=>{
    const n=+c.dataset.n;
    const el=$(`[data-num="${n}"]`)||$$(`input[name="q-${n}"]`)[0];
    if(el){
      const part=+el.closest('.qpanel').dataset.part;
      if(part!==curPart)gotoPart(part,false);
      setTimeout(()=>{el.scrollIntoView({block:'center',behavior:'smooth'});
        el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),900);
        $$('.chip').forEach(x=>x.classList.remove('current'));
        c.classList.add('current');
      },40);
    }
  });
  c.addEventListener('contextmenu',e=>{e.preventDefault();c.classList.toggle('flagged');
    $('#flagCnt').textContent=$$('.chip.flagged').length;});
});

/* ---------- 字号 ---------- */
let fs=16;
$('#fsMinus').onclick=()=>{fs=Math.max(13,fs-1);document.documentElement.style.setProperty('--fs',fs+'px')};
$('#fsPlus').onclick=()=>{fs=Math.min(21,fs+1);document.documentElement.style.setProperty('--fs',fs+'px')};

/* ---------- 全屏 ---------- */
$('#fsBtn').onclick=()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()};

/* ---------- 高亮 / 笔记 ---------- */
const tip=$('#hltip');
let savedSel=null;
function getSelText(){const s=window.getSelection();return s&&!s.isCollapsed&&s.toString().trim()?s:null}
document.addEventListener('mouseup',e=>{
  if(submitted)return;
  if(e.target.closest('.hltip'))return;
  const s=getSelText();
  if(s&&!!s.anchorNode&&$('.pane.left').contains(s.anchorNode)){
    savedSel=s;
    const r=s.getRangeAt(0).getBoundingClientRect();
    tip.style.left=Math.min(window.innerWidth-220,Math.max(8,r.left+r.width/2-100))+'px';
    tip.style.top=Math.max(8,r.top-46)+'px';
    tip.classList.add('show');
  }else if(!e.target.closest('mark.hl')){
    tip.classList.remove('show');
  }
});
function wrapSelection(cls,noteText){
  if(!savedSel)return;
  const range=savedSel.getRangeAt(0);
  const mark=document.createElement('mark');
  mark.className='hl';
  if(noteText!=null){mark.dataset.note=noteText;notes.push({text:noteText,el:mark});renderNotes();}
  try{
    range.surroundContents(mark);
  }catch(err){
    // 跨节点选择：逐段包裹
    const frag=range.extractContents();
    mark.appendChild(frag);range.insertNode(mark);
  }
  window.getSelection().removeAllRanges();
  tip.classList.remove('show');
}
$('#btnHl').onclick=()=>wrapSelection('hl');
$('#btnNote').onclick=()=>{
  const t=prompt('笔记内容：');
  if(t&&t.trim())wrapSelection('hl',t.trim());
};
$('#btnClear').onclick=()=>{
  if(!savedSel)return;
  const range=savedSel.getRangeAt(0);
  const marks=$$('.pane.left mark.hl').filter(m=>{
    const r=document.createRange();r.selectNodeContents(m);
    return range.intersectsNode(m)&&!r.compareBoundaryPoints(Range.END_TO_START,range)>=0;
  });
  marks.forEach(m=>unwrap(m));
  window.getSelection().removeAllRanges();tip.classList.remove('show');
};
function unwrap(mark){
  const parent=mark.parentNode;
  while(mark.firstChild)parent.insertBefore(mark.firstChild,mark);
  parent.removeChild(mark);
}
$$('.pane.left').forEach(p=>p.addEventListener('click',e=>{
  const m=e.target.closest('mark.hl');
  if(m&&!getSelText()&&m.dataset.note){
    alert('笔记：'+m.dataset.note);
  }
}));

/* ---------- 笔记侧栏 ---------- */
$('#noteBtn').onclick=()=>$('.notepad').classList.toggle('open');
$('#noteClose').onclick=()=>$('.notepad').classList.remove('open');
function renderNotes(){
  const box=$('#noteList');
  if(!notes.length){box.innerHTML='<div class="note-empty">暂无笔记<br>选中篇章文字后点「笔记」即可添加</div>';return}
  box.innerHTML=notes.map((n,i)=>`<div class="note-item" data-i="${i}">
    <div class="ref">Part ${n.el.closest('.psg')?.dataset.part||'?'} · ${n.el.textContent.slice(0,24)}…</div>
    <div class="txt">${n.text.replace(/</g,'&lt;')}</div></div>`).join('');
  $$('.note-item').forEach(it=>it.onclick=()=>{
    const n=notes[+it.dataset.i];
    n.el.closest('.psg').scrollIntoView({behavior:'smooth',block:'center'});
    n.el.style.transition='background .3s';n.el.style.background='#ffd54d';
    setTimeout(()=>{n.el.style.background=''},1200);
  });
}
renderNotes();

/* ---------- 交卷 ---------- */
$('#submitBtn').onclick=()=>{
  if(submitted)return;
  let done=0;for(let n=1;n<=QMAX;n++)if(answered(n))done++;
  $('#mDone').textContent=done;$('#mMiss').textContent=QMAX-done;
  $('#submitModal').classList.add('show');
};
$('#mCancel').onclick=()=>$('#submitModal').classList.remove('show');
$('#mConfirm').onclick=()=>{$('#submitModal').classList.remove('show');finish(false)};
function timeUp(){$('#timeupModal').classList.add('show');setTimeout(()=>{$('#timeupModal').classList.remove('show');finish(true)},1800)}
function finish(auto){
  submitted=true;tip.classList.remove('show');
  $$('.iot-question').forEach(el=>el.disabled=true);
  let done=0;const cells=[];
  for(let n=1;n<=QMAX;n++){
    let val='';
    const els=$$(`[data-num="${n}`);
    const all=$$(`[data-num="${n}"],input[name="q-${n}"]`);
    for(const el of all){
      if(el.type==='radio'){if(el.checked){val=el.value;break}}
      else if(el.value&&el.value.trim()){val=el.value.trim();break}
    }
    if(val)done++;
    cells.push(`<div class="ans-cell${val?'':' empty'}"><span class="n">${n}</span><span class="v">${val||'未作答'}</span></div>`);
  }
  $('#resTitle').textContent=auto?'时间到 · 已自动交卷':'已交卷';
  $('#resSub').textContent='雅思真题试卷 一月 · 雅思阅读真题 1（G类）· 用时 '+fmt(3600-remain);
  $('#resDone').textContent=done;$('#resMiss').textContent=QMAX-done;
  $('#resGrid').innerHTML=cells.join('');
  $('.result').classList.add('show');
}
$('#backBtn').onclick=()=>{location.reload()};

/* ---------- 初始 ---------- */
gotoPart(1);
refreshPalette();
'''

# 题号板分组（按 panel 的 data-num 范围）
groups = []
for i, p in enumerate(panels):
    nums = []
    for it in p["items"]:
        nums += [int(x) for x in re.findall(r'data-num="(\d+)"', it["html"])]
        nums += [int(x) for x in re.findall(r'name="q-(\d+)"', it["html"])]
    nums = sorted(set(nums))
    chips = "".join(f'<button class="chip" data-n="{n}" title="第 {n} 题（右键标记复查）">{n}</button>' for n in nums)
    groups.append(f'''<div class="pgroup{' active' if i==0 else ''}" data-part="{i+1}">
  <div class="pgroup-title">Part {i+1} <span class="cnt">{len(nums)}题</span></div>
  <div class="chips">{chips}</div></div>''')

# 修正 JS 里一个笔误占位（data-num 选择器字符串截断问题）
JS = JS.replace('const els=$$(`[data-num="${n}]);', 'const els=$$(`[data-num="${n}"]`);')
JS = JS.replace('__QMAX__', str(QMAX))

page = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>雅思 G类阅读机考 · 真题试卷 一月 Test 1</title>
<style>{CSS}</style>
</head>
<body class="exam">

<header class="topbar">
  <div class="brand">
    <div class="logo">雅</div>
    <div>
      <div class="t1">IELTS 本地机考<span class="tag">G类 · 阅读</span></div>
      <div class="t2">雅思真题试卷 一月 · 雅思阅读真题 1 · 时长 60 分钟</div>
    </div>
  </div>
  <div class="spacer"></div>
  <div class="fs-ctrl"><button id="fsMinus" title="缩小字号">A−</button><button id="fsPlus" title="放大字号">A+</button></div>
  <button class="iconbtn" id="noteBtn" title="笔记列表">✎</button>
  <button class="iconbtn" id="fsBtn" title="全屏">⛶</button>
  <div class="timer" id="timer">60:00</div>
  <button class="btn primary" id="submitBtn">交卷</button>
</header>

<div class="board">
  <div class="pane left">{''.join(passage_html)}</div>
  <div class="pane right">{''.join(panel_html)}</div>
</div>

<div class="palette">
  {''.join(groups)}
  <div class="meta">
    <div class="m1">已答 <b id="doneCnt">0</b> / {QMAX}</div>
    <div class="m2">标记复查 <i id="flagCnt">0</i> · 右键题号可标记</div>
  </div>
</div>

<div class="hltip" id="hltip">
  <button id="btnHl">🖍 高亮</button>
  <button id="btnNote">✎ 笔记</button>
  <button id="btnClear">✕ 清除</button>
</div>

<aside class="notepad">
  <h5>我的笔记 <button id="noteClose">✕</button></h5>
  <div class="note-list" id="noteList"></div>
</aside>

<div class="modal-mask" id="submitModal">
  <div class="modal">
    <div class="ic blue">✓</div>
    <h4>确认交卷？</h4>
    <div class="stats">
      <div class="stat ok"><div class="v" id="mDone">0</div><div class="k">已作答</div></div>
      <div class="stat miss"><div class="v" id="mMiss">0</div><div class="k">未作答</div></div>
    </div>
    <div class="row">
      <button class="btn ghost" id="mCancel">继续作答</button>
      <button class="btn primary" id="mConfirm">确认交卷</button>
    </div>
  </div>
</div>

<div class="modal-mask" id="timeupModal">
  <div class="modal">
    <div class="ic red">⏰</div>
    <h4>时间到</h4>
    <div class="desc">考试时间已用完，系统将自动交卷</div>
  </div>
</div>

<div class="result">
  <div class="result-card">
    <h3 id="resTitle">已交卷</h3>
    <div class="sub" id="resSub"></div>
    <div class="stats">
      <div class="stat ok"><div class="v" id="resDone">0</div><div class="k">已作答</div></div>
      <div class="stat miss"><div class="v" id="resMiss">0</div><div class="k">未作答</div></div>
      <div class="stat"><div class="v">—</div><div class="k">得分（待答案入库）</div></div>
    </div>
    <div class="ans-grid" id="resGrid"></div>
    <div class="notice">判分说明：本卷答案卷尚未入库，暂不对分。M2「解析入库」完成后，此处将自动显示 band 换算分、错题定位与逐题解析。</div>
    <div class="row" style="margin-top:18px;display:flex;gap:10px">
      <button class="btn ghost" id="backBtn">重做本卷</button>
    </div>
  </div>
</div>

<script>{JS}</script>
</body>
</html>'''

with open(OUT, "w", encoding="utf-8") as f:
    f.write(page)
print("written:", OUT, f"{os.path.getsize(OUT)/1024:.0f} KB")
