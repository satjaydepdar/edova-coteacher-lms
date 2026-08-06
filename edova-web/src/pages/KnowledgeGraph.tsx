import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import dagre from "@dagrejs/dagre"
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { PageHeader } from "@/components/common/PageHeader"
import {
  getOkfGraph,
  searchOkfGraph,
  type OkfGraph,
  type OkfGraphDocument,
  type OkfGraphTopic,
  type OkfMatch,
} from "@/lib/okf-graph"

// Administration → Knowledge Graph. Native render of the clerk's /okf/graph:
// subjects → chapters → topics → documents laid out left-to-right, every
// document colored by its shelf/index/list status. One non-cascading search
// box (BM25 via /okf/search) filters the tree to the union of matches at any
// level; clearing it restores the full graph. Clicking a chapter, topic or
// document jumps to the matching chapter in Teaching → Resources.

type SubjectNode = Node<{ label: string; chapters: number }, "subject">
type ChapterNode = Node<{ label: string; chapterId: string; docs: number }, "chapter">
type TopicNode = Node<{ label: string; chapterId: string; docs: number }, "topic">
type DocNode = Node<{ doc: OkfGraphDocument }, "doc">
type GraphNode = SubjectNode | ChapterNode | TopicNode | DocNode

const STATUS = {
  ready: { label: "Ready", color: "#1E7A52", bg: "#E9F5EE", border: "#BFE0D3" },
  partial: { label: "Needs attention", color: "#B45309", bg: "#FEF6E4", border: "#F0D9A8" },
  missing: { label: "Missing", color: "#B42318", bg: "#FDECEA", border: "#F3C2BD" },
} as const

const NODE_SIZE = {
  subject: { width: 160, height: 48 },
  chapter: { width: 200, height: 60 },
  topic: { width: 210, height: 56 },
  doc: { width: 240, height: 68 },
}

function titleCase(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const SUBJECT_NAMES: Record<string, string> = { math: "Mathematics", science: "Science" }

function SubjectNodeView({ data }: NodeProps<SubjectNode>) {
  return (
    <div
      className="grid h-full w-full cursor-default place-items-center rounded-[12px] text-[14.5px] font-bold text-white shadow-sm"
      style={{ background: "#16332B" }}
    >
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      {data.label}
      <span className="ml-1.5 text-[11px] font-semibold text-white/60">{data.chapters} ch</span>
    </div>
  )
}

function ChapterNodeView({ data }: NodeProps<ChapterNode>) {
  return (
    <div className="flex h-full w-full cursor-pointer flex-col justify-center rounded-[10px] border border-[#E5E1D2] bg-white px-3 shadow-sm transition-colors hover:border-[#16332B]">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <div className="truncate text-[13.5px] font-semibold text-ink">{data.label}</div>
      <div className="text-[11px] text-text-muted">{data.docs} document{data.docs === 1 ? "" : "s"}</div>
    </div>
  )
}

function TopicNodeView({ data }: NodeProps<TopicNode>) {
  const empty = data.docs === 0
  return (
    <div
      className={`flex h-full w-full cursor-pointer flex-col justify-center rounded-[10px] border bg-okf-bg px-3 shadow-sm transition-colors hover:border-[#16332B] ${
        empty ? "border-dashed border-okf-border" : "border-okf-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <div className="truncate text-[13px] font-semibold text-okf">{data.label}</div>
      <div className="text-[11px] text-okf/70">{empty ? "no materials yet" : `${data.docs} resource${data.docs === 1 ? "" : "s"}`}</div>
    </div>
  )
}

function DocNodeView({ data }: NodeProps<DocNode>) {
  const s = STATUS[data.doc.status]
  return (
    <div
      className="flex h-full w-full cursor-pointer flex-col justify-center rounded-[10px] border bg-white px-3 shadow-sm transition-colors hover:border-[#16332B]"
      style={{ borderColor: s.border }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="truncate text-[13px] font-semibold text-ink">{data.doc.title}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: s.color }} />
        <span className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</span>
        <span className="text-[11px] text-text-muted">· {titleCase(data.doc.doc_type)}</span>
      </div>
    </div>
  )
}

const nodeTypes = { subject: SubjectNodeView, chapter: ChapterNodeView, topic: TopicNodeView, doc: DocNodeView }

/** Entity sets a search result makes visible. Subjects/chapters pull in their
 * whole subtree; topics and documents pull in their ancestor chain. */
interface GraphFilter {
  subjects: Set<string>
  chapters: Set<string>
  topics: Set<string>
  docs: Set<string>
}

function buildFilter(matches: OkfMatch[]): GraphFilter {
  const f: GraphFilter = { subjects: new Set(), chapters: new Set(), topics: new Set(), docs: new Set() }
  for (const m of matches) {
    if (m.type === "subject") f.subjects.add(m.id)
    else if (m.type === "chapter") f.chapters.add(m.id)
    else if (m.type === "topic") f.topics.add(m.id)
    else f.docs.add(m.id)
  }
  return f
}

interface LayoutResult {
  nodes: GraphNode[]
  edges: Edge[]
  counts: { subjects: number; chapters: number; topics: number; docs: number }
}

function buildLayout(data: OkfGraph, filter: GraphFilter | null): LayoutResult {
  const docVisible = (d: OkfGraphDocument) =>
    !filter ||
    filter.subjects.has(d.subject) ||
    filter.chapters.has(d.chapter_id) ||
    filter.docs.has(d.doc_id) ||
    (!!d.topic_id && filter.topics.has(d.topic_id))

  // Group visible documents into subject -> chapter. A chapter exists in the
  // tree only through its documents; explicit chapter/subject matches surface
  // every document of that chapter/subject via docVisible above.
  const subjects = new Map<string, { label: string; chapters: Map<string, { label: string; docs: OkfGraphDocument[] }> }>()
  for (const doc of data.nodes) {
    if (!docVisible(doc)) continue
    const subjectKey = doc.subject || "other"
    if (!subjects.has(subjectKey)) {
      subjects.set(subjectKey, { label: SUBJECT_NAMES[subjectKey] ?? titleCase(subjectKey), chapters: new Map() })
    }
    const subject = subjects.get(subjectKey)!
    const chapterKey = doc.chapter_id || "ungrouped"
    if (!subject.chapters.has(chapterKey)) {
      subject.chapters.set(chapterKey, { label: doc.chapter_name || titleCase(chapterKey), docs: [] })
    }
    subject.chapters.get(chapterKey)!.docs.push(doc)
  }

  const visibleChapterIds = new Set<string>()
  for (const subject of subjects.values()) for (const chapterKey of subject.chapters.keys()) visibleChapterIds.add(chapterKey)

  const topicVisible = (t: OkfGraphTopic) =>
    t.chapter_id !== "" &&
    visibleChapterIds.has(t.chapter_id) &&
    (!filter || filter.subjects.has(t.subject) || filter.chapters.has(t.chapter_id) || filter.topics.has(t.topic_id))

  const nodes: GraphNode[] = []
  const edges: Edge[] = []
  for (const [subjectKey, subject] of subjects) {
    const subjectId = `subject:${subjectKey}`
    nodes.push({ id: subjectId, type: "subject", position: { x: 0, y: 0 }, data: { label: subject.label, chapters: subject.chapters.size } })
    for (const [chapterKey, chapter] of subject.chapters) {
      const chapterId = `chapter:${chapterKey}`
      nodes.push({ id: chapterId, type: "chapter", position: { x: 0, y: 0 }, data: { label: chapter.label, chapterId: chapterKey, docs: chapter.docs.length } })
      edges.push({ id: `${subjectId}->${chapterId}`, source: subjectId, target: chapterId, style: { stroke: "#C9C4B4" } })

      const chapterTopics = data.topics.filter((t) => t.chapter_id === chapterKey && topicVisible(t))
      const topicDocCount = new Map<string, number>()
      for (const doc of chapter.docs) {
        if (doc.topic_id && chapterTopics.some((t) => t.topic_id === doc.topic_id)) {
          topicDocCount.set(doc.topic_id, (topicDocCount.get(doc.topic_id) ?? 0) + 1)
        }
      }
      for (const topic of chapterTopics) {
        const topicId = `topic:${topic.topic_id}`
        const docs = topicDocCount.get(topic.topic_id) ?? 0
        nodes.push({ id: topicId, type: "topic", position: { x: 0, y: 0 }, data: { label: topic.title, chapterId: chapterKey, docs } })
        edges.push({ id: `${chapterId}->${topicId}`, source: chapterId, target: topicId, style: { stroke: "#D8D3C2" } })
      }

      for (const doc of chapter.docs) {
        const docId = `doc:${doc.doc_id}`
        nodes.push({ id: docId, type: "doc", position: { x: 0, y: 0 }, data: { doc } })
        const parent = doc.topic_id && chapterTopics.some((t) => t.topic_id === doc.topic_id) ? `topic:${doc.topic_id}` : chapterId
        edges.push({ id: `${parent}->${docId}`, source: parent, target: docId, style: { stroke: "#D8D3C2" } })
      }
    }
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "LR", nodesep: 12, ranksep: 70, marginx: 16, marginy: 16 })
  g.setDefaultEdgeLabel(() => ({}))
  // Fresh size object per node: dagre mutates the label it is given, so a
  // shared NODE_SIZE reference collapses every same-type node onto one spot.
  for (const n of nodes) g.setNode(n.id, { ...NODE_SIZE[n.type as keyof typeof NODE_SIZE] })
  for (const e of edges) g.setEdge(e.source, e.target)
  dagre.layout(g)

  const counts = { subjects: subjects.size, chapters: visibleChapterIds.size, topics: 0, docs: 0 }
  return {
    nodes: nodes.map((n) => {
      const size = NODE_SIZE[n.type as keyof typeof NODE_SIZE]
      const p = g.node(n.id)
      if (n.type === "topic") counts.topics += 1
      if (n.type === "doc") counts.docs += 1
      return { ...n, position: { x: p.x - size.width / 2, y: p.y - size.height / 2 }, width: size.width, height: size.height }
    }),
    edges,
    counts,
  }
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-[12px] border border-[#E5E1D2] bg-white px-4 py-3 shadow-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 text-[20px] font-bold" style={{ color: tone ?? "#16332B" }}>{value}</div>
    </div>
  )
}

function GraphCanvas({ layout, onOpen }: { layout: LayoutResult; onOpen: (node: GraphNode) => void }) {
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>(layout.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layout.edges)

  // fitView on <ReactFlow> only runs at mount — when the canvas is still empty
  // (data arrives async). Refit whenever a fresh layout lands instead.
  useEffect(() => {
    setNodes(layout.nodes)
    setEdges(layout.edges)
    const raf = requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 1 }))
    return () => cancelAnimationFrame(raf)
  }, [layout, setNodes, setEdges, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onOpen(node as GraphNode)}
      minZoom={0.1}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} color="#EDEAE0" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => (n.type === "subject" ? "#16332B" : n.type === "chapter" ? "#BFE0D3" : n.type === "topic" ? "#E9F1EC" : "#E5E1D2")}
        className="!bg-[#F9FAF7]"
      />
    </ReactFlow>
  )
}

export default function KnowledgeGraph() {
  const navigate = useNavigate()
  const [data, setData] = useState<OkfGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<OkfMatch[] | null>(null)
  const [searching, setSearching] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    getOkfGraph()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the knowledge graph"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Type-to-filter, debounced. Fewer than 2 characters means no filter at
  // all — the full graph stays put while the user is still typing.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setMatches(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      searchOkfGraph(q)
        .then((r) => setMatches(r.matches))
        .catch(() => setMatches([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const filter = useMemo(() => (matches ? buildFilter(matches) : null), [matches])
  const layout = useMemo(() => (data ? buildLayout(data, filter) : null), [data, filter])
  const noMatches = filter !== null && layout !== null && layout.nodes.length === 0

  return (
    <div>
      <PageHeader
        title="Knowledge Graph"
        subtitle="Every document in the OKF library — how subjects, chapters, topics and materials connect, and each document's status at a glance."
        actions={
          <button
            onClick={load}
            className="cursor-pointer rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] py-2 text-[14.5px] font-semibold text-[#374151]"
          >
            ↻ Refresh
          </button>
        }
      />

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Documents" value={data.summary.total} />
          <StatCard label="Ready" value={data.summary.ready} tone={STATUS.ready.color} />
          <StatCard label="Needs attention" value={data.summary.partial} tone={STATUS.partial.color} />
          <StatCard label="Missing" value={data.summary.missing} tone={STATUS.missing.color} />
          <StatCard label="Chapters" value={data.summary.chapters} />
          <StatCard label="Subjects" value={data.summary.subjects} />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-[480px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the graph — subject, chapter, topic, or document (try “light” or “euclid”)"
            className="w-full rounded-[10px] border border-[#E5E1D2] bg-white px-4 py-2.5 pr-9 text-[14px] text-ink shadow-sm outline-none placeholder:text-text-muted focus:border-[#16332B]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full px-1.5 text-[15px] font-bold text-text-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        {searching && <span className="text-[12.5px] text-text-muted">Searching…</span>}
        {filter && !searching && layout && layout.nodes.length > 0 && (
          <span className="text-[12.5px] text-text-secondary">
            {layout.counts.chapters} chapter{layout.counts.chapters === 1 ? "" : "s"} · {layout.counts.topics} topic{layout.counts.topics === 1 ? "" : "s"} · {layout.counts.docs} document{layout.counts.docs === 1 ? "" : "s"} match “{query.trim()}”
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#E5E1D2] bg-white shadow-sm">
        {error ? (
          <div className="grid h-[calc(100vh-320px)] min-h-[400px] place-items-center">
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink">Knowledge graph unavailable</p>
              <p className="mt-1 text-[13px] text-text-secondary">{error}</p>
              <button onClick={load} className="mt-4 cursor-pointer rounded-[8px] bg-ink px-4 py-2 text-[14px] font-semibold text-sidebar-text">
                Try again
              </button>
            </div>
          </div>
        ) : loading && !data ? (
          <div className="grid h-[calc(100vh-320px)] min-h-[400px] place-items-center text-[14px] text-text-secondary">
            Loading knowledge graph…
          </div>
        ) : noMatches ? (
          <div className="grid h-[calc(100vh-320px)] min-h-[400px] place-items-center">
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink">No matches for “{query.trim()}”</p>
              <p className="mt-1 text-[13px] text-text-secondary">Try a subject, chapter, topic, or document name.</p>
              <button onClick={() => setQuery("")} className="mt-4 cursor-pointer rounded-[8px] bg-ink px-4 py-2 text-[14px] font-semibold text-sidebar-text">
                Clear search
              </button>
            </div>
          </div>
        ) : layout ? (
          <div className="h-[calc(100vh-320px)] min-h-[400px]">
            <ReactFlowProvider>
              <GraphCanvas
                layout={layout}
                onOpen={(node) => {
                  if (node.type === "doc") navigate(`/resources?expandChapter=${(node as DocNode).data.doc.chapter_id}`)
                  if (node.type === "chapter") navigate(`/resources?expandChapter=${(node as ChapterNode).data.chapterId}`)
                  if (node.type === "topic") navigate(`/resources?expandChapter=${(node as TopicNode).data.chapterId}`)
                }}
              />
            </ReactFlowProvider>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-text-secondary">
        {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: STATUS[k].color }} />
            {STATUS[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] border border-dashed border-okf-border bg-okf-bg" />
          Topic with no materials yet
        </span>
        <span className="ml-auto">Click a chapter, topic or document to open it in Resources · Updated {data?.generated_at ?? "—"}</span>
      </div>
    </div>
  )
}
