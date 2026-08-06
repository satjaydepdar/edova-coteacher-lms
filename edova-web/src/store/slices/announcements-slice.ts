// Announcements slice (app.js:submitNotify + Announcements composer).
import type { StateCreator } from "zustand"
import { ANNOUNCEMENTS } from "@/data/seed"
import type { Announcement } from "@/lib/types"

export interface AnnouncementsSlice {
  announcements: Announcement[]
  postAnnouncement: (announcement: Announcement) => void
}

export const createAnnouncementsSlice: StateCreator<AnnouncementsSlice, [], [], AnnouncementsSlice> = (set) => ({
  announcements: ANNOUNCEMENTS,
  postAnnouncement: (announcement) =>
    set((s) => ({ announcements: [announcement, ...s.announcements] })),
})
