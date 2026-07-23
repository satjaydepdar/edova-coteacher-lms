# Graph Report - edova-web  (2026-07-14)

## Corpus Check
- 61 files · ~46,163 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 530 nodes · 555 edges · 53 communities (37 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- types.ts
- seed.ts
- dependencies
- Settings.tsx
- CLASSES
- AssessmentBuilder.tsx
- compilerOptions
- package.json
- components.json
- styles.ts
- compilerOptions
- ChatWidget.tsx
- LessonPlanner.tsx
- AssignmentTracker
- LearningResources.tsx
- dialog.tsx
- school-store.ts
- .oxlintrc.json
- AppLayout.tsx
- dropdown-menu.tsx
- nav.ts
- PageHeader.tsx
- select.tsx
- ClassAnalytics.tsx
- app-store.ts
- React + TypeScript + Vite
- avatar.tsx
- badge.tsx
- button.tsx
- tabs.tsx
- main.tsx
- scroll-area.tsx
- UpcomingTasks.tsx
- vite-env.d.ts
- tsconfig.json
- checkbox.tsx
- input.tsx
- label.tsx
- progress.tsx
- separator.tsx
- switch.tsx
- textarea.tsx
- tooltip.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `compilerOptions` - 15 edges
3. `CLASSES` - 14 edges
4. `Settings()` - 14 edges
5. `AssessmentBuilder()` - 9 edges
6. `LessonPlanner()` - 8 edges
7. `AssignmentTracker()` - 7 edges
8. `tailwind` - 6 edges
9. `aliases` - 6 edges
10. `SyllabusMap()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `dayLabelForDate()` --references--> `APP_TODAY`  [EXTRACTED]
  src/lib/dates.ts → src/data/seed.ts
- `Settings()` --references--> `APP_TODAY`  [EXTRACTED]
  src/pages/Settings.tsx → src/data/seed.ts
- `unitStatus()` --references--> `APP_TODAY`  [EXTRACTED]
  src/pages/SyllabusMap.tsx → src/data/seed.ts
- `AssessmentBuilder()` --references--> `CLASSES`  [EXTRACTED]
  src/pages/AssessmentBuilder.tsx → src/data/seed.ts
- `classNameById()` --references--> `CLASSES`  [EXTRACTED]
  src/pages/AssessmentBuilder.tsx → src/data/seed.ts

## Import Cycles
- None detected.

## Communities (53 total, 16 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.03
Nodes (64): AcademicCalendarItem, Announcement, AssessmentBankItem, AssessmentSection, Assignment, AssignmentStatus, BankQuestionV2, BehaviorNote (+56 more)

### Community 1 - "seed.ts"
Cohesion: 0.04
Nodes (48): ACADEMIC_CALENDAR_SEED, ACADEMIC_YEARS, ANNOUNCEMENTS, ASSESSMENT_BANK_SEED, ASSIGNMENTS_SEED, BEHAVIOR_NOTES, buildMasterTimetableSeed(), CALENDAR_EVENTS (+40 more)

### Community 2 - "dependencies"
Cohesion: 0.05
Nodes (36): dependencies, class-variance-authority, clsx, @fullcalendar/daygrid, @fullcalendar/interaction, @fullcalendar/react, @fullcalendar/timegrid, @hookform/resolvers (+28 more)

### Community 3 - "Settings.tsx"
Cohesion: 0.08
Nodes (31): MT_SECTIONS, bodyCell, cellShell(), CLASSID_TO_SECTION_SUBJECT, classNameById(), ctxBadge(), CurriculumUnitX, examReadinessStyle() (+23 more)

### Community 4 - "CLASSES"
Cohesion: 0.10
Nodes (19): CLASSES, Calendar(), classNameById(), mergedEvents(), classNameById(), mergedCalendarEvents(), TeacherDashboard(), classNameById() (+11 more)

### Community 5 - "AssessmentBuilder.tsx"
Cohesion: 0.09
Nodes (27): DEMAND_PRESETS, TOPIC_OPTIONS, AssessmentBuilder(), buildSectionQuestions(), classNameById(), closeBtn, editorInput, editorSectionLabel (+19 more)

### Community 6 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+13 more)

### Community 7 - "package.json"
Cohesion: 0.10
Nodes (19): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+11 more)

### Community 8 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 9 - "styles.ts"
Cohesion: 0.12
Nodes (3): DueUrgency, EVENT_COLORS, SUBMISSION_LABEL

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "ChatWidget.tsx"
Cohesion: 0.16
Nodes (11): ChatMsg, ChatWidget(), Chip, DiffLevel, EmailCard(), greetingMsg(), MsgKind, nextId() (+3 more)

### Community 12 - "LessonPlanner.tsx"
Cohesion: 0.18
Nodes (15): actionBtnStyle, differentiateTierStyle(), inputStyle, LessonPlanner(), lessonStatusStyle(), MONTH_MAP, parseShortDate(), PLAN_SECTIONS (+7 more)

### Community 13 - "AssignmentTracker"
Cohesion: 0.21
Nodes (10): APP_TODAY, STUDENTS, dayLabelForDate(), MONTH_MAP, AssignmentTracker(), dueDiffDays(), rosterHeaderCell, submittedCount() (+2 more)

### Community 14 - "LearningResources.tsx"
Cohesion: 0.19
Nodes (6): categoryForType(), CategoryStatus, LearningResources(), STATUS_CATEGORIES, StatusCategory, UploadTarget

### Community 16 - "dialog.tsx"
Cohesion: 0.29
Nodes (4): DialogContent, DialogDescription, DialogOverlay, DialogTitle

### Community 17 - "school-store.ts"
Cohesion: 0.29
Nodes (5): FlashKey, flashTokens, INITIAL_TAXONOMY, SchoolState, useSchoolStore

### Community 18 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 20 - "dropdown-menu.tsx"
Cohesion: 0.33
Nodes (5): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator

### Community 21 - "nav.ts"
Cohesion: 0.33
Nodes (5): NAV_GROUPS, PATH_BY_VIEW, VIEW_LABELS, NavGroup, ViewKey

### Community 23 - "select.tsx"
Cohesion: 0.40
Nodes (4): SelectContent, SelectItem, SelectLabel, SelectTrigger

### Community 25 - "app-store.ts"
Cohesion: 0.40
Nodes (4): ADMIN_IDENTITY, AppState, TEACHER_IDENTITY, useAppStore

### Community 26 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 27 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 28 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 29 - "button.tsx"
Cohesion: 0.50
Nodes (3): Button, ButtonProps, buttonVariants

### Community 30 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **327 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `$schema` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLASSES` connect `CLASSES` to `seed.ts`, `Settings.tsx`, `AssessmentBuilder.tsx`, `LessonPlanner.tsx`, `AssignmentTracker`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Settings()` connect `Settings.tsx` to `seed.ts`, `CLASSES`, `AssignmentTracker`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `AssessmentBuilder()` connect `AssessmentBuilder.tsx` to `CLASSES`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04251700680272109 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._