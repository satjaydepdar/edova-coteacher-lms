#!/usr/bin/env python3
"""
visualize_okf.py - Render an OKF bundle (nodes/ + edges/) as an interactive HTML graph.

Usage:
    python tools/visualize_okf.py                      # reads ./okf-bundle, writes okf_graph.html
    python tools/visualize_okf.py --bundle okf-bundle --out build/okf_graph.html
    python tools/visualize_okf.py --cdn                # link vis-network from CDN instead of embedding

The output is a single self-contained HTML file you can open in any browser
or share with the team. Uses PyYAML to read nodes/*.md (OKF frontmatter),
already a dependency of the ingest pipeline this reads output from.
"""
import argparse
import glob
import json
import os
import sys
import urllib.request

import yaml

VIS_CDN = "https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"

SUBJECT_COLORS = {
    "math": "#4C8BF5", "science": "#34A853", "english": "#F4B400",
    "geography": "#9334E6", "history": "#E8710A",
}
UNKNOWN_COLOR = "#9AA0A6"

EDGE_COLORS = {
    "belongs_to": "#5F6368", "prerequisite_of": "#D93025",
    "assesses": "#E8710A", "references": "#188038",
}


def color_for_node(node_id):
    nid = node_id.lower()
    for subject, color in SUBJECT_COLORS.items():
        if subject in nid:
            return color
    return UNKNOWN_COLOR


def short_label(node_id):
    return node_id.replace("subject_", "").replace("_chapter_content_", "\n")


def load_json_dir(pattern):
    docs = {}
    for path in sorted(glob.glob(pattern, recursive=True)):
        try:
            with open(path, encoding="utf-8") as fh:
                docs[path] = json.load(fh)
        except Exception as exc:
            print(f"  ! skipped {path}: {exc}", file=sys.stderr)
    return docs


def load_node_dir(pattern):
    """nodes/*.md: YAML frontmatter + markdown body (see ingest.py)."""
    docs = {}
    for path in sorted(glob.glob(pattern, recursive=True)):
        try:
            with open(path, encoding="utf-8") as fh:
                _, front, _ = fh.read().split("---", 2)
            docs[path] = yaml.safe_load(front) or {}
        except Exception as exc:
            print(f"  ! skipped {path}: {exc}", file=sys.stderr)
    return docs


def collect_graph(bundle):
    node_docs = load_node_dir(os.path.join(bundle, "nodes", "**", "*.md"))
    edge_docs = load_json_dir(os.path.join(bundle, "edges", "**", "*.json"))

    nodes = {}
    for path, doc in node_docs.items():
        nid = (doc.get("node_id") or doc.get("doc_id") or doc.get("id")
               or os.path.splitext(os.path.basename(path))[0])
        nodes[nid] = {"meta": doc, "virtual": False}

    edges = []
    for path, doc in edge_docs.items():
        frm, to = doc.get("from"), doc.get("to")
        if not frm or not to:
            print(f"  ! edge without from/to in {path}", file=sys.stderr)
            continue
        edges.append(doc)
        for endpoint in (frm, to):
            nodes.setdefault(endpoint, {"meta": {}, "virtual": True})
        # Attach every content payload (doc_ids) to its "from" node
        for doc_id in doc.get("doc_ids", []):
            if doc_id in nodes:
                edges.append({"from": frm, "to": doc_id, "type": "_content"})

    degree = {nid: 0 for nid in nodes}
    for e in edges:
        degree[e["from"]] = degree.get(e["from"], 0) + 1
        degree[e["to"]] = degree.get(e["to"], 0) + 1
    return nodes, edges, degree


def to_vis_data(nodes, edges, degree):
    vis_nodes = []
    for nid, info in sorted(nodes.items()):
        is_subject = nid.startswith("subject_") or info["virtual"]
        tooltip = "<b>%s</b><br>%s" % (
            nid,
            "<br>".join(f"{k}: {v}" for k, v in info["meta"].items()) or "(placeholder node)",
        )
        vis_nodes.append({
            "id": nid,
            "label": short_label(nid),
            "title": tooltip,
            "color": {"background": color_for_node(nid),
                      "border": "#202124" if is_subject else color_for_node(nid)},
            "shape": "box" if is_subject else "dot",
            "size": 12 + min(degree.get(nid, 0), 20) if not is_subject else None,
            "font": {"size": 14},
            "borderWidth": 2 if is_subject else 1,
        })
    for n in vis_nodes:
        for k in [k for k, v in n.items() if v is None]:
            del n[k]

    vis_edges = []
    for e in edges:
        if e.get("type") == "_content":
            vis_edges.append({"from": e["from"], "to": e["to"], "dashes": True,
                              "color": {"color": "#DADCE0"}, "arrows": ""})
            continue
        vis_edges.append({
            "from": e["from"], "to": e["to"], "label": e.get("type", ""),
            "arrows": "to",
            "color": {"color": EDGE_COLORS.get(e.get("type", ""), "#BDC1C6")},
            "font": {"size": 10, "align": "middle", "color": "#5F6368"},
            "smooth": {"type": "continuous"},
        })
    return vis_nodes, vis_edges


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>OKF Bundle Graph</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {{ margin: 0; font-family: Roboto, Arial, sans-serif; background: #f8f9fa; }}
  #graph {{ width: 100vw; height: 100vh; }}
  #hud {{ position: fixed; top: 12px; left: 12px; background: #fff; border: 1px solid #dadce0;
         border-radius: 8px; padding: 10px 14px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,.15); }}
  #hud h1 {{ font-size: 15px; margin: 0 0 6px; }}
  #hud .legend span {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%;
                      margin: 0 4px 0 10px; }}
  #hud button {{ margin-top: 8px; margin-right: 6px; padding: 4px 10px; border: 1px solid #dadce0;
                border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }}
  #hud button:hover {{ background: #f1f3f4; }}
</style>
</head>
<body>
<div id="hud">
  <h1>OKF bundle graph</h1>
  <div>{n_nodes} nodes &middot; {n_edges} edges</div>
  <div class="legend">{legend}</div>
  <button id="btn-physics">Force layout</button>
  <button id="btn-tree">Tree layout</button>
</div>
<div id="graph"></div>
{vis_script}
<script>
const nodes = new vis.DataSet({nodes_json});
const edges = new vis.DataSet({edges_json});
const network = new vis.Network(document.getElementById("graph"), {{nodes, edges}}, {{}});

const PHYSICS = {{ physics: {{ solver: "barnesHut",
  barnesHut: {{ gravitationalConstant: -9000, springLength: 130, avoidOverlap: 0.4 }},
  stabilization: {{ iterations: 200 }} }}, layout: {{ hierarchical: false }} }};
const TREE = {{ physics: false, layout: {{ hierarchical:
  {{ direction: "UD", sortMethod: "directed", levelSeparation: 140, nodeSpacing: 130 }} }} }};

function apply(opts) {{ network.setOptions(opts); network.fit({{animation: true}}); }}
document.getElementById("btn-physics").onclick = () => apply(PHYSICS);
document.getElementById("btn-tree").onclick    = () => apply(TREE);
apply(PHYSICS);
</script>
</body>
</html>
"""


def get_vis_script(use_cdn):
    if not use_cdn:
        try:
            with urllib.request.urlopen(VIS_CDN, timeout=20) as resp:
                return "<script>\n" + resp.read().decode("utf-8") + "\n</script>"
        except Exception as exc:
            print(f"  ! could not fetch vis-network ({exc}); falling back to CDN link",
                  file=sys.stderr)
    return f'<script src="{VIS_CDN}"></script>'


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bundle", default="okf-bundle", help="path to the okf-bundle directory")
    ap.add_argument("--out", default="okf_graph.html", help="output HTML file")
    ap.add_argument("--cdn", action="store_true",
                    help="link vis-network from CDN instead of embedding it")
    args = ap.parse_args()

    print(f"Scanning {args.bundle}/ ...")
    nodes, edges, degree = collect_graph(args.bundle)
    if not nodes:
        sys.exit("No nodes or edges found - is --bundle pointing at your okf-bundle directory?")

    vis_nodes, vis_edges = to_vis_data(nodes, edges, degree)
    legend = "".join(
        f'<span style="background:{c}"></span>{s}'
        for s, c in SUBJECT_COLORS.items()
        if any(s in nid.lower() for nid in nodes)
    ) or f'<span style="background:{UNKNOWN_COLOR}"></span>nodes'

    html = HTML_TEMPLATE.format(
        n_nodes=len(vis_nodes), n_edges=len(vis_edges), legend=legend,
        nodes_json=json.dumps(vis_nodes), edges_json=json.dumps(vis_edges),
        vis_script=get_vis_script(args.cdn),
    )
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"OK -> {args.out}  ({len(vis_nodes)} nodes, {len(vis_edges)} edges)")
    print("Open it in a browser: drag to rearrange, scroll to zoom, hover for metadata.")


if __name__ == "__main__":
    main()