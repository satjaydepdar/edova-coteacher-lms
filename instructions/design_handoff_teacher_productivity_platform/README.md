# Handoff: Teacher Productivity Platform ("Edova")

## Overview
Edova is a teacher-facing productivity platform: dashboard, timetable/calendar, lesson planning, syllabus/curriculum mapping, assessment authoring & grading, homework/assignment tracking, gradebook, student behavior/progress/analytics, learning-resource library (with an "OKF" curriculum-aligned content library), announcements, parent communication, and reports — plus an in-app AI chat assistant. This package hands off the full app for a from-scratch rebuild on a production stack.

## About the Design Files
The file in `design-reference/` is a **design reference prototype built in HTML** (inline styles, a lightweight in-house templating runtime). It is **not production code** — do not copy its markup or `support.js` runtime into the target codebase. Its job is to communicate exact layout, styling, copy, and interaction/state behavior. Recreate every screen natively in the target stack below, using that stack's own component patterns.

Because the prototype uses **inline CSS with literal values** (no classes, no build step), every exact color, spacing, font-size, radius and shadow is directly readable in the file — open it and inspect the relevant `<div style="...">` for ground truth rather than relying on transcription. This README focuses on architecture, page inventory, data/state models, and behavior that isn't obvious from static markup.

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy in the reference file are final — reproduce them pixel-for-pixel using the target stack's components. Where the reference uses a plain `<div>`/`<select>`/emoji icon, prefer the equivalent shadcn/ui primitive or Lucide icon rather than a bare HTML element, as long as the visual result matches.

## Target Tech Stack
Build the rebuild with this stack (from the team's stack decision):

| Layer | Technology | Notes for this app |
|---|---|---|
| Frontend | React 19 + TypeScript | Strict typing for all data models below |
| Build Tool | Vite | — |
| UI Framework | Tailwind CSS v4 | Port inline styles to Tailwind utility classes / design tokens (see Design Tokens) |
| Component Library | shadcn/ui | Cards, Dialogs (modals), Select, Tabs, Badge, Progress, Sheet (side panels), Dropdown Menu |
| Icons | Lucide React | Swap every emoji icon (🏠 📅 🏫 etc.) for the closest Lucide icon, same visual weight |
| Charts | Recharts | Attendance trend bars, homework completion bars, coverage/progress bars in Class Analytics & Course Progress |
| Forms | React Hook Form + Zod | New Assignment modal, Add Exam/Curriculum Unit modals, Lesson Planner form, Assessment Builder question editors |
| Data Tables | TanStack Table | Gradebook, Homework Tracker, Assignments submission lists, Reports |
| Calendar | FullCalendar React | My Calendar view (schedule/meetings/holidays/exams) |
| Rich Text Editor | Tiptap | Lesson plan notes, Announcements composer |
| PDF Viewer | React PDF | Worksheet/question-paper/report previews in Learning Resources & Reports |
| File Upload | React Dropzone | "+ Upload" in Learning Resources |
| State Management | Zustand | Global app state: current view/route, global class/year/section context, all filter states (see State Management) |
| Server State | TanStack Query | Wrap all CRUD (assignments, exams, curriculum units, behavior notes, gradebook, resources) in queries/mutations with optimistic updates |
| Routing | React Router v7 | One route per nav item (see Screens); nested layout route owns the sidebar shell |
| Authentication | Auth.js (NextAuth) / Clerk | Not modeled in the prototype — add a login gate + role (Teacher/Admin) before the shell |
| Notifications | Sonner | Every "flash" success banner in the prototype (resourceFlash, homeworkFlash, abSaveFlash, etc.) becomes a toast instead of an inline banner |

## App Shell
- Fixed left **sidebar**, 260px wide, dark background (`#13231F`), full height, sticky. Contains: logo mark (gold square badge `#D9A94E` + "Edova" wordmark in Poppins), then grouped nav sections with uppercase muted-green group labels: Home, Administration (admin-only), Planning, Teaching, Students, Communication. Each nav item is icon + label; active item gets a highlighted background/text treatment (inspect `navItemStyle` logic in the reference for the exact active-state rule).
- Main content area is a single scrolling column, white background, generous padding, max content width per screen.
- Global context chip (📍 label) appears on several screens (Syllabus Map, Course Progress) showing the active Academic Year + Class/Section — this is the same global filter store, not a per-page filter.
- A floating **chat widget** (bottom-right, AI assistant) is available app-wide — see Chat Assistant section.

## Design Tokens
Pull exact values from the reference file; the notable ones:

**Color palette**
- Ink / primary text: `#13231F` (near-black green), secondary text `#6B7280`, muted/tertiary `#9CA3AF`
- Sidebar dark: `#13231F`; sidebar text on dark: `#FBF7EE`
- Accent gold (brand mark): `#D9A94E`
- Card surface (cream): `#F5F1E6`; card border: `#E5E7EB`; card shadow: `0 1px 3px rgba(0,0,0,.08)`
- OKF / "linked curriculum" accent (teal-green): text `#16332B`, background `#E9F1EC`, border `#BFE0D3` — used consistently as the visual signature for anything tied to the OKF curriculum library
- Assessment Builder uses a slightly different cream/brown palette: surface `#F5F1E6`/`#FFFFFF`, border `#DDD8CF`, muted text `#7A9298`, teal accent `#3D5A60`
- Semantic: success `#16A34A` / `#16A34A`-family greens, warning `#F59E0B`/`#D97706`, danger `#DC2626`, weak-performance badge `#8A4B1F` on `#FBEBD6` bg with `#F0CFA0` border
- Status/attendance/at-risk badges reuse the semantic colors above; check each screen for its own badge-style helper function (e.g. `behaviorBadgeStyle`, `statusStyle`) rather than assuming one global mapping

**Typography**
- Display/headings: **Poppins** 500–800 weight — page titles (24px/700), stat numbers (30px/700), card section titles (16–18px/700)
- Body/UI: **Nunito** 400–800 weight — all body copy, table cells, form labels, buttons
- Base body text ~15–16px; secondary/meta text 12.5–14px; section eyebrow labels 12–13px uppercase with letter-spacing

**Shape & elevation**
- Card radius 12px, pill/badge radius 999px, button/input radius 8px, small chip radius 8–10px
- Standard card: 1px border `#E5E7EB` + `box-shadow: 0 1px 3px rgba(0,0,0,.08)`
- Modals: darker overlay `rgba(26,46,53,.5)` with backdrop-blur, card radius 16px, larger shadow

**Spacing**
- Page padding follows a ~20–24px rhythm; card internal padding 18–20px; table row padding 10–14px; gaps between stat cards / grid tiles 16–20px

## Screens / Views
One React Router route per item, all under a shared authenticated layout route (sidebar shell). Group headers below match the sidebar's nav grouping.

**Home**
- **Dashboard** (`/dashboard`) — daily greeting header + 4 stat cards (Classes Today, Pending Grading, Avg. Attendance, At-Risk Students) + upcoming/today panels.
- **My Calendar** (`/calendar`) — schedule/meetings/holidays/exams in a calendar grid (FullCalendar).
- **My Classes** (`/classes`) — grid of class cards (grade/section, subject, room, schedule, student count).
- **My Subjects** (`/subjects`) — subjects taught + syllabus/progress summary per subject.

**Administration** *(admin role only)*
- **Settings** (`/settings`) — manage school timetable, syllabus, and exam schedule for the year; changes propagate to Lesson Planner, Syllabus Map, and Assessment & Exams (model this as shared server-state, not local copies).

**Planning**
- **Lesson Planner** (`/lesson-planner`) — AI-generation form (topic, class, subject, duration, standards) + this-week plan + saved library list.
- **Syllabus Map** (`/curriculum-map`) — per-unit planned-vs-actual coverage; includes the **OKF Curriculum Alignment** panel: Class › Subject › Topic cascading filters, per-OKF-chapter coverage bars with "View in Library" deep link.
- **Course Progress** (`/course-progress`) — planned vs. actual teaching progress by class, bar/percentage view.

**Teaching**
- **Assignments** (`/assignments`) — list + create/assign-from-bank flow, per-assignment submission roll-up.
- **Homework Tracker** (`/homework-tracker`) — submission status table (not_started / submitted / late / missing) with review & score entry.
- **Assessment & Exams** (`/exams`) — quiz/test/unit-exam scheduling, coverage-unit linkage, revision-session tracking.
- **Assessment Builder** (`/assessment-builder`) — two tabs: *Saved Bank* (cards: title, class/term, section/question/point counts, "Assign to Class") and *Build* (drag-free palette of question-type tiles + **Import from OKF** modal: expandable Chapter → Topic tree, checkbox question picker, "Add to Assessment" footer with live selected-count).
- **Attendance** (`/attendance`) — daily mark/review grid per class.
- **Learning Resources** (`/resources`) — "My Uploads" grid (title, type, class, upload date) + **OKF Library** (read-only CBSE curriculum catalog: Chapter → Topic → Resource, each resource typed Video/PDF/Worksheet/PPT with a traceable `okf_ref`, plus a "Notify" action per resource).

**Students**
- **Student Behavior** (`/behavior`) — positive/incident notes feed per student/class.
- **Gradebook** (`/gradebook`) — Class › Section cascading filters; student table (Student, Roll No., Assignments Avg., Overall Grade); **OKF Chapter Performance** panel below it — per-chapter class average score with a weak-chapter (<65%) flag, "View resources" (deep-links to Learning Resources, expands that chapter) and "Assign practice" (deep-links to Assessment Builder) actions.
- **Student Progress** (`/student-progress`) — per-student progress bar + status badge.
- **Class Analytics** (`/analytics`) — AI "at-risk" insights card + attendance-trend and homework-completion-rate bar charts (Recharts).

**Communication**
- **Announcements** (`/announcements`) — composer (Tiptap) + posted notices list.
- **Upcoming Tasks** (`/upcoming-tasks`) — pending lesson plans, grading, meetings, deadlines list.
- **Parent Communication** (`/parent-communication`) — per-student message templates (formal/friendly tone variants) and send history.
- **Reports** (`/reports`) — generate attendance/assessment/performance/coverage reports (PDF preview via React PDF).

**Chat Assistant** (global, not a route) — floating widget; root chip prompts ("Generate Worksheet", etc.) fan out into contextual replies (exit tickets, policy Q&A with cited source snippet, email drafts by tone). Model as its own small state machine (thread of chip → response nodes), not a general LLM call, unless the team wants to wire it to a real model.

## Interactions & Behavior
- **Cascading filters**: every "Class › Subject › Topic" or "Class › Section" filter pattern (Syllabus Map's OKF alignment, Gradebook) resets the child filter(s) to "all" when a parent filter changes. Implement as one filter-state object per screen with a single change handler that clears dependent keys.
- **OKF deep links**: "View in Library" / "View resources" always navigates to Learning Resources and auto-expands the target chapter (route + query param, e.g. `/resources?expandChapter=ch04`, or Zustand state read by that screen on mount). "Assign practice" / "Import from OKF" navigates to Assessment Builder's Build tab and opens the Import modal (optionally pre-scoped to a chapter — nice-to-have, not required for parity).
- **Import from OKF modal**: click a chapter row to expand/collapse its topics (chevron rotates ▸/▾); click a question row to toggle its checkbox; footer shows a live "N question(s) selected" count and disables/enables the "Add to Assessment" button; closing the modal (backdrop click or explicit close) discards the in-progress selection.
- **Flash/success banners**: several actions (uploading a resource, saving a homework score, saving an assessment) show a short-lived inline confirmation in the prototype — reimplement as Sonner toasts instead.
- **Weak-chapter flag**: Gradebook's OKF panel flags any chapter with avgScore < 65% with an amber "⚠ Needs review" badge; bar color also shifts (amber if weak, green if ≥80%, neutral teal otherwise) — encode as a shared helper, not per-row inline logic.
- **At-risk students**: Class Analytics' AI insights card and Dashboard's "At-Risk Students" stat should read from the same underlying student status field (`status: "at-risk" | "on-track"`), not independently duplicated logic.
- **Modals** (New Assignment, Add Exam, Add Curriculum Unit, Import from OKF, Assign-from-Bank): centered, backdrop-blurred overlay, closable via backdrop click or explicit ✕; form modals validate before submit (wire to Zod schemas).

## State Management
Model with Zustand (client/UI state) + TanStack Query (server state):
- **Global context**: `{ academicYear, sectionId }` — persisted (localStorage in the prototype), drives Syllabus Map, Course Progress, and Settings; changing it should be possible from more than one screen and stay in sync everywhere.
- **Per-screen filter state**: one object per filterable screen (`gradebookFilters: {grade, section}`, `okfAlignmentFilters: {classId, subject, topicId}`, `curriculumFilters: {year, classId, search}`, etc.)
- **Modal state**: one boolean/open-payload per modal, plus its own transient form-draft state (cleared on close).
- **Expand/collapse state**: keyed maps of `id -> boolean` for expandable rows (OKF chapters in Learning Resources, Import-from-OKF chapters/topics, Syllabus units).
- **Server data** (fetch via TanStack Query, mutate with optimistic updates + Sonner toast on settle): Classes, Students, Assignments (+ submissions), Exams, Curriculum/Syllabus units, Behavior notes, Resources (uploads), Assessment bank, Gradebook scores, OKF chapter performance roll-ups.

## Data Models (TypeScript shapes to define)
```
Class { id, name, subject, room, students, schedule, sectionId }
Section { id, label, grade, section }
Student { id, name, rollNo, classId, attendance, avgGrade, status: "on-track" | "at-risk" }
Assignment { id, title, classId, subject, term, academicYear, due, totalPoints, status, sourceAssessmentId, submissions: Submission[] }
Submission { studentId, status: "not_started"|"submitted"|"late"|"missing", submittedOn, score, feedback }
Exam { id, title, classId, date, type, weight, duration, coverageUnitIds, revisionAllocated, revisionUsed }
CurriculumUnit { id, subject, classId, academicYear, term, unit, plannedStart, plannedEnd, periods, textbookRef, weightage, planned, actual, okfChapterId }
Resource { id, title, type, classId, uploaded }
BehaviorNote { student, classId, type: "positive"|"incident", note, date }
OkfChapter { id, number, title, okf_ref, topics: OkfTopic[] }
OkfTopic { id, title, resources: OkfResource[] } // library
OkfTopic { id, title, questions: OkfQuestion[] } // question bank (parallel taxonomy)
OkfResource { id, type: "Video"|"PDF"|"Worksheet"|"PPT", title, meta, okf_ref }
OkfQuestion { id, type, text, options?, correctIndex?, marks, okf_ref }
OkfChapterPerformance { chapterId, avgScore, questionsGraded } // rolled up from graded OKF-linked questions
```

## Assets
- No externally-sourced images/icons — all icons in the prototype are emoji placeholders; replace every one with a same-weight Lucide icon in the rebuild.
- Fonts loaded from Google Fonts: **Nunito** (400/500/600/700/800) and **Poppins** (500/600/700/800).

## Files
- `design-reference/Teacher Productivity Platform.dc.html` — the full design reference (single file, all 20 screens + chat widget + seed data). Open it in a browser to click through every screen exactly as designed; view source for exact spacing/color/copy on any element.
- `screenshots/` — one PNG per screen (teacher role), numbered in the same order as the Screens section above: `01-dashboard`, `02-calendar`, `03-my-classes`, `04-my-subjects`, `05-lesson-planner`, `06-syllabus-map`, `07-course-progress`, `08-assignments`, `09-homework-tracker`, `10-assessment-exams`, `11-assessment-builder`, `12-attendance`, `13-learning-resources`, `14-student-behavior`, `15-gradebook`, `16-student-progress`, `17-class-analytics`, `18-announcements`, `19-upcoming-tasks`, `20-parent-communication`, `21-reports`. **Settings is not included** — it's gated behind an admin role that has no UI toggle in the current prototype; use the live reference file's Settings section markup directly (view-source), or wire up the role switch when rebuilding.
