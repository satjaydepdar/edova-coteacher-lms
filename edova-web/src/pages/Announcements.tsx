import { useSchoolStore } from "@/store/school-store"

export default function Announcements() {
  const announcements = useSchoolStore((s) => s.announcements)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-display text-[24px] font-bold text-ink">
            Student Communication
          </div>
          <div className="mt-0.5 text-[16px] text-text-secondary">
            Share notices, reminders, and updates.
          </div>
        </div>
        <div
          className="cursor-pointer rounded-[8px] px-[18px] py-2.5 text-[15px] font-semibold text-white"
          style={{ background: "#16332B" }}
        >
          + New Announcement
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {announcements.map((an) => (
          <div
            key={an.id}
            className="rounded-[12px] border border-card-border bg-cream px-5 py-[18px] shadow-card"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[16.5px] font-bold text-[#111827]">
                {an.title}
              </div>
              <div className="text-[13.5px] text-text-muted">{an.date}</div>
            </div>
            <div className="text-[15px] leading-[1.5] text-[#374151]">
              {an.body}
            </div>
            <div className="mt-2.5 inline-block rounded-full bg-okf-bg px-2.5 py-[3px] text-[13.5px] font-semibold text-okf">
              {an.audience}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
