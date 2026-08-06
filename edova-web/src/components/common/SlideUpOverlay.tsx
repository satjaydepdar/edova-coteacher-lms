import { useEffect } from "react"

// Lightweight slide-up overlay for Video/Document/Upload panels on the Learning
// Resources page (Developer Handoff Notes: "Do NOT use full-page modals").
// Sits on top of the Level 2 list without unmounting it, so closing the overlay
// preserves scroll position underneath.
export function SlideUpOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        className="w-full max-w-[640px] translate-y-0 rounded-t-[16px] border border-card-border bg-white shadow-xl transition-transform duration-200 ease-out sm:rounded-[16px]"
        style={{ maxHeight: "88vh", overflowY: "auto" }}
      >
        <div
          onClick={onClose}
          className="sticky top-0 flex items-center justify-end border-b border-card-border bg-white px-5 py-3"
        >
          <div className="cursor-pointer text-[13px] font-semibold text-text-secondary hover:text-ink">
            Close ✕
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
