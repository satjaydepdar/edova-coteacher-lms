import { useSchoolStore, type FlashKey } from "@/store/school-store"

// Inline confirmation banner — ports the mockup's flash pattern
// (xdc_template.html: lessonFlash/curriculumFlash/homeworkFlash/timetableFlash/
// resourceFlash), shown in-card and auto-dismissed via the store timer.
export function FlashBanner({ flashKey }: { flashKey: FlashKey }) {
  const msg = useSchoolStore((s) => s.flash[flashKey])
  if (!msg) return null
  return (
    <div
      style={{
        background: "#E9F1EC",
        border: "1px solid #BFE0D3",
        color: "#16332B",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 14,
      }}
    >
      {msg}
    </div>
  )
}
