// Client-side PDF export for a generated/saved lesson plan — no dependencies.
// Renders the plan into a hidden iframe and invokes the browser's print
// dialog ("Save as PDF"). An iframe (vs window.open) sidesteps popup
// blockers and needs no library.
import type { LessonPlan } from "@/lib/types"

const SECTIONS: { key: keyof LessonPlan; label: string }[] = [
  { key: "warmup", label: "Warm-Up" },
  { key: "instruction", label: "Direct Instruction" },
  { key: "activity", label: "Core Activity" },
  { key: "assessment", label: "Assessment" },
  { key: "homework", label: "Homework" },
]

// Escape user/AI text so it can't break the export HTML (or inject markup).
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Escape, then turn newlines into <br> so the bullet lines the AI produces
// render as separate lines in the PDF (not one run-on paragraph).
function escLines(s: string): string {
  return esc(s).replace(/\n/g, "<br>")
}

// Self-contained HTML document used for the PDF export (print dialog).
export function buildLessonPlanHtml(plan: LessonPlan): string {
  const outcomes = plan.outcomes.length
    ? `<div class="block"><h2>Learning Outcomes</h2><ul>${plan.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>`
    : ""
  const standards = plan.standards.length
    ? `<div class="block"><h2>Standards</h2><ul>${plan.standards.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`
    : ""
  const body = SECTIONS.map(
    (s) => `<div class="block"><h2>${s.label}</h2><p>${escLines(plan[s.key] as string)}</p></div>`
  ).join("")

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(plan.title || plan.topic)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #111827; line-height: 1.5; margin: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #16332B; }
  .meta { color: #6B7280; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #3F6E62;
       border-bottom: 1px solid #E5E7EB; padding-bottom: 3px; margin: 18px 0 6px; }
  p { margin: 0 0 6px; font-size: 14px; }
  ul { margin: 4px 0 6px 20px; padding: 0; font-size: 14px; }
  .muted { color: #9CA3AF; }
  .block { margin-bottom: 8px; }
</style></head>
<body>
  <h1>${esc(plan.title || plan.topic)}</h1>
  <div class="meta">${esc(plan.className)} &nbsp;·&nbsp; ${esc(plan.subject)} &nbsp;·&nbsp; ${esc(plan.duration)} min</div>
  <div class="block"><h2>Objective</h2><p>${esc(plan.objective)}</p></div>
  ${outcomes}
  ${standards}
  ${body}
</body></html>`
}

export function exportPlanToPdf(plan: LessonPlan): void {
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(buildLessonPlanHtml(plan))
  doc.close()

  // Give the iframe a tick to lay out before printing, then clean up after.
  const win = iframe.contentWindow!
  const cleanup = () => setTimeout(() => iframe.remove(), 1000)
  win.onafterprint = cleanup
  setTimeout(() => {
    win.focus()
    win.print()
    cleanup()
  }, 300)
}
