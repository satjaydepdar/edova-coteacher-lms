import { useState } from "react"
import { toast } from "sonner"
import {
  FileText,
  Video,
  ClipboardList,
  Headphones,
  Link as LinkIcon,
  HelpCircle,
  File as FileIcon,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getResourceUrl } from "@/lib/media"
import { verifyResource, type LearningResource, type ResourceTrust } from "@/lib/learning-api"

interface Props {
  chapterName: string
  chapterNumber: number | null
  resources: LearningResource[]
}

// Icon lookup only affects cosmetics — an unrecognised type still gets its
// own group and a generic icon, so a brand-new resource type just works
// with no UI code change.
const TYPE_ICONS: Record<string, typeof FileIcon> = {
  video: Video,
  pdf: FileText,
  worksheet: ClipboardList,
  "question-bank": HelpCircle,
  "q&a": HelpCircle,
  assessments: ClipboardList,
  audio: Headphones,
  podcast: Headphones,
  article: BookOpen,
  link: LinkIcon,
  reference: LinkIcon,
}

function iconFor(type: string) {
  return TYPE_ICONS[type.toLowerCase()] ?? FileIcon
}

// unverified: nobody's looked at this filing yet (or it predates trust
// tracking). auto_classified: the AI pipeline guessed, with a confidence
// score. teacher_reviewed: a person confirmed it — either a direct app
// upload (a teacher already chose subject/chapter/type themselves) or an
// explicit review.
function TrustBadge({ trust }: { trust: ResourceTrust }) {
  if (trust.status === "teacher_reviewed") {
    return <Badge variant="success">Teacher-verified</Badge>
  }
  if (trust.status === "auto_classified") {
    const pct = trust.confidence != null ? ` (${Math.round(trust.confidence * 100)}%)` : ""
    return <Badge variant="info">Auto-sorted{pct}</Badge>
  }
  return <Badge variant="outline">Needs review</Badge>
}

export function StudyMaterial({ chapterName, chapterNumber, resources }: Props) {
  const [open, setOpen] = useState(false)
  // Optimistic overlay: verifyResource() updates the server immediately,
  // but `resources` is owned by LearningHub and won't refetch just because
  // this dialog is open — this keeps the badge in sync without lifting state.
  const [trustOverrides, setTrustOverrides] = useState<Record<string, ResourceTrust>>({})
  const [verifying, setVerifying] = useState<string | null>(null)

  const handleVerify = async (resourceId: string) => {
    setVerifying(resourceId)
    try {
      const result = await verifyResource(resourceId)
      setTrustOverrides((prev) => ({ ...prev, [resourceId]: result.trust }))
    } catch {
      toast.error("Could not mark this as reviewed — try again.")
    } finally {
      setVerifying(null)
    }
  }

  const chapterResources = resources.filter(
    (r) => chapterNumber != null && r.chapter_number === chapterNumber,
  )

  const groups = new Map<string, LearningResource[]>()
  for (const r of chapterResources) {
    const key = r.type || "Other"
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }
  const sortedTypes = [...groups.keys()].sort((a, b) => a.localeCompare(b))

  return (
    <>
      <Button variant="gold" onClick={() => setOpen(true)}>
        Study Material
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Study Material</DialogTitle>
            <DialogDescription>
              {chapterNumber != null ? `Chapter ${chapterNumber} — ${chapterName}` : chapterName}
            </DialogDescription>
          </DialogHeader>

          {chapterResources.length === 0 ? (
            <div className="rounded-[8px] border border-card-border bg-cream p-6 text-center text-[13px] text-text-secondary">
              No study material has been added for this chapter yet. Check
              back later, or ask your teacher.
            </div>
          ) : (
            <div className="space-y-5">
              {sortedTypes.map((type) => {
                const Icon = iconFor(type)
                return (
                  <div key={type}>
                    <h3 className="mb-2 font-display text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">
                      {type}
                    </h3>
                    <div className="grid gap-2">
                      {groups.get(type)!.map((r) => {
                        const url = getResourceUrl(r)
                        const trust = trustOverrides[r.id] ?? r.trust ?? { status: "unverified" as const }
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 rounded-[8px] border border-card-border bg-white p-3"
                          >
                            <a
                              href={url ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              aria-disabled={!url}
                              className={`flex min-w-0 flex-1 items-center gap-3 ${
                                url ? "" : "cursor-not-allowed opacity-60"
                              }`}
                              onClick={(e) => { if (!url) e.preventDefault() }}
                            >
                              <Icon className="size-5 shrink-0 text-okf" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-medium text-ink">{r.title}</div>
                                <div className="text-[11.5px] text-text-secondary">
                                  {r.type}{r.status !== "ready" ? ` · ${r.status}` : ""}
                                </div>
                              </div>
                            </a>
                            <TrustBadge trust={trust} />
                            {trust.status !== "teacher_reviewed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={verifying === r.id}
                                onClick={() => handleVerify(r.id)}
                              >
                                {verifying === r.id ? "Saving…" : "Mark as reviewed"}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
