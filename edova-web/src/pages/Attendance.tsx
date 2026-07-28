import { useEffect } from "react"
import { STUDENTS } from "@/data/seed"
import { statusBadgeStyle } from "@/lib/styles"
import { useSchoolStore } from "@/store/school-store"

const headerCell =
  "border-b border-card-border bg-[#F9FAFB] px-3 py-2.5 text-[14.5px] font-semibold text-text-secondary"

export default function Attendance() {
  const realStudentsList = useSchoolStore((s) => s.realStudentsList)
  const hydrateRealStudents = useSchoolStore((s) => s.hydrateRealStudents)
  useEffect(() => { hydrateRealStudents() }, [hydrateRealStudents])

  return (
    <div>
      <div className="mb-1 font-display text-[24px] font-bold text-ink">Attendance</div>
      <div className="mb-5 text-[16px] text-text-secondary">
        Mark and review daily student attendance.
      </div>

      <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_1fr]">
          <div className={headerCell}>Student</div>
          <div className={headerCell}>Roll No.</div>
          <div className={headerCell}>Attendance</div>
          <div className={headerCell}>Today</div>
          <div className={headerCell}>Status</div>
          {STUDENTS.map((row) => (
            <div key={row.id} className="contents">
              <div className="flex items-center border-b border-card-border p-3 text-[15.5px] font-semibold text-[#111827]">
                {row.name}
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] text-[#374151]">
                {row.rollNo}
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] text-[#374151]">
                {row.attendance}%
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] font-semibold text-[#16A34A]">
                Present
              </div>
              <div className="flex items-center border-b border-card-border p-3">
                <span style={statusBadgeStyle(row.status)}>{row.status}</span>
              </div>
            </div>
          ))}
          {/* Real classroom rosters (edova-backend) -- no real attendance
              records exist yet, so these show honestly as "no data" rather
              than a fabricated percentage/status. */}
          {realStudentsList.map((row) => (
            <div key={row.id} className="contents">
              <div className="flex items-center border-b border-card-border p-3 text-[15.5px] font-semibold text-[#111827]">
                {row.name}
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] text-[#374151]">
                {row.rollNo}
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] text-text-muted">
                —
              </div>
              <div className="flex items-center border-b border-card-border p-3 text-[15px] text-text-muted">
                —
              </div>
              <div className="flex items-center border-b border-card-border p-3">
                <span style={statusBadgeStyle("no-data")}>No data yet</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
