// Domain types — mirror the mockup's seed data shapes (_decomp/app.js).
// Split into per-domain modules under ./types; this barrel re-exports
// everything so existing `@/lib/types` imports keep working unchanged.
export * from "./types/core"
export * from "./types/roster"
export * from "./types/assignments"
export * from "./types/announcements"
export * from "./types/resources"
export * from "./types/reports"
export * from "./types/calendar"
export * from "./types/curriculum"
export * from "./types/lesson-plans"
export * from "./types/staff"
export * from "./types/timetable"
export * from "./types/chat"
export * from "./types/learning"
