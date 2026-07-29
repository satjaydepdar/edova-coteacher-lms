#!/usr/bin/env python3
"""
okf_dashboard.py — a visual health map of the OKF bundle.

Reads okf-bundle/ (nodes, edges, indexes/fulltext.json, manifest/manifest.json)
and renders ONE self-contained HTML file: a subject -> chapter -> document graph
plus a per-document status matrix showing, at a glance, whether every document is

  • Shelved     — copied to the public S3 shelf (node has s3_key)
  • Searchable  — indexed in fulltext (usable by grounding / the textbook chat)
  • Listed      — present in the manifest edova-web reads

so you can eyeball "is everything updated?" after any upload. The output opens
in any browser and needs no server.

Usage:
    python tools/okf_dashboard.py                    # -> okf-bundle/okf_dashboard.html
    python tools/okf_dashboard.py --out map.html
    python tools/okf_dashboard.py --bundle okf-bundle --mode fragment  # body-only
"""
import argparse
import glob
import json
import os
import sys
from datetime import datetime, timezone

import yaml


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return default


def load_node(path, default: dict | None = None) -> dict:
    """nodes/*.md: YAML frontmatter + markdown body (see ingest.py)."""
    default = default or {}
    try:
        with open(path, encoding="utf-8") as fh:
            _, front, _ = fh.read().split("---", 2)
        return yaml.safe_load(front) or default
    except (OSError, ValueError, yaml.YAMLError):
        return default


def collect(bundle: str) -> dict:
    nodes = [load_node(p, {}) for p in glob.glob(os.path.join(bundle, "nodes", "*.md"))]
    nodes = [n for n in nodes if n.get("doc_id")]
    edges = [load_json(p, {}) for p in glob.glob(os.path.join(bundle, "edges", "*.json"))]
    edges = [e for e in edges if e.get("from")]

    fulltext = load_json(os.path.join(bundle, "indexes", "fulltext.json"), {}) or {}
    searchable = set()
    for ids in fulltext.values():
        searchable.update(ids)

    manifest = load_json(os.path.join(bundle, "manifest", "manifest.json"), {}) or {}
    listed = {r["id"] for r in manifest.get("resources", []) if r.get("id")}

    # Text-bearing types are EXPECTED to be searchable; media types are not, so a
    # missing fulltext entry is only "needs attention" for a text document.
    TEXT_TYPES = {"chapter_content", "worksheet", "notes", "question_bank", "lesson_plan"}

    out_nodes = []
    for n in nodes:
        did = n["doc_id"]
        shelved = bool(n.get("s3_key"))
        is_searchable = did in searchable
        is_listed = did in listed
        is_text = n.get("doc_type", "") in TEXT_TYPES
        if not shelved or not is_listed:
            status = "missing"       # not on the shelf / not in the app list
        elif is_text and not is_searchable:
            status = "partial"       # shelved & listed but content not indexed
        else:
            status = "ready"         # fully updated (media needs no fulltext)
        out_nodes.append({
            "doc_id": did, "title": n.get("title", did),
            "subject": n.get("subject", ""), "chapter_id": n.get("chapter_id", ""),
            "chapter_name": n.get("chapter_name", ""), "doc_type": n.get("doc_type", "document"),
            "shelved": shelved, "searchable": is_searchable, "listed": is_listed,
            "expects_search": is_text, "status": status,
            "s3_key": n.get("s3_key", ""), "ingested_at": n.get("ingested_at", ""),
        })
    out_nodes.sort(key=lambda x: (x["subject"], x["chapter_id"], x["doc_type"], x["title"]))

    summary = {
        "total": len(out_nodes),
        "shelved": sum(n["shelved"] for n in out_nodes),
        "searchable": sum(n["searchable"] for n in out_nodes),
        "listed": sum(n["listed"] for n in out_nodes),
        "ready": sum(n["status"] == "ready" for n in out_nodes),
        "partial": sum(n["status"] == "partial" for n in out_nodes),
        "missing": sum(n["status"] == "missing" for n in out_nodes),
        "manifest_count": manifest.get("count", len(listed)),
        "chapters": len({(n["subject"], n["chapter_id"]) for n in out_nodes}),
        "subjects": len({n["subject"] for n in out_nodes}),
        "edges": len(edges),
    }
    return {
        "generated_at": datetime.now(timezone.utc).astimezone().strftime("%d %b %Y, %I:%M %p"),
        "bucket_prefix": f"{manifest.get('bucket', '')}/{manifest.get('prefix', '')}".strip("/"),
        "nodes": out_nodes, "edges": edges, "summary": summary,
    }


# --- HTML (self-contained; tokens replaced below) --------------------------

CONTENT = r"""
<style>
  :root{
    --bg:#f6f7f9; --surface:#ffffff; --surface-2:#fbfcfd; --ink:#182230;
    --muted:#5c6675; --faint:#8b94a3; --border:#e5e9ef; --border-2:#eef1f5;
    --math:#4f6bed; --science:#12a074; --hub:#7b8698;
    --ok:#17a34a; --ok-bg:#e9f7ee; --warn:#d98207; --warn-bg:#fdf3e4;
    --bad:#dc2626; --bad-bg:#fdecec; --shadow:0 1px 2px rgba(20,30,50,.06),0 8px 24px rgba(20,30,50,.06);
  }
  @media (prefers-color-scheme:dark){
    :root{
      --bg:#0d131b; --surface:#151d27; --surface-2:#111823; --ink:#e6ecf4;
      --muted:#95a2b4; --faint:#6c7889; --border:#263140; --border-2:#1c2530;
      --math:#7d92f4; --science:#33c295; --hub:#8793a5;
      --ok:#34c766; --ok-bg:#12331f; --warn:#e6a24a; --warn-bg:#33260f;
      --bad:#f0685f; --bad-bg:#361a1a; --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="light"]{
    --bg:#f6f7f9; --surface:#ffffff; --surface-2:#fbfcfd; --ink:#182230; --muted:#5c6675;
    --faint:#8b94a3; --border:#e5e9ef; --border-2:#eef1f5; --math:#4f6bed; --science:#12a074;
    --hub:#7b8698; --ok:#17a34a; --ok-bg:#e9f7ee; --warn:#d98207; --warn-bg:#fdf3e4;
    --bad:#dc2626; --bad-bg:#fdecec; --shadow:0 1px 2px rgba(20,30,50,.06),0 8px 24px rgba(20,30,50,.06);
  }
  :root[data-theme="dark"]{
    --bg:#0d131b; --surface:#151d27; --surface-2:#111823; --ink:#e6ecf4; --muted:#95a2b4;
    --faint:#6c7889; --border:#263140; --border-2:#1c2530; --math:#7d92f4; --science:#33c295;
    --hub:#8793a5; --ok:#34c766; --ok-bg:#12331f; --warn:#e6a24a; --warn-bg:#33260f;
    --bad:#f0685f; --bad-bg:#361a1a; --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.35);
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;line-height:1.5;}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 22px 64px;}
  .mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;}
  header.top{display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 20px;justify-content:space-between;margin-bottom:22px;}
  h1{font-size:22px;font-weight:700;margin:0;letter-spacing:-.01em;text-wrap:balance;}
  .sub{color:var(--muted);font-size:13.5px;margin-top:3px;}
  .sub b{color:var(--ink);font-weight:600;}
  .theme-btn{border:1px solid var(--border);background:var(--surface);color:var(--muted);
    border-radius:9px;padding:7px 12px;font-size:13px;cursor:pointer;font-family:inherit;}
  .theme-btn:hover{color:var(--ink);}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px;}
  .tile{background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px 16px;box-shadow:var(--shadow);}
  .tile .k{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
  .tile .v{font-size:27px;font-weight:700;margin-top:6px;font-variant-numeric:tabular-nums;}
  .tile .v small{font-size:15px;color:var(--faint);font-weight:600;}
  .tile.good .v{color:var(--ok);} .tile.warn .v{color:var(--warn);} .tile.bad .v{color:var(--bad);}
  .banner{display:flex;align-items:center;gap:10px;border-radius:12px;padding:12px 15px;font-size:14px;font-weight:600;margin-bottom:22px;border:1px solid transparent;}
  .banner.ok{background:var(--ok-bg);color:var(--ok);border-color:color-mix(in srgb,var(--ok) 25%,transparent);}
  .banner.att{background:var(--warn-bg);color:var(--warn);border-color:color-mix(in srgb,var(--warn) 30%,transparent);}
  .banner .dot{width:9px;height:9px;border-radius:50%;background:currentColor;flex:none;}
  .bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:26px 0 14px;}
  .bar h2{font-size:15px;font-weight:700;margin:0 8px 0 0;}
  .legend{display:flex;gap:14px;flex-wrap:wrap;margin-left:auto;font-size:12.5px;color:var(--muted);}
  .legend span{display:inline-flex;align-items:center;gap:6px;}
  .legend i{width:11px;height:11px;border-radius:50%;display:inline-block;}
  .seg{display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface);}
  .seg button{border:0;background:transparent;color:var(--muted);padding:6px 12px;font-size:12.5px;cursor:pointer;font-family:inherit;font-weight:600;}
  .seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface);}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;}
  .graph-scroll{overflow-x:auto;}
  svg text{font-family:system-ui,sans-serif;}
  .n-doc{cursor:default;}
  .n-doc .box{transition:opacity .12s;}
  .dim{opacity:.16;}
  table{width:100%;border-collapse:collapse;font-size:13.5px;}
  thead th{position:sticky;top:0;background:var(--surface-2);text-align:left;font-size:11.5px;
    text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:700;
    padding:10px 14px;border-bottom:1px solid var(--border);}
  thead th.c{text-align:center;}
  tbody td{padding:9px 14px;border-bottom:1px solid var(--border-2);vertical-align:middle;}
  tbody td.c{text-align:center;}
  tr.grp td{background:var(--surface-2);font-weight:700;font-size:12.5px;color:var(--muted);
    text-transform:uppercase;letter-spacing:.03em;padding:8px 14px;}
  .swatch{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px;vertical-align:middle;}
  .doc-title{font-weight:600;} .doc-id{color:var(--faint);font-size:11.5px;}
  .typechip{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;
    background:var(--surface-2);border:1px solid var(--border);color:var(--muted);}
  .pip{width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
  .pip.y{background:var(--ok-bg);color:var(--ok);} .pip.n{background:var(--bad-bg);color:var(--bad);}
  .pip.na{background:var(--surface-2);color:var(--faint);}
  .foot{margin-top:26px;color:var(--faint);font-size:12px;}
  #tip{position:fixed;pointer-events:none;z-index:20;background:var(--ink);color:var(--surface);
    padding:8px 10px;border-radius:8px;font-size:12px;max-width:280px;opacity:0;transition:opacity .1s;box-shadow:var(--shadow);}
  #tip .t{font-weight:700;margin-bottom:2px;} #tip .m{opacity:.8;font-size:11px;word-break:break-all;}
  @media (prefers-reduced-motion:reduce){*{transition:none!important;}}
</style>

<div class="wrap">
  <header class="top">
    <div>
      <h1>OKF Bundle — Document Health Map</h1>
      <div class="sub">Shelf <b class="mono">%%PREFIX%%</b> · generated <b>%%GENERATED%%</b></div>
    </div>
    <button class="theme-btn" id="themeBtn" type="button">◐ Theme</button>
  </header>

  <div class="tiles" id="tiles"></div>
  <div id="banner"></div>

  <div class="bar">
    <h2>Knowledge graph — subjects, chapters &amp; documents</h2>
    <div class="legend">
      <span><i style="background:var(--ok)"></i>Fully updated</span>
      <span><i style="background:var(--warn)"></i>Needs attention</span>
      <span><i style="background:var(--bad)"></i>Missing</span>
    </div>
  </div>
  <div class="panel graph-scroll"><div id="graph"></div></div>

  <div class="bar">
    <h2>Document checklist</h2>
    <div class="seg" id="filter">
      <button data-f="all" aria-pressed="true" type="button">All</button>
      <button data-f="attention" aria-pressed="false" type="button">Needs attention</button>
    </div>
  </div>
  <div class="panel"><div style="overflow-x:auto"><table id="matrix"></table></div></div>

  <div class="foot">Regenerate anytime after an upload: <span class="mono">python tools/okf_dashboard.py</span></div>
</div>
<div id="tip"></div>

<script>
const DATA = %%DATA%%;
const SUBJ = { math:{label:"Mathematics", color:"var(--math)"}, science:{label:"Science", color:"var(--science)"} };
const STATUS = { ready:"var(--ok)", partial:"var(--warn)", missing:"var(--bad)" };
const ICON = { chapter_content:"📄", worksheet:"📝", video:"🎬", ppt:"📊", image:"🖼️", audio:"🎧", document:"📄" };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const subjColor = s => SUBJ[s] ? SUBJ[s].color : "var(--hub)";
const subjLabel = s => SUBJ[s] ? SUBJ[s].label : (s||"Other");

/* ---- summary tiles + banner ---- */
const S = DATA.summary;
document.getElementById("tiles").innerHTML = [
  ["Documents", S.total, ""],
  ["Shelved", `${S.shelved}<small>/${S.total}</small>`, S.shelved===S.total?"good":"bad"],
  ["Searchable", `${S.searchable}<small>/${S.total}</small>`, ""],
  ["Listed in app", `${S.listed}<small>/${S.total}</small>`, S.listed===S.total?"good":"bad"],
  ["Chapters", S.chapters, ""],
].map(([k,v,c]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

const needs = S.partial + S.missing;
document.getElementById("banner").innerHTML = needs===0
  ? `<div class="banner ok"><span class="dot"></span>All ${S.total} documents are shelved, listed in the app, and up to date.</div>`
  : `<div class="banner att"><span class="dot"></span>${needs} document${needs>1?"s":""} need attention — `
    + `${S.missing} missing from shelf/list, ${S.partial} shelved but not searchable. See the highlighted rows below.</div>`;

/* ---- group nodes: subject -> chapter -> docs ---- */
function grouped(){
  const bySub = {};
  for(const n of DATA.nodes){
    (bySub[n.subject] = bySub[n.subject] || {sub:n.subject, chapters:{}});
    const ch = bySub[n.subject].chapters;
    (ch[n.chapter_id] = ch[n.chapter_id] || {id:n.chapter_id, name:n.chapter_name||n.chapter_id, docs:[]}).docs.push(n);
  }
  const chNum = id => { const m=/ch(\d+)$/.exec(id||""); return m?+m[1]:999; };
  return Object.values(bySub).map(s => ({
    sub:s.sub,
    chapters:Object.values(s.chapters).sort((a,b)=>chNum(a.id)-chNum(b.id))
  })).sort((a,b)=>a.sub.localeCompare(b.sub));
}

/* ---- SVG graph: two subject columns, chapter -> document trees ---- */
function drawGraph(){
  const groups = grouped();
  const COL_W = 560, ROW_H = 46, PAD_TOP = 54, PAD_BOT = 24;
  const xSub = 90, xCh = 250, xDoc = 400, docW = 140;
  const perCol = groups.map(g => {
    let rows = 0; g.chapters.forEach(c => rows += c.docs.length);
    return {g, rows, h: PAD_TOP + rows*ROW_H + PAD_BOT};
  });
  const height = Math.max(...perCol.map(c=>c.h), 160);
  const width = groups.length * COL_W;
  let s = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="OKF document graph">`;

  groups.forEach((g, gi) => {
    const ox = gi*COL_W;
    let row = 0;
    const chapterYs = [];
    // place docs, remember each chapter's span
    const placed = [];
    g.chapters.forEach(c => {
      const ys = [];
      c.docs.forEach(d => { const y = PAD_TOP + row*ROW_H; ys.push(y); placed.push({d, y}); row++; });
      const cy = ys.reduce((a,b)=>a+b,0)/ys.length;
      chapterYs.push({c, cy, ys});
    });
    const subY = chapterYs.reduce((a,b)=>a+b.cy,0)/chapterYs.length;
    const col = subjColor(g.sub);

    // edges subject->chapter
    chapterYs.forEach(({cy}) => {
      s += `<path d="M ${ox+xSub+54} ${subY} C ${ox+xSub+120} ${subY}, ${ox+xCh-40} ${cy}, ${ox+xCh} ${cy}" `
        + `fill="none" stroke="var(--border)" stroke-width="1.5"/>`;
    });
    // edges chapter->doc
    chapterYs.forEach(({cy, ys}) => ys.forEach(y => {
      s += `<path d="M ${ox+xCh+96} ${cy} C ${ox+xCh+130} ${cy}, ${ox+xDoc-30} ${y}, ${ox+xDoc} ${y}" `
        + `fill="none" stroke="var(--border-2)" stroke-width="1.5"/>`;
    }));

    // subject hub
    s += `<g><rect x="${ox+xSub-54}" y="${subY-18}" width="108" height="36" rx="18" `
      + `fill="${col}"/><text x="${ox+xSub}" y="${subY+5}" text-anchor="middle" `
      + `fill="#fff" font-size="14" font-weight="700">${esc(subjLabel(g.sub))}</text></g>`;

    // chapter nodes
    chapterYs.forEach(({c, cy}) => {
      const num = (/ch(\d+)$/.exec(c.id)||[])[1] || "";
      const label = (num?`Ch ${num} · `:"") + c.name;
      const short = label.length>26 ? label.slice(0,25)+"…" : label;
      s += `<g><rect x="${ox+xCh}" y="${cy-15}" width="96" height="30" rx="8" fill="var(--surface-2)" `
        + `stroke="${col}" stroke-width="1.5"/>`
        + `<text x="${ox+xCh+48}" y="${cy+4}" text-anchor="middle" fill="var(--ink)" font-size="11" font-weight="600">`
        + `${esc(short.length>13?("Ch "+(num||"")) : short)}</text>`
        + `<title>${esc(label)}</title></g>`;
      // chapter full name to the right side is on doc rows; keep hub compact
    });

    // doc nodes
    placed.forEach(({d, y}) => {
      const st = STATUS[d.status];
      const t = d.title.length>19 ? d.title.slice(0,18)+"…" : d.title;
      const ic = ICON[d.doc_type]||ICON.document;
      const tip = `${esc(d.title)}||${esc(d.doc_type)} · ${esc(d.chapter_name)}||`
        + `Shelved ${d.shelved?"✓":"✗"} · Searchable ${d.searchable?"✓":(d.expects_search?"✗":"—")} · Listed ${d.listed?"✓":"✗"}||${esc(d.s3_key||"not shelved")}`;
      s += `<g class="n-doc" data-id="${esc(d.doc_id)}" data-status="${d.status}" data-tip="${tip}">`
        + `<rect class="box" x="${ox+xDoc}" y="${y-16}" width="${docW}" height="32" rx="8" `
        + `fill="var(--surface)" stroke="var(--border)" stroke-width="1"/>`
        + `<rect x="${ox+xDoc}" y="${y-16}" width="4" height="32" rx="2" fill="${st}"/>`
        + `<text x="${ox+xDoc+14}" y="${y+4}" font-size="12">${ic}</text>`
        + `<text x="${ox+xDoc+32}" y="${y+4}" fill="var(--ink)" font-size="11.5" font-weight="600">${esc(t)}</text>`
        + `</g>`;
    });
  });
  s += `</svg>`;
  document.getElementById("graph").innerHTML = s;

  // tooltip wiring
  const tip = document.getElementById("tip");
  document.querySelectorAll(".n-doc").forEach(g => {
    g.addEventListener("mousemove", e => {
      const parts = g.dataset.tip.split("||");
      tip.innerHTML = `<div class="t">${parts[0]}</div><div>${parts[1]}</div>`
        + `<div style="margin:3px 0">${parts[2]}</div><div class="m">${parts[3]}</div>`;
      tip.style.opacity=1; tip.style.left=Math.min(e.clientX+14, innerWidth-296)+"px"; tip.style.top=(e.clientY+14)+"px";
    });
    g.addEventListener("mouseleave", ()=>{ tip.style.opacity=0; });
  });
}

/* ---- status matrix ---- */
function pip(state){ // true / false / null(n/a)
  if(state===null) return `<span class="pip na" title="not applicable">—</span>`;
  return state ? `<span class="pip y">✓</span>` : `<span class="pip n">✗</span>`;
}
function drawMatrix(filter){
  const groups = grouped();
  let rows = "";
  for(const g of groups){
    for(const c of g.chapters){
      const docs = c.docs.filter(d => filter==="all" || d.status!=="ready");
      if(!docs.length) continue;
      const num = (/ch(\d+)$/.exec(c.id)||[])[1] || "";
      rows += `<tr class="grp"><td colspan="5"><span class="swatch" style="background:${subjColor(g.sub)}"></span>`
        + `${esc(subjLabel(g.sub))} — ${num?`Chapter ${num}: `:""}${esc(c.name)}</td></tr>`;
      for(const d of docs){
        rows += `<tr>`
          + `<td><span class="swatch" style="background:${STATUS[d.status]}"></span>`
          + `<span class="doc-title">${esc(d.title)}</span><br><span class="doc-id mono">${esc(d.doc_id)}</span></td>`
          + `<td><span class="typechip">${esc(d.doc_type.replace(/_/g," "))}</span></td>`
          + `<td class="c">${pip(d.shelved)}</td>`
          + `<td class="c">${pip(d.expects_search ? d.searchable : null)}</td>`
          + `<td class="c">${pip(d.listed)}</td>`
          + `</tr>`;
      }
    }
  }
  if(!rows) rows = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:26px">Nothing needs attention — every document is up to date. 🎉</td></tr>`;
  document.getElementById("matrix").innerHTML =
    `<thead><tr><th>Document</th><th>Type</th><th class="c">Shelved</th><th class="c">Searchable</th><th class="c">Listed</th></tr></thead><tbody>${rows}</tbody>`;
}

/* ---- filter + theme ---- */
document.getElementById("filter").addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  document.querySelectorAll("#filter button").forEach(x=>x.setAttribute("aria-pressed", x===b));
  drawMatrix(b.dataset.f);
});
document.getElementById("themeBtn").addEventListener("click", () => {
  const now = document.documentElement.getAttribute("data-theme");
  const next = now==="dark" ? "light" : now==="light" ? "dark"
    : (matchMedia("(prefers-color-scheme:dark)").matches ? "light":"dark");
  document.documentElement.setAttribute("data-theme", next);
});

drawGraph(); drawMatrix("all");
</script>
"""

STANDALONE = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
              '<meta name="viewport" content="width=device-width,initial-scale=1">'
              '<title>%%TITLE%%</title></head><body>%%BODY%%</body></html>')


def render(data: dict, fragment: bool) -> str:
    body = (CONTENT
            .replace("%%DATA%%", json.dumps(data))
            .replace("%%GENERATED%%", data["generated_at"])
            .replace("%%PREFIX%%", data["bucket_prefix"] or "—"))
    if fragment:
        return body
    return STANDALONE.replace("%%TITLE%%", "OKF Bundle Health Map").replace("%%BODY%%", body)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bundle", default="okf-bundle", help="path to the OKF bundle dir")
    ap.add_argument("--out", default=None, help="output HTML path (default: <bundle>/okf_dashboard.html)")
    ap.add_argument("--mode", choices=["standalone", "fragment"], default="standalone",
                    help="standalone = full HTML file; fragment = body-only (for embedding)")
    args = ap.parse_args()

    if not os.path.isdir(os.path.join(args.bundle, "nodes")):
        print(f"! no nodes/ under {args.bundle} — is this an OKF bundle?", file=sys.stderr)
        return 2

    data = collect(args.bundle)
    html = render(data, args.mode == "fragment")
    out = args.out or os.path.join(args.bundle, "okf_dashboard.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)

    s = data["summary"]
    print(f"OKF dashboard -> {out}")
    print(f"  {s['total']} documents · {s['shelved']} shelved · {s['searchable']} searchable · "
          f"{s['listed']} listed · {s['ready']} ready / {s['partial']} partial / {s['missing']} missing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
