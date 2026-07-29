// Seed / demo data — ported verbatim from the mockup (_decomp/app.js lines 2–828).
import type {
  AcademicCalendarItem,
  Announcement,
  Assignment,
  AssessmentBankItem,
  BankQuestionV2,
  BehaviorNote,
  CalendarEvent,
  ChatEmail,
  ChatExitTicket,
  ChatPolicyAnswer,
  ChatRootChip,
  ChatTopic,
  CurriculumUnit,
  DemandPreset,
  Exam,
  Klass,
  LessonPlan,
  MasterTimetableRow,
  OkfChapterPerformance,
  OkfCurriculumLibrary,
  OkfLibrary,
  OkfLibraryChapter,
  OkfQuestionChapter,
  PaletteType,
  ParentMessage,
  Report,
  Resource,
  SavedLessonPlan,
  Section,
  StandardOption,
  Student,
  Task,
  TeacherAdmin,
  TimetableEntry,
  TopicOption,
} from "@/lib/types"

export const TEACHER_NAME = "Meenakshi Parameswaran"
export const APP_TODAY = new Date(2026, 6, 9) // Jul 9, 2026

// Calendar scoping: events carry teacherId; "all" = school-wide (holidays,
// staff meetings) shown on every teacher's calendar. Real per-teacher
// periods/timeslots land with the Settings page (scoped separately).
export interface TeacherInfo { id: string; name: string; initials: string; subject: string }
export const SCHOOL_WIDE_TEACHER_ID = "all"
export const TEACHERS: TeacherInfo[] = [
  { id: "t_me", name: "Meenakshi Parameswaran", initials: "SM", subject: "Mathematics" },
  { id: "t_ri", name: "R. Iyer", initials: "RI", subject: "Science" },
  { id: "t_kn", name: "K. Nair", initials: "KN", subject: "Mathematics" },
]

// Annual-plan placeholder for the day-insight variance badge: planned topic
// coverage % "as of now", keyed by class name. Real annual_plan rows come
// with the backend (db/) — see instructions/dedicated-backend-plan.md.
export const PLANNED_COVERAGE_BY_CLASS: Record<string, number> = {
  "Class 8 — Section A": 72,
  "Class 7 — Section A": 48,
  "Class 9 — Section C": 40,
}

export const CLASSES: Klass[] = [
  { id: "c1", name: "Class 8 — Section A", subject: "Mathematics", room: "Room 204", students: 32, schedule: "Mon–Fri, 9:00–9:45", sectionId: "sec_8a" },
  { id: "c2", name: "Class 8 — Section B", subject: "Mathematics", room: "Room 204", students: 30, schedule: "Mon–Fri, 10:00–10:45", sectionId: "sec_8b" },
  { id: "c3", name: "Class 7 — Section A", subject: "Mathematics", room: "Room 108", students: 28, schedule: "Mon, Wed, Fri, 11:15–12:00", sectionId: "sec_7a" },
  { id: "c4", name: "Class 9 — Section C", subject: "Algebra II", room: "Room 204", students: 26, schedule: "Tue, Thu, 1:00–1:45", sectionId: "sec_9c" },
  { id: "c5", name: "Class 8 — Section A", subject: "Homeroom", room: "Room 204", students: 32, schedule: "Mon–Fri, 8:15–8:30", sectionId: "sec_8a" },
  // Current focus: Class 10 Mathematics — the one class whose syllabus lives
  // in the clerk DB (CBSE 041). "This Week" plans against this section.
  { id: "c10", name: "Class 10 — Section A", subject: "Mathematics", room: "Room 301", students: 30, schedule: "Mon–Fri, 9:00–9:45", sectionId: "sec_10a" },
]

export const STUDENTS: Student[] = [
  { id: "s1", name: "Emma Johnson", rollNo: "8A-01", classId: "c1", attendance: 97, avgGrade: "A", status: "on-track" },
  { id: "s2", name: "Liam Carter", rollNo: "8A-02", classId: "c1", attendance: 88, avgGrade: "B+", status: "on-track" },
  { id: "s3", name: "Olivia Brown", rollNo: "8A-03", classId: "c1", attendance: 76, avgGrade: "C", status: "at-risk" },
  { id: "s4", name: "Noah Williams", rollNo: "8A-04", classId: "c1", attendance: 94, avgGrade: "A-", status: "on-track" },
  { id: "s5", name: "Ava Martinez", rollNo: "8A-05", classId: "c1", attendance: 91, avgGrade: "B", status: "on-track" },
  { id: "s6", name: "Ethan Davis", rollNo: "8A-06", classId: "c1", attendance: 68, avgGrade: "D+", status: "at-risk" },
  { id: "s7", name: "Sophia Lee", rollNo: "8A-07", classId: "c1", attendance: 99, avgGrade: "A+", status: "on-track" },
  { id: "s8", name: "Mason Clark", rollNo: "8A-08", classId: "c1", attendance: 82, avgGrade: "B-", status: "on-track" },
  { id: "s9", name: "Isabella Wright", rollNo: "7A-01", classId: "c3", attendance: 95, avgGrade: "A", status: "on-track" },
  { id: "s10", name: "Jacob Turner", rollNo: "7A-02", classId: "c3", attendance: 73, avgGrade: "C-", status: "at-risk" },
  { id: "s11", name: "Mia Anderson", rollNo: "9C-01", classId: "c4", attendance: 90, avgGrade: "B+", status: "on-track" },
  { id: "s12", name: "Lucas Thompson", rollNo: "9C-02", classId: "c4", attendance: 85, avgGrade: "B", status: "on-track" },
]

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: "Jul 9", day: "Today", title: "Parent Meeting — Olivia Brown", type: "meeting", time: "2:30 PM", teacherId: "t_me" },
  { date: "Jul 10", day: "Tomorrow", title: "Class 9C — Chapter 5 Review", type: "class", time: "1:00 PM", teacherId: "t_ri" },
  { date: "Jul 11", day: "Fri", title: "Homework Due — Linear Equations", type: "deadline", time: "11:59 PM", teacherId: "t_me" },
  { date: "Jul 14", day: "Mon", title: "Staff Meeting", type: "meeting", time: "8:00 AM", teacherId: "all" },
  { date: "Jul 20", day: "Sun", title: "School Holiday — Founders Day", type: "holiday", time: "All day", teacherId: "all" },
]

export const ASSIGNMENTS_SEED: Assignment[] = [
  { id: "a1", title: "Linear Equations Worksheet", classId: "c1", subject: "Mathematics", term: "Term 2", academicYear: "2026–27", due: "Jul 11", totalPoints: 20, status: "active", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Jul 4",
    submissions: [
      { studentId: "s1", status: "submitted", submittedOn: "Jul 8", score: null, feedback: "" },
      { studentId: "s2", status: "submitted", submittedOn: "Jul 9", score: null, feedback: "" },
      { studentId: "s3", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s4", status: "submitted", submittedOn: "Jul 7", score: null, feedback: "" },
      { studentId: "s5", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s6", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s7", status: "submitted", submittedOn: "Jul 8", score: null, feedback: "" },
      { studentId: "s8", status: "not_started", submittedOn: "", score: null, feedback: "" },
    ] },
  { id: "a2", title: "Quadratic Functions Practice", classId: "c1", subject: "Mathematics", term: "Term 2", academicYear: "2026–27", due: "Jul 12", totalPoints: 15, status: "active", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Jul 5",
    submissions: [
      { studentId: "s1", status: "submitted", submittedOn: "Jul 8", score: null, feedback: "" },
      { studentId: "s2", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s3", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s4", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s5", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s6", status: "not_started", submittedOn: "", score: null, feedback: "" },
      { studentId: "s7", status: "submitted", submittedOn: "Jul 9", score: null, feedback: "" },
      { studentId: "s8", status: "not_started", submittedOn: "", score: null, feedback: "" },
    ] },
  { id: "a3", title: "Geometry Basics Quiz Prep", classId: "c3", subject: "Mathematics", term: "Term 2", academicYear: "2026–27", due: "Jul 9", totalPoints: 25, status: "closed", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Jun 30",
    submissions: [
      { studentId: "s9", status: "submitted", submittedOn: "Jul 8", score: null, feedback: "" },
      { studentId: "s10", status: "missing", submittedOn: "", score: null, feedback: "" },
    ] },
  { id: "a4", title: "Polynomial Identities", classId: "c4", subject: "Algebra II", term: "Term 2", academicYear: "2026–27", due: "Jul 15", totalPoints: 20, status: "active", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Jul 6",
    submissions: [
      { studentId: "s11", status: "submitted", submittedOn: "Jul 8", score: null, feedback: "" },
      { studentId: "s12", status: "not_started", submittedOn: "", score: null, feedback: "" },
    ] },
  { id: "a5", title: "Word Problems Set 3", classId: "c1", subject: "Mathematics", term: "Term 2", academicYear: "2026–27", due: "Jul 8", totalPoints: 20, status: "graded", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Jun 28",
    submissions: [
      { studentId: "s1", status: "submitted", submittedOn: "Jul 7", score: 19, feedback: "Excellent work." },
      { studentId: "s2", status: "submitted", submittedOn: "Jul 8", score: 16, feedback: "Watch sign errors." },
      { studentId: "s3", status: "submitted", submittedOn: "Jul 8", score: 14, feedback: "Review word-problem setup." },
      { studentId: "s4", status: "submitted", submittedOn: "Jul 7", score: 18, feedback: "" },
      { studentId: "s5", status: "submitted", submittedOn: "Jul 8", score: 17, feedback: "" },
      { studentId: "s6", status: "submitted", submittedOn: "Jul 8", score: 12, feedback: "Let's go over this together." },
      { studentId: "s7", status: "submitted", submittedOn: "Jul 7", score: 20, feedback: "Perfect score!" },
      { studentId: "s8", status: "submitted", submittedOn: "Jul 8", score: 15, feedback: "" },
    ] },
]

export const ASSESSMENT_BANK_SEED: AssessmentBankItem[] = []

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "n1", title: "Mid-term exam schedule released", body: "Mid-term exams begin Jul 17. Please review the updated timetable and syllabus coverage with your sections.", date: "Jul 8", audience: "Students & Parents" },
  { id: "n2", title: "Parent-teacher meeting slots open", body: "Booking is now open for the Jul 9 parent-teacher meeting window. Slots fill on a first-come basis.", date: "Jul 6", audience: "Parents" },
  { id: "n3", title: "Founders Day holiday reminder", body: "School will remain closed on Jul 20 for Founders Day. Regular classes resume Jul 21.", date: "Jul 5", audience: "All" },
]

export const TASKS: Task[] = [
  { id: "t1", title: "Grade Linear Equations Worksheet (8A)", due: "Jul 10", priority: "high", done: false },
  { id: "t2", title: "Prepare Mid-term question bank — Algebra II", due: "Jul 12", priority: "high", done: false },
  { id: "t3", title: "Upload Chapter 5 slides for 9C", due: "Jul 11", priority: "medium", done: false },
  { id: "t4", title: "Respond to 3 parent messages", due: "Jul 9", priority: "medium", done: false },
  { id: "t5", title: "Submit attendance summary to admin", due: "Jul 9", priority: "low", done: true },
]

export const BEHAVIOR_NOTES: BehaviorNote[] = [
  { student: "Sophia Lee", classId: "c1", type: "positive", note: "Helped a classmate understand factoring during group work.", date: "Jul 8" },
  { student: "Ethan Davis", classId: "c1", type: "incident", note: "Disruptive during quiz; asked to step out briefly.", date: "Jul 7" },
  { student: "Jacob Turner", classId: "c3", type: "incident", note: "Missed second homework deadline this month.", date: "Jul 6" },
  { student: "Isabella Wright", classId: "c3", type: "positive", note: "Volunteered to present geometry proof to the class.", date: "Jul 5" },
]

export const RESOURCE_TYPE_ICON: Record<string, string> = { Video: "🎬", PDF: "📄", Worksheet: "📝", PPT: "📊", Slides: "📊" }
export const RESOURCES: Resource[] = [
  { id: "res_up1", title: "Linear Equations — Slide Deck", type: "Slides", classId: "c1", uploaded: "Jul 2" },
  { id: "res_up2", title: "Quadratic Functions — Worked Examples", type: "PDF", classId: "c2", uploaded: "Jun 29" },
  { id: "res_up3", title: "Geometry Basics — Explainer Video", type: "Video", classId: "c3", uploaded: "Jun 27" },
  { id: "res_up4", title: "Polynomial Identities — Practice Set", type: "PDF", classId: "c4", uploaded: "Jun 24" },
]

export const OKF_LIBRARY: OkfLibrary = {
  subject: "Mathematics", board: "CBSE", grade: "Class 10", okf_version: "1.2.0",
  chapters: [
    { id: "ch01", number: 1, title: "Real Numbers", okf_ref: "OKF/CBSE/X/MATH/CH01", topics: [
      { id: "ch01-t01", title: "Euclid's Division Lemma", resources: [
        { id: "r_ch01t01_v", type: "Video", title: "Euclid's Division Lemma — Explained", meta: "12 min", okf_ref: "OKF/CBSE/X/MATH/CH01/T01/R01" },
        { id: "r_ch01t01_w", type: "Worksheet", title: "Practice: Finding HCF with Euclid's Lemma", meta: "5 questions", okf_ref: "OKF/CBSE/X/MATH/CH01/T01/R02" },
      ] },
      { id: "ch01-t02", title: "Fundamental Theorem of Arithmetic", resources: [
        { id: "r_ch01t02_v", type: "Video", title: "Fundamental Theorem of Arithmetic — Explained", meta: "15 min", okf_ref: "OKF/CBSE/X/MATH/CH01/T02/R01" },
        { id: "r_ch01t02_p", type: "PDF", title: "Worked Examples: LCM & HCF via Prime Factorization", meta: "4 pages", okf_ref: "OKF/CBSE/X/MATH/CH01/T02/R02" },
      ] },
    ] },
    { id: "ch02", number: 2, title: "Polynomials", okf_ref: "OKF/CBSE/X/MATH/CH02", topics: [
      { id: "ch02-t01", title: "Geometrical Meaning of Zeros", resources: [
        { id: "r_ch02t01_v", type: "Video", title: "Zeros of a Polynomial — Graphical Meaning", meta: "10 min", okf_ref: "OKF/CBSE/X/MATH/CH02/T01/R01" },
        { id: "r_ch02t01_s", type: "PPT", title: "Geometrical Meaning of Zeros — Slide Deck", meta: "18 slides", okf_ref: "OKF/CBSE/X/MATH/CH02/T01/R02" },
      ] },
      { id: "ch02-t02", title: "Relationship Between Zeros & Coefficients", resources: [
        { id: "r_ch02t02_v", type: "Video", title: "Sum & Product of Zeros — Derivation", meta: "14 min", okf_ref: "OKF/CBSE/X/MATH/CH02/T02/R01" },
        { id: "r_ch02t02_w", type: "Worksheet", title: "Practice: Forming Polynomials from Zeros", meta: "6 questions", okf_ref: "OKF/CBSE/X/MATH/CH02/T02/R02" },
      ] },
    ] },
    { id: "ch03", number: 3, title: "Pair of Linear Equations", okf_ref: "OKF/CBSE/X/MATH/CH03", topics: [
      { id: "ch03-t01", title: "Graphical Method of Solution", resources: [
        { id: "r_ch03t01_v", type: "Video", title: "Solving Linear Equations Graphically", meta: "13 min", okf_ref: "OKF/CBSE/X/MATH/CH03/T01/R01" },
        { id: "r_ch03t01_p", type: "PDF", title: "Consistent, Inconsistent & Dependent Systems", meta: "3 pages", okf_ref: "OKF/CBSE/X/MATH/CH03/T01/R02" },
      ] },
      { id: "ch03-t02", title: "Algebraic Methods (Substitution & Elimination)", resources: [
        { id: "r_ch03t02_v", type: "Video", title: "Substitution & Elimination Methods — Explained", meta: "16 min", okf_ref: "OKF/CBSE/X/MATH/CH03/T02/R01" },
        { id: "r_ch03t02_w", type: "Worksheet", title: "Practice Set: Solving by Elimination", meta: "8 questions", okf_ref: "OKF/CBSE/X/MATH/CH03/T02/R02" },
      ] },
    ] },
    { id: "ch04", number: 4, title: "Quadratic Equations", okf_ref: "OKF/CBSE/X/MATH/CH04", topics: [
      { id: "ch04-t01", title: "Solution by Factorisation", resources: [
        { id: "r_ch04t01_v", type: "Video", title: "Solving Quadratics by Factorisation", meta: "11 min", okf_ref: "OKF/CBSE/X/MATH/CH04/T01/R01" },
        { id: "r_ch04t01_w", type: "Worksheet", title: "Practice: Factorisation Method", meta: "6 questions", okf_ref: "OKF/CBSE/X/MATH/CH04/T01/R02" },
      ] },
      { id: "ch04-t02", title: "Quadratic Formula & Nature of Roots", resources: [
        { id: "r_ch04t02_v", type: "Video", title: "Quadratic Formula — Derivation & Use", meta: "18 min", okf_ref: "OKF/CBSE/X/MATH/CH04/T02/R01" },
        { id: "r_ch04t02_s", type: "PPT", title: "Discriminant & Nature of Roots — Slide Deck", meta: "14 slides", okf_ref: "OKF/CBSE/X/MATH/CH04/T02/R02" },
      ] },
    ] },
    { id: "ch05", number: 5, title: "Arithmetic Progressions", okf_ref: "OKF/CBSE/X/MATH/CH05", topics: [
      { id: "ch05-t01", title: "nth Term of an AP", resources: [
        { id: "r_ch05t01_v", type: "Video", title: "Finding the nth Term of an AP", meta: "10 min", okf_ref: "OKF/CBSE/X/MATH/CH05/T01/R01" },
        { id: "r_ch05t01_w", type: "Worksheet", title: "Practice: General Term of an AP", meta: "7 questions", okf_ref: "OKF/CBSE/X/MATH/CH05/T01/R02" },
      ] },
      { id: "ch05-t02", title: "Sum of First n Terms", resources: [
        { id: "r_ch05t02_v", type: "Video", title: "Sum of n Terms — Formula & Applications", meta: "17 min", okf_ref: "OKF/CBSE/X/MATH/CH05/T02/R01" },
        { id: "r_ch05t02_p", type: "PDF", title: "Worked Examples: Sn Formula", meta: "5 pages", okf_ref: "OKF/CBSE/X/MATH/CH05/T02/R02" },
      ] },
    ] },
  ],
}

// Real CBSE Class 10 Science syllabus (2026–27), sourced from
// CBSE_Class10_Science_Subtopics.xlsx (cbseacademic.nic.in Annual Syllabus).
// 15 chapters across 5 units — the last two (Periodic Classification,
// Evolution) are "formative assessment only" per the source doc and are
// numbered 14/15 here since the source sheet leaves them unnumbered.
const SCIENCE10_CHAPTERS: OkfLibraryChapter[] = [
  { id: "sci10-ch01", number: 1, title: "Chemical Reactions and Equations", okf_ref: "OKF/CBSE/X/SCI/CH01", unit: "Unit I: Chemical Substances – Nature and Behaviour", topics: [
    { id: "sci10-ch01-t01", title: "Chemical reactions", resources: [] },
    { id: "sci10-ch01-t02", title: "Chemical equation", resources: [] },
    { id: "sci10-ch01-t03", title: "Balanced chemical equation", resources: [] },
    { id: "sci10-ch01-t04", title: "Combination reaction", resources: [] },
    { id: "sci10-ch01-t05", title: "Decomposition reaction", resources: [] },
    { id: "sci10-ch01-t06", title: "Displacement reaction", resources: [] },
    { id: "sci10-ch01-t07", title: "Double displacement reaction", resources: [] },
    { id: "sci10-ch01-t08", title: "Precipitation reaction", resources: [] },
    { id: "sci10-ch01-t09", title: "Endothermic and exothermic reactions", resources: [] },
    { id: "sci10-ch01-t10", title: "Oxidation and reduction", resources: [] },
  ] },
  { id: "sci10-ch02", number: 2, title: "Acids, Bases and Salts", okf_ref: "OKF/CBSE/X/SCI/CH02", unit: "Unit I: Chemical Substances – Nature and Behaviour", topics: [
    { id: "sci10-ch02-t01", title: "Definitions of acids and bases in terms of furnishing of H+ and OH– ions", resources: [] },
    { id: "sci10-ch02-t02", title: "Identification of acids/bases using indicators", resources: [] },
    { id: "sci10-ch02-t03", title: "Chemical properties, examples and uses of acids and bases", resources: [] },
    { id: "sci10-ch02-t04", title: "Neutralization reaction", resources: [] },
    { id: "sci10-ch02-t05", title: "Concept of pH scale (definition relating to logarithm not required)", resources: [] },
    { id: "sci10-ch02-t06", title: "Importance of pH in everyday life", resources: [] },
    { id: "sci10-ch02-t07", title: "Preparation and uses of Sodium Hydroxide", resources: [] },
    { id: "sci10-ch02-t08", title: "Preparation and uses of Bleaching powder", resources: [] },
    { id: "sci10-ch02-t09", title: "Preparation and uses of Baking soda", resources: [] },
    { id: "sci10-ch02-t10", title: "Preparation and uses of Washing soda", resources: [] },
    { id: "sci10-ch02-t11", title: "Preparation and uses of Plaster of Paris", resources: [] },
  ] },
  { id: "sci10-ch03", number: 3, title: "Metals and Non-Metals", okf_ref: "OKF/CBSE/X/SCI/CH03", unit: "Unit I: Chemical Substances – Nature and Behaviour", topics: [
    { id: "sci10-ch03-t01", title: "Properties of metals", resources: [] },
    { id: "sci10-ch03-t02", title: "Properties of non-metals", resources: [] },
    { id: "sci10-ch03-t03", title: "Reactivity series", resources: [] },
    { id: "sci10-ch03-t04", title: "Formation of ionic compounds", resources: [] },
    { id: "sci10-ch03-t05", title: "Properties of ionic compounds", resources: [] },
    { id: "sci10-ch03-t06", title: "Basic metallurgical processes", resources: [] },
    { id: "sci10-ch03-t07", title: "Corrosion and its prevention", resources: [] },
  ] },
  { id: "sci10-ch04", number: 4, title: "Carbon and its Compounds", okf_ref: "OKF/CBSE/X/SCI/CH04", unit: "Unit I: Chemical Substances – Nature and Behaviour", topics: [
    { id: "sci10-ch04-t01", title: "Covalent bonds – formation and properties of covalent compounds", resources: [] },
    { id: "sci10-ch04-t02", title: "Versatile nature of carbon", resources: [] },
    { id: "sci10-ch04-t03", title: "Hydrocarbons – saturated and unsaturated", resources: [] },
    { id: "sci10-ch04-t04", title: "Homologous series", resources: [] },
    { id: "sci10-ch04-t05", title: "Nomenclature of alkanes, alkenes and alkynes", resources: [] },
    { id: "sci10-ch04-t06", title: "Carbon compounds containing functional groups (halogens, alcohol, ketones, aldehydes)", resources: [] },
    { id: "sci10-ch04-t07", title: "Chemical properties: combustion", resources: [] },
    { id: "sci10-ch04-t08", title: "Chemical properties: oxidation", resources: [] },
    { id: "sci10-ch04-t09", title: "Chemical properties: addition reaction", resources: [] },
    { id: "sci10-ch04-t10", title: "Chemical properties: substitution reaction", resources: [] },
    { id: "sci10-ch04-t11", title: "Ethanol – properties and uses", resources: [] },
    { id: "sci10-ch04-t12", title: "Ethanoic acid – properties and uses", resources: [] },
    { id: "sci10-ch04-t13", title: "Soaps and detergents", resources: [] },
  ] },
  { id: "sci10-ch05", number: 5, title: "Life Processes", okf_ref: "OKF/CBSE/X/SCI/CH05", unit: "Unit II: The World of the Living", topics: [
    { id: "sci10-ch05-t01", title: "Concept of 'Living Being'", resources: [
      {
        id: "r_sci10ch05t01_v",
        type: "Video",
        title: "Digestive System — Explained",
        meta: "Video",
        okf_ref: "OKF/CBSE/X/SCI/CH05/T01/R01",
        previewS3Key: "Class-10/Semester-01/Biology/Chapter-01/digestive system.mp4",
        status: "ready",
      },
    ] },
    { id: "sci10-ch05-t02", title: "Basic concept of nutrition in plants and animals", resources: [] },
    { id: "sci10-ch05-t03", title: "Basic concept of respiration in plants and animals", resources: [] },
    { id: "sci10-ch05-t04", title: "Basic concept of transport in plants and animals", resources: [] },
    { id: "sci10-ch05-t05", title: "Basic concept of excretion in plants and animals", resources: [] },
  ] },
  { id: "sci10-ch06", number: 6, title: "Control and Coordination", okf_ref: "OKF/CBSE/X/SCI/CH06", unit: "Unit II: The World of the Living", topics: [
    { id: "sci10-ch06-t01", title: "Tropic movements in plants", resources: [] },
    { id: "sci10-ch06-t02", title: "Introduction to plant hormones", resources: [] },
    { id: "sci10-ch06-t03", title: "Control and coordination in animals: nervous system", resources: [] },
    { id: "sci10-ch06-t04", title: "Voluntary, involuntary and reflex action", resources: [] },
    { id: "sci10-ch06-t05", title: "Chemical coordination: animal hormones", resources: [] },
  ] },
  { id: "sci10-ch07", number: 7, title: "Reproduction", okf_ref: "OKF/CBSE/X/SCI/CH07", unit: "Unit II: The World of the Living", topics: [
    { id: "sci10-ch07-t01", title: "Reproduction in animals and plants – asexual", resources: [] },
    { id: "sci10-ch07-t02", title: "Reproduction in animals and plants – sexual", resources: [] },
    { id: "sci10-ch07-t03", title: "Reproductive health – need for family planning", resources: [] },
    { id: "sci10-ch07-t04", title: "Methods of family planning", resources: [] },
    { id: "sci10-ch07-t05", title: "Safe sex vs HIV/AIDS", resources: [] },
    { id: "sci10-ch07-t06", title: "Child bearing and women's health", resources: [] },
  ] },
  { id: "sci10-ch08", number: 8, title: "Heredity (formative assessment only)", okf_ref: "OKF/CBSE/X/SCI/CH08", unit: "Unit II: The World of the Living", topics: [
    { id: "sci10-ch08-t01", title: "Heredity", resources: [] },
    { id: "sci10-ch08-t02", title: "Mendel's contribution – laws for inheritance of traits", resources: [] },
    { id: "sci10-ch08-t03", title: "Sex determination: brief introduction", resources: [] },
  ] },
  { id: "sci10-ch09", number: 9, title: "Light – Reflection and Refraction", okf_ref: "OKF/CBSE/X/SCI/CH09", unit: "Unit III: Natural Phenomena", topics: [
    { id: "sci10-ch09-t01", title: "Reflection of light by curved surfaces", resources: [] },
    { id: "sci10-ch09-t02", title: "Images formed by spherical mirrors", resources: [] },
    { id: "sci10-ch09-t03", title: "Centre of curvature, principal axis, principal focus, focal length", resources: [] },
    { id: "sci10-ch09-t04", title: "Mirror formula (derivation not required)", resources: [] },
    { id: "sci10-ch09-t05", title: "Magnification by spherical mirrors", resources: [] },
    { id: "sci10-ch09-t06", title: "Applications of spherical mirrors", resources: [] },
    { id: "sci10-ch09-t07", title: "Refraction; laws of refraction", resources: [] },
    { id: "sci10-ch09-t08", title: "Refractive index", resources: [] },
    { id: "sci10-ch09-t09", title: "Refraction of light by spherical lens", resources: [] },
    { id: "sci10-ch09-t10", title: "Image formed by spherical lenses", resources: [] },
    { id: "sci10-ch09-t11", title: "Lens formula (derivation not required)", resources: [] },
    { id: "sci10-ch09-t12", title: "Magnification by spherical lenses", resources: [] },
    { id: "sci10-ch09-t13", title: "Power of a lens", resources: [] },
    { id: "sci10-ch09-t14", title: "Applications of spherical lenses", resources: [] },
  ] },
  { id: "sci10-ch10", number: 10, title: "The Human Eye and the Colourful World", okf_ref: "OKF/CBSE/X/SCI/CH10", unit: "Unit III: Natural Phenomena", topics: [
    { id: "sci10-ch10-t01", title: "Functioning of a lens in the human eye", resources: [] },
    { id: "sci10-ch10-t02", title: "Defects of vision and their corrections", resources: [] },
    { id: "sci10-ch10-t03", title: "Refraction of light through a prism", resources: [] },
    { id: "sci10-ch10-t04", title: "Dispersion of light", resources: [] },
    { id: "sci10-ch10-t05", title: "Scattering of light and applications in daily life (excluding colour of sun at sunrise/sunset)", resources: [] },
  ] },
  { id: "sci10-ch11", number: 11, title: "Electricity", okf_ref: "OKF/CBSE/X/SCI/CH11", unit: "Unit IV: Effects of Current", topics: [
    { id: "sci10-ch11-t01", title: "Electric current and potential difference", resources: [] },
    { id: "sci10-ch11-t02", title: "Ohm's law", resources: [] },
    { id: "sci10-ch11-t03", title: "Resistance and resistivity", resources: [] },
    { id: "sci10-ch11-t04", title: "Factors on which resistance of a conductor depends", resources: [] },
    { id: "sci10-ch11-t05", title: "Series combination of resistors", resources: [] },
    { id: "sci10-ch11-t06", title: "Parallel combination of resistors and its applications in daily life", resources: [] },
    { id: "sci10-ch11-t07", title: "Heating effect of electric current and its applications in daily life", resources: [] },
    { id: "sci10-ch11-t08", title: "Electric power", resources: [] },
    { id: "sci10-ch11-t09", title: "Interrelation between P, V, I and R", resources: [] },
  ] },
  { id: "sci10-ch12", number: 12, title: "Magnetic Effects of Electric Current", okf_ref: "OKF/CBSE/X/SCI/CH12", unit: "Unit IV: Effects of Current", topics: [
    { id: "sci10-ch12-t01", title: "Magnetic field and field lines", resources: [] },
    { id: "sci10-ch12-t02", title: "Field due to a current-carrying conductor", resources: [] },
    { id: "sci10-ch12-t03", title: "Field due to a current-carrying coil or solenoid", resources: [] },
    { id: "sci10-ch12-t04", title: "Force on a current-carrying conductor", resources: [] },
    { id: "sci10-ch12-t05", title: "Fleming's Left Hand Rule", resources: [] },
    { id: "sci10-ch12-t06", title: "Direct current and Alternating current", resources: [] },
    { id: "sci10-ch12-t07", title: "Frequency of AC", resources: [] },
    { id: "sci10-ch12-t08", title: "Advantage of AC over DC", resources: [] },
    { id: "sci10-ch12-t09", title: "Domestic electric circuits", resources: [] },
    { id: "sci10-ch12-t10", title: "Motor, Electromagnetic Induction, Electric Generator (formative assessment only)", resources: [] },
  ] },
  { id: "sci10-ch13", number: 13, title: "Our Environment", okf_ref: "OKF/CBSE/X/SCI/CH13", unit: "Unit V: Natural Resources", topics: [
    { id: "sci10-ch13-t01", title: "Eco-system", resources: [] },
    { id: "sci10-ch13-t02", title: "Environmental problems", resources: [] },
    { id: "sci10-ch13-t03", title: "Ozone depletion", resources: [] },
    { id: "sci10-ch13-t04", title: "Waste production and their solutions", resources: [] },
    { id: "sci10-ch13-t05", title: "Biodegradable and non-biodegradable substances", resources: [] },
  ] },
  { id: "sci10-ch14", number: 14, title: "Periodic Classification of Elements (formative assessment only)", okf_ref: "OKF/CBSE/X/SCI/CH14", unit: "Unit I: Chemical Substances – Nature and Behaviour", topics: [
    { id: "sci10-ch14-t01", title: "Döbereiner's Triads", resources: [] },
    { id: "sci10-ch14-t02", title: "Newlands' Law of Octaves", resources: [] },
    { id: "sci10-ch14-t03", title: "Mendeléev's Periodic Table", resources: [] },
    { id: "sci10-ch14-t04", title: "Modern Periodic Table", resources: [] },
    { id: "sci10-ch14-t05", title: "Modern, metallic and non-metallic properties", resources: [] },
  ] },
  { id: "sci10-ch15", number: 15, title: "Evolution (formative assessment only)", okf_ref: "OKF/CBSE/X/SCI/CH15", unit: "Unit II: The World of the Living", topics: [
    { id: "sci10-ch15-t01", title: "Acquired and inherited traits", resources: [] },
    { id: "sci10-ch15-t02", title: "Speciation", resources: [] },
    { id: "sci10-ch15-t03", title: "Evolution and classification", resources: [] },
    { id: "sci10-ch15-t04", title: "Tracing evolutionary relationships", resources: [] },
    { id: "sci10-ch15-t05", title: "Fossils", resources: [] },
    { id: "sci10-ch15-t06", title: "Evolution by stages", resources: [] },
    { id: "sci10-ch15-t07", title: "Human evolution", resources: [] },
  ] },
]

// Multi-subject curriculum library backing Settings > Resource Library for
// Class 10. Science has real CBSE content (above); Math/History &
// Geography/English are placeholders pending detailed subtopic data, each
// carrying only the official CBSE annual teaching-hours allocation.
export const OKF_CURRICULUM_LIBRARY: OkfCurriculumLibrary = {
  subjects: [
    {
      id: "science",
      name: "Science",
      classes: [{ classLevel: 10, annualHours: 270, chapters: SCIENCE10_CHAPTERS }],
    },
    {
      id: "math",
      name: "Mathematics",
      classes: [{
        classLevel: 10,
        annualHours: 250,
        chapters: [
          { id: "math10-ch01", number: 1, title: "Content coming soon", okf_ref: "", unit: "Mathematics", topics: [] },
        ],
      }],
    },
    {
      id: "history_geography",
      name: "History & Geography",
      classes: [{
        classLevel: 10,
        annualHours: 180,
        chapters: [
          { id: "hg10-ch01", number: 1, title: "Content coming soon", okf_ref: "", unit: "History & Geography", topics: [] },
        ],
      }],
    },
    {
      id: "english",
      name: "English",
      classes: [{
        classLevel: 10,
        annualHours: 260,
        chapters: [
          { id: "eng10-ch01", number: 1, title: "Content coming soon", okf_ref: "", unit: "English", topics: [] },
        ],
      }],
    },
  ],
}

export const OKF_QUESTION_BANK: { chapters: OkfQuestionChapter[] } = {
  chapters: [
    { id: "ch01", number: 1, title: "Real Numbers", topics: [
      { id: "ch01-t01", title: "Euclid's Division Lemma", questions: [
        { id: "okfq_ch01t01_1", type: "Short Answer", text: "Using Euclid's Division Lemma, find the HCF of 135 and 225.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH01/T01/Q01" },
        { id: "okfq_ch01t01_2", type: "Proof", text: "Prove that √2 is an irrational number.", marks: 4, okf_ref: "OKF/CBSE/X/MATH/CH01/T01/Q02" },
        { id: "okfq_ch01t01_3", type: "MCQ", text: "The HCF of 26 and 91 is:", options: ["13", "26", "7", "91"], correctIndex: 0, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH01/T01/Q04" },
      ] },
      { id: "ch01-t02", title: "Fundamental Theorem of Arithmetic", questions: [
        { id: "okfq_ch01t02_1", type: "Short Answer", text: "Find the LCM and HCF of 26 and 91 and verify that LCM × HCF = product of the two numbers.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH01/T02/Q01" },
        { id: "okfq_ch01t02_2", type: "MCQ", text: "If HCF(a, b) = 12 and a × b = 1800, then LCM(a, b) is:", options: ["150", "3600", "900", "144"], correctIndex: 2, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH01/T02/Q03" },
      ] },
    ] },
    { id: "ch02", number: 2, title: "Polynomials", topics: [
      { id: "ch02-t01", title: "Geometrical Meaning of Zeros", questions: [
        { id: "okfq_ch02t01_1", type: "Short Answer", text: "Draw the graph of a quadratic polynomial with two distinct zeros and label them.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH02/T01/Q01" },
        { id: "okfq_ch02t01_2", type: "MCQ", text: "A quadratic polynomial whose graph touches the x-axis at exactly one point has:", options: ["Two distinct real zeros", "No real zeros", "One repeated real zero", "Cannot be determined"], correctIndex: 2, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH02/T01/Q02" },
      ] },
      { id: "ch02-t02", title: "Relationship Between Zeros & Coefficients", questions: [
        { id: "okfq_ch02t02_1", type: "Short Answer", text: "Find a quadratic polynomial whose zeros are 3 and −2.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH02/T02/Q01" },
        { id: "okfq_ch02t02_2", type: "Long Answer", text: "If α and β are zeros of x² − 5x + 6, find the value of α² + β².", marks: 4, okf_ref: "OKF/CBSE/X/MATH/CH02/T02/Q02" },
      ] },
    ] },
    { id: "ch03", number: 3, title: "Pair of Linear Equations", topics: [
      { id: "ch03-t01", title: "Graphical Method of Solution", questions: [
        { id: "okfq_ch03t01_1", type: "Short Answer", text: "Determine graphically whether the pair of equations x + y = 5 and 2x + 2y = 10 is consistent.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH03/T01/Q01" },
        { id: "okfq_ch03t01_2", type: "MCQ", text: "Two lines that intersect at exactly one point represent a system that is:", options: ["Inconsistent", "Consistent with unique solution", "Consistent with infinite solutions", "Cannot be determined"], correctIndex: 1, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH03/T01/Q02" },
      ] },
      { id: "ch03-t02", title: "Algebraic Methods (Substitution & Elimination)", questions: [
        { id: "okfq_ch03t02_1", type: "Short Answer", text: "Solve by elimination: 2x + 3y = 11 and 2x − 4y = −24.", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH03/T02/Q01" },
        { id: "okfq_ch03t02_2", type: "Long Answer", text: "The sum of a two-digit number and the number obtained by reversing its digits is 66. Find the number if the digits differ by 2.", marks: 5, okf_ref: "OKF/CBSE/X/MATH/CH03/T02/Q02" },
      ] },
    ] },
    { id: "ch04", number: 4, title: "Quadratic Equations", topics: [
      { id: "ch04-t01", title: "Solution by Factorisation", questions: [
        { id: "okfq_ch04t01_1", type: "Short Answer", text: "Solve for x: x² − 7x + 12 = 0 by factorisation.", marks: 2, okf_ref: "OKF/CBSE/X/MATH/CH04/T01/Q01" },
        { id: "okfq_ch04t01_2", type: "MCQ", text: "The roots of x² − 5x + 6 = 0 are:", options: ["2, 3", "1, 6", "−2, −3", "2, −3"], correctIndex: 0, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH04/T01/Q02" },
      ] },
      { id: "ch04-t02", title: "Quadratic Formula & Nature of Roots", questions: [
        { id: "okfq_ch04t02_1", type: "Long Answer", text: "Using the quadratic formula, solve 2x² − 7x + 3 = 0 and state the nature of its roots.", marks: 4, okf_ref: "OKF/CBSE/X/MATH/CH04/T02/Q01" },
        { id: "okfq_ch04t02_2", type: "Proof", text: "Show that the equation 3x² − 4x + 4/3 = 0 has equal roots, and find the roots.", marks: 4, okf_ref: "OKF/CBSE/X/MATH/CH04/T02/Q02" },
      ] },
    ] },
    { id: "ch05", number: 5, title: "Arithmetic Progressions", topics: [
      { id: "ch05-t01", title: "nth Term of an AP", questions: [
        { id: "okfq_ch05t01_1", type: "Short Answer", text: "Find the 20th term of the AP: 3, 7, 11, 15, ...", marks: 2, okf_ref: "OKF/CBSE/X/MATH/CH05/T01/Q01" },
        { id: "okfq_ch05t01_2", type: "MCQ", text: "The common difference of the AP 10, 7, 4, 1, ... is:", options: ["3", "−3", "7", "−7"], correctIndex: 1, marks: 1, okf_ref: "OKF/CBSE/X/MATH/CH05/T01/Q02" },
      ] },
      { id: "ch05-t02", title: "Sum of First n Terms", questions: [
        { id: "okfq_ch05t02_1", type: "Long Answer", text: "Find the sum of the first 30 terms of the AP: 2, 7, 12, 17, ...", marks: 4, okf_ref: "OKF/CBSE/X/MATH/CH05/T02/Q01" },
        { id: "okfq_ch05t02_2", type: "Short Answer", text: "How many terms of the AP 24, 21, 18, ... must be taken so that their sum is 78?", marks: 3, okf_ref: "OKF/CBSE/X/MATH/CH05/T02/Q02" },
      ] },
    ] },
  ],
}

export const OKF_CHAPTER_PERFORMANCE: OkfChapterPerformance[] = [
  { chapterId: "ch01", avgScore: 82, questionsGraded: 46 },
  { chapterId: "ch02", avgScore: 74, questionsGraded: 38 },
  { chapterId: "ch03", avgScore: 61, questionsGraded: 42 },
  { chapterId: "ch04", avgScore: 58, questionsGraded: 34 },
  { chapterId: "ch05", avgScore: 88, questionsGraded: 29 },
]

export const REPORTS: Report[] = [
  { name: "Attendance Summary — June", type: "Attendance", generated: "Jul 1" },
  { name: "Class 8A Performance Report", type: "Performance", generated: "Jun 28" },
  { name: "Syllabus Coverage — Term 2", type: "Syllabus", generated: "Jun 20" },
  { name: "Homework Completion — Q2", type: "Homework", generated: "Jun 15" },
]

export const EXAMS: Exam[] = [
  { id: "ex1", title: "Algebra Quiz — Linear Equations", classId: "c1", date: "Jul 9", type: "Quiz", weight: "10%", duration: 45, coverageUnitIds: ["cu1"], revisionAllocated: 1, revisionUsed: 1, teacherId: "t_me" },
  { id: "ex2", title: "Mid-Term Exam — Mathematics", classId: "c1", date: "Jul 17", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu1"], revisionAllocated: 3, revisionUsed: 1, teacherId: "t_me" },
  { id: "ex3", title: "Mid-Term Exam — Mathematics", classId: "c2", date: "Jul 17", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu2"], revisionAllocated: 2, revisionUsed: 0, teacherId: "t_kn" },
  { id: "ex4", title: "Unit Test — Geometry Basics", classId: "c3", date: "Jul 22", type: "Unit Test", weight: "15%", duration: 60, coverageUnitIds: ["cu3"], revisionAllocated: 2, revisionUsed: 2, teacherId: "t_me" },
  { id: "ex5", title: "Mid-Term Exam — Algebra II", classId: "c4", date: "Jul 18", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu4"], revisionAllocated: 3, revisionUsed: 1, teacherId: "t_kn" },
]

export const CALENDAR_TYPES = ["Holiday", "Event"] as const
export const ACADEMIC_CALENDAR_SEED: AcademicCalendarItem[] = [
  { id: "cal1", date: "Jul 4", label: "Teacher Training Day", type: "Holiday" },
  { id: "cal2", date: "Jul 12", label: "Sports Day", type: "Event" },
  { id: "cal3", date: "Jul 20", label: "Founders Day", type: "Holiday" },
]

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
export const TERMS = ["Term 1", "Term 2", "Term 3"]
export const EXAM_TYPES = ["Quiz", "Unit Test", "Exam", "Final"]
export const ACADEMIC_YEARS = ["2025–26", "2026–27"]
export const WEIGHTAGE_LEVELS = ["High", "Medium", "Low"]
export const DIFFICULTY_LEVELS = ["Low", "Medium", "High"]

// Current focus: every weekday period plans Class 10 — Section A Mathematics
// (the syllabus with real detail in the clerk DB).
export const TIMETABLE_SEED: TimetableEntry[] = [
  { id: "tt1", day: "Monday", time: "9:00 AM", classId: "c10" },
  { id: "tt2", day: "Tuesday", time: "9:00 AM", classId: "c10" },
  { id: "tt3", day: "Wednesday", time: "9:00 AM", classId: "c10" },
  { id: "tt4", day: "Thursday", time: "9:00 AM", classId: "c10" },
  { id: "tt5", day: "Friday", time: "9:00 AM", classId: "c10" },
]

export const MT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
export const MT_PERIODS = [1, 2, 3, 4, 5]
export const PERIOD_TIME_LABELS: Record<number, string> = { 1: "9:00–9:45", 2: "9:45–10:30", 3: "10:45–11:30", 4: "11:30–12:15", 5: "1:00–1:45" }
export const MT_GRID_STRUCTURE = [
  { kind: "period" as const, period: 1 }, { kind: "period" as const, period: 2 },
  { kind: "break" as const, label: "Break", time: "10:30–10:45" },
  { kind: "period" as const, period: 3 }, { kind: "period" as const, period: 4 },
  { kind: "lunch" as const, label: "Lunch", time: "12:15–1:00" },
  { kind: "period" as const, period: 5 },
]
export const MT_SECTIONS: Section[] = [
  { id: "sec_8a", label: "Class 8 — Section A", grade: 8, section: "A" },
  { id: "sec_8b", label: "Class 8 — Section B", grade: 8, section: "B" },
  { id: "sec_7a", label: "Class 7 — Section A", grade: 7, section: "A" },
  { id: "sec_9c", label: "Class 9 — Section C", grade: 9, section: "C" },
]
const MASTER_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"]
const SUBJECT_TEACHER: Record<string, string> = {
  Mathematics: "Meenakshi Parameswaran", "Algebra II": "Meenakshi Parameswaran", Science: "James Okafor",
  English: "Priya Nair", "Social Studies": "David Kim", "Computer Science": "Laura Chen",
}
const SUBJECT_ROOM: Record<string, string> = {
  Mathematics: "Room 204", "Algebra II": "Room 204", Science: "Science Lab",
  English: "Room 112", "Social Studies": "Room 108", "Computer Science": "Computer Lab",
}
export const SECTION_SUBJECT_TO_SYLLABUS_CLASS: Record<string, string> = {
  "sec_8a|Mathematics": "c1", "sec_8b|Mathematics": "c2", "sec_7a|Mathematics": "c3", "sec_9c|Algebra II": "c4",
}
function buildMasterTimetableSeed(academicYear: string, rotationOffset: number): MasterTimetableRow[] {
  const rows: MasterTimetableRow[] = []
  MT_SECTIONS.forEach((sec, sIdx) => {
    MT_DAYS.forEach((day, dIdx) => {
      const studyHallPeriod = ((dIdx + 1) % MT_PERIODS.length) + 1
      MT_PERIODS.forEach((period, pIdx) => {
        let subject: string
        if (period === studyHallPeriod) {
          subject = "Study Hall"
        } else {
          subject = MASTER_SUBJECTS[(pIdx + dIdx + sIdx + rotationOffset) % MASTER_SUBJECTS.length]
          if (sec.id === "sec_9c") subject = subject === "Mathematics" ? "Algebra II" : subject
        }
        rows.push({
          id: `mt_${academicYear}_${sec.id}_${day}_${period}`,
          sectionId: sec.id, academicYear, day, period, subject,
          teacher: subject === "Study Hall" ? "—" : SUBJECT_TEACHER[subject] || "Unassigned",
          room: subject === "Study Hall" ? "Library" : SUBJECT_ROOM[subject] || "TBD",
        })
      })
    })
  })
  if (academicYear === "2026–27") {
    const idx = rows.findIndex((r) => r.sectionId === "sec_8b" && r.day === "Monday" && r.period === 1)
    if (idx >= 0) rows[idx] = { ...rows[idx], subject: "Mathematics", teacher: "Meenakshi Parameswaran", room: "Room 204" }
  }
  return rows
}
export const MASTER_TIMETABLE: MasterTimetableRow[] = [
  ...buildMasterTimetableSeed("2026–27", 0),
  ...buildMasterTimetableSeed("2025–26", 2),
]

export const PARENT_MESSAGES: ParentMessage[] = [
  { parent: "Mrs. Brown", student: "Olivia Brown", last: "Thank you for the update — we'll work on homework consistency at home.", date: "Jul 8", unread: false },
  { parent: "Mr. Davis", student: "Ethan Davis", last: "Can we schedule a call this week to discuss his attendance?", date: "Jul 8", unread: true },
  { parent: "Mrs. Turner", student: "Jacob Turner", last: "He mentioned he's struggling with the last two assignments.", date: "Jul 7", unread: true },
  { parent: "Mr. & Mrs. Lee", student: "Sophia Lee", last: "Great to hear about her progress, thank you!", date: "Jul 5", unread: false },
]

// Syllabus units start empty — real units are created in Settings > Syllabus.
export const CURRICULUM: CurriculumUnit[] = []

export const DEMAND_PRESETS: DemandPreset[] = [
  { key: "foundational", name: "Foundational", easy: 60, medium: 40, hard: 0 },
  { key: "easy_weighted", name: "Easy-Weighted", easy: 60, medium: 30, hard: 10 },
  { key: "balanced", name: "Balanced", easy: 30, medium: 50, hard: 20 },
  { key: "challenging", name: "Challenging", easy: 10, medium: 50, hard: 40 },
  { key: "stretch", name: "Stretch", easy: 10, medium: 30, hard: 60 },
]

export const PALETTE_TYPES: PaletteType[] = [
  { type: "multiple_choice", label: "Multiple Choice", icon: "☰", bg: "#E0F2FE", color: "#0369A1" },
  { type: "multi_select", label: "Multi-Select", icon: "☑", bg: "#F3E8FF", color: "#7C3AED" },
  { type: "true_false", label: "True/False", icon: "⊘", bg: "#DCFCE7", color: "#15803D" },
  { type: "matching", label: "Matching", icon: "🔗", bg: "#FFEDD5", color: "#C2410C" },
  { type: "fill_blank", label: "Fill in the Blank", icon: "✎", bg: "#FEF9C3", color: "#A16207" },
  { type: "short_answer", label: "Short Answer", icon: "🔍", bg: "#E0E7FF", color: "#4338CA" },
  { type: "scenario", label: "Scenario-Based", icon: "📄", bg: "#FCE7F3", color: "#BE185D" },
  { type: "multi_part", label: "Multi-Part", icon: "🧩", bg: "#ECFDF5", color: "#047857" },
  { type: "essay", label: "Essay", icon: "💬", bg: "#F5F3FF", color: "#6D28D9" },
]

export const TOPIC_OPTIONS: TopicOption[] = [
  { id: "photosynthesis", label: "Biology — Photosynthesis" },
  { id: "fractions", label: "Maths — Fractions" },
  { id: "atoms", label: "Chemistry — Atoms" },
]

// Demo video-lesson library for the Assessment Builder's "Video Lesson"
// section type — a small local stand-in for a real video search backend.
// `tags` back the keyword/semantic search toggle in the picker modal.
export interface VideoLesson {
  id: string
  topicId: string
  title: string
  thumbnail: string
  duration: string
  tags: string[]
}
export const VIDEO_LIBRARY: VideoLesson[] = [
  { id: "vid1", topicId: "photosynthesis", title: "Photosynthesis Explained: Light & Dark Reactions", thumbnail: "🌿", duration: "6:12", tags: ["chlorophyll", "light reaction", "calvin cycle", "plants"] },
  { id: "vid2", topicId: "photosynthesis", title: "How Leaves Make Food — Animated Overview", thumbnail: "🍃", duration: "4:35", tags: ["chloroplast", "glucose", "stomata", "animation"] },
  { id: "vid3", topicId: "photosynthesis", title: "Photosynthesis Lab: Testing for Starch", thumbnail: "🧪", duration: "8:02", tags: ["experiment", "iodine test", "lab demo"] },
  { id: "vid4", topicId: "fractions", title: "Adding & Subtracting Fractions the Easy Way", thumbnail: "➗", duration: "5:48", tags: ["numerator", "denominator", "common denominator"] },
  { id: "vid5", topicId: "fractions", title: "Equivalent Fractions Visualized", thumbnail: "🍕", duration: "3:57", tags: ["equivalent", "simplify", "visual model"] },
  { id: "vid6", topicId: "fractions", title: "Mixed Numbers & Improper Fractions", thumbnail: "🔢", duration: "7:10", tags: ["mixed number", "improper fraction", "conversion"] },
  { id: "vid7", topicId: "atoms", title: "Inside the Atom: Protons, Neutrons & Electrons", thumbnail: "⚛️", duration: "6:40", tags: ["proton", "neutron", "electron", "nucleus"] },
  { id: "vid8", topicId: "atoms", title: "Bohr Model vs Quantum Model", thumbnail: "🌀", duration: "9:15", tags: ["bohr model", "electron shell", "quantum"] },
]

export const QUESTION_BANK_V2: Record<string, BankQuestionV2[]> = {
  photosynthesis: [
    { id: 1, text: "What is the primary pigment involved in photosynthesis?", difficulty: "Easy", options: ["Chlorophyll", "Carotene", "Xanthophyll", "Hemoglobin"], correct: [0] },
    { id: 2, text: "Which gas is taken in by plants during photosynthesis?", difficulty: "Easy", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correct: [1] },
    { id: 3, text: "In which organelle does photosynthesis occur?", difficulty: "Easy", options: ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"], correct: [2] },
    { id: 4, text: "What are the products of photosynthesis?", difficulty: "Medium", options: ["Glucose and oxygen", "Carbon dioxide and water", "ATP and NADPH", "Proteins and lipids"], correct: [0] },
    { id: 5, text: "Which part of photosynthesis occurs in the thylakoid membranes?", difficulty: "Medium", options: ["Calvin cycle", "Light-dependent reactions", "Krebs cycle", "Glycolysis"], correct: [1] },
    { id: 6, text: "What is the role of NADP+ in photosynthesis?", difficulty: "Medium", options: ["Electron carrier", "Carbon source", "Oxygen acceptor", "Pigment molecule"], correct: [0] },
    { id: 7, text: "Explain the significance of the Calvin cycle.", difficulty: "Hard", options: ["It fixes carbon into organic molecules", "It releases oxygen", "It produces ATP directly", "It breaks down glucose"], correct: [0] },
    { id: 8, text: "How does photorespiration differ from photosynthesis?", difficulty: "Hard", options: ["It consumes oxygen and releases CO2", "It produces glucose", "It requires light only", "It occurs in mitochondria"], correct: [0] },
    { id: 9, text: "What happens to the light energy absorbed by chlorophyll?", difficulty: "Hard", options: ["It is converted to chemical energy", "It is reflected as heat", "It is stored as starch", "It is lost as fluorescence"], correct: [0] },
  ],
  fractions: [
    { id: 101, text: "What is 1/2 + 1/4?", difficulty: "Easy", options: ["1/6", "3/4", "2/6", "1/4"], correct: [1] },
    { id: 102, text: "Which fraction is equivalent to 2/4?", difficulty: "Easy", options: ["1/2", "3/4", "1/4", "2/3"], correct: [0] },
    { id: 103, text: "Simplify 6/8.", difficulty: "Easy", options: ["3/4", "2/3", "1/2", "4/5"], correct: [0] },
    { id: 104, text: "What is 3/5 of 25?", difficulty: "Medium", options: ["10", "15", "20", "5"], correct: [1] },
    { id: 105, text: "Convert 0.75 to a fraction.", difficulty: "Medium", options: ["3/4", "1/4", "2/5", "7/10"], correct: [0] },
    { id: 106, text: "Which is greater: 2/3 or 3/5?", difficulty: "Medium", options: ["2/3", "3/5", "Equal", "Cannot tell"], correct: [0] },
    { id: 107, text: "Solve: 2/3 ÷ 4/5.", difficulty: "Hard", options: ["5/6", "8/15", "3/10", "1/2"], correct: [0] },
    { id: 108, text: "A recipe calls for 3/4 cup of sugar. How much for half the recipe?", difficulty: "Hard", options: ["3/8 cup", "1/2 cup", "1/4 cup", "2/3 cup"], correct: [0] },
  ],
  atoms: [
    { id: 201, text: "What particle has a negative charge?", difficulty: "Easy", options: ["Proton", "Neutron", "Electron", "Nucleus"], correct: [2] },
    { id: 202, text: "Where is most of the mass of an atom located?", difficulty: "Easy", options: ["Electron cloud", "Nucleus", "Orbitals", "Shells"], correct: [1] },
    { id: 203, text: "What is the atomic number?", difficulty: "Medium", options: ["Number of protons", "Number of neutrons", "Number of electrons", "Mass of atom"], correct: [0] },
    { id: 204, text: "Isotopes differ in number of _____.", difficulty: "Medium", options: ["Protons", "Neutrons", "Electrons", "Shells"], correct: [1] },
    { id: 205, text: "Describe Bohr's model of the atom.", difficulty: "Hard", options: ["Electrons orbit nucleus in fixed paths", "Electrons form a cloud", "Atoms are indivisible", "Protons orbit neutrons"], correct: [0] },
  ],
}

export const TEACHERS_ADMIN: TeacherAdmin[] = [
  { name: "Meenakshi Parameswaran", subject: "Mathematics", classes: 5, avgAttendance: 91, rating: 4.8 },
  { name: "James Okafor", subject: "Science", classes: 4, avgAttendance: 88, rating: 4.6 },
  { name: "Priya Nair", subject: "English", classes: 6, avgAttendance: 93, rating: 4.9 },
  { name: "David Kim", subject: "Social Studies", classes: 4, avgAttendance: 85, rating: 4.4 },
  { name: "Laura Chen", subject: "Computer Science", classes: 3, avgAttendance: 95, rating: 4.9 },
]

export const STANDARDS_OPTIONS: StandardOption[] = [
  { code: "8.EE.C.7", label: "8.EE.C.7 — Solve linear equations in one variable" },
  { code: "8.EE.C.8", label: "8.EE.C.8 — Solve systems of two linear equations" },
  { code: "8.F.A.2", label: "8.F.A.2 — Compare properties of two functions" },
  { code: "7.G.B.5", label: "7.G.B.5 — Angle relationships in geometric figures" },
]

export const DEFAULT_PLAN: LessonPlan = {
  topic: "Solving Linear Equations with Variables on Both Sides",
  className: "Class 8 — Section A", subject: "Mathematics", duration: "45", standards: ["8.EE.C.7"],
  objective: "Students will be able to solve linear equations with variables on both sides with at least 80% accuracy on independent practice.",
  materials: ["Whiteboard & markers", "Practice worksheet (printable)", "Exit ticket slips", "Calculator (optional)"],
  warmup: "5 min — Quick recap: 3 review problems from the previous lesson, solved individually then checked in pairs.",
  instruction: "15 min — Direct instruction with worked examples on the board; think-aloud modeling of each solution step.",
  activity: "18 min — Small-group problem set (mixed-ability groups of 3); circulate to provide targeted support.",
  assessment: "7 min — 4-question exit ticket covering today's objective; used to group students for tomorrow's warm-up.",
  homework: "Practice worksheet, problems 1–10, due next class.",
}

export const SAVED_LIBRARY_SEED: SavedLessonPlan[] = [
  { id: "lib1", topic: "Factoring Polynomials — Intro", className: "Class 9 — Section C", subject: "Algebra II", duration: "45", savedOn: "Jul 6" },
  { id: "lib2", topic: "Geometry: Angle Pair Relationships", className: "Class 7 — Section A", subject: "Mathematics", duration: "40", savedOn: "Jul 3" },
  { id: "lib3", topic: "Quadratic Functions — Graphing Basics", className: "Class 8 — Section B", subject: "Mathematics", duration: "45", savedOn: "Jun 28" },
]

export const DIFFERENTIATE_CONTENT = {
  support: "Provide a worked-example reference sheet and sentence starters. Reduce problem set to 6 items with scaffolded steps shown. Pair with a peer partner for the group activity.",
  onlevel: "Standard problem set as planned. Encourage students to explain their reasoning verbally before writing the final answer.",
  challenge: "Add 2 multi-step word problems requiring the equation to be set up from context. Ask students to create and solve their own equation for a partner to check.",
}

export const CHAT_TOPICS: Record<string, ChatTopic> = {
  w_fractions: { title: "Fractions: Adding & Subtracting Unlike Denominators", grade: "Class 5", subject: "Math", standard: "CCSS.MATH.5.NF.1", duration: "20 min", count: 10,
    byLevel: { remedial: "Uses visual fraction bars and denominators limited to 2, 4, and 8 for extra scaffolding.", onlevel: "Standard 10-question set mixing halves, thirds, fourths, and sixths.", gifted: "Adds unlike denominators up to twelfths plus one multi-step word problem." } },
  w_photo: { title: "Photosynthesis: Inputs, Outputs & Chloroplast Structure", grade: "Class 7", subject: "Science", standard: "NGSS.MS-LS1-6", duration: "25 min", count: 12,
    byLevel: { remedial: "Includes a labeled diagram word bank and simplified vocabulary.", onlevel: "Standard set covering the light and dark reactions with short-answer prompts.", gifted: "Adds a chemical-equation balancing task and a compare/contrast with cellular respiration." } },
  w_revolution: { title: "Causes of the American Revolution", grade: "Class 8", subject: "History", standard: "C3.D2.His.1.6-8", duration: "30 min", count: 8,
    byLevel: { remedial: "Uses a guided timeline with sentence starters for each cause.", onlevel: "Standard set analyzing 4 primary-source excerpts.", gifted: "Adds a DBQ-style essay prompt weighing economic vs. political causes." } },
}
export const CHAT_EXIT_TICKETS: Record<string, ChatExitTicket> = {
  et_fractions: { title: "Fractions – Exit Ticket", className: "Class 5 Math", questions: ["Simplify 6/8 to lowest terms.", "Add 1/3 + 1/6 and show your work.", "Rate your confidence with today's lesson (1–5)."] },
  et_photo: { title: "Photosynthesis – Exit Ticket", className: "Class 7 Science", questions: ["Name the two main inputs of photosynthesis.", "What organelle is photosynthesis carried out in?", "One thing that's still unclear to you?"] },
}
export const CHAT_QUESTIONS: Record<string, ChatPolicyAnswer> = {
  q_late: { answer: "Riverside's policy allows one late submission per unit with a 10% deduction, unless the student has an active IEP/504 accommodation extending deadlines [1]. Extensions beyond 3 days require department-head approval.",
    source: { name: "Riverside MS – Grading & Late Work Policy.pdf", snippet: "\"Students may submit one late assignment per grading period at a 10% point deduction...\"", updated: "Reviewed Aug 2025" } },
  q_iep: { answer: "For students with an active IEP, extended time (typically 1.5x) and reduced-distraction settings apply automatically to all assessments unless the IEP specifies otherwise [1]. Case managers must be copied on any modified assignment.",
    source: { name: "Special Education – IEP Classroom Accommodations Guide.pdf", snippet: "\"Extended time accommodations default to time-and-a-half unless otherwise noted in the student's IEP...\"", updated: "Reviewed Jan 2026" } },
  q_trip: { answer: "Field trip permission forms and the trip request packet must be submitted to the front office at least 10 school days before the trip date, with a signed risk-assessment form attached [1].",
    source: { name: "Riverside MS – Field Trip Procedures.pdf", snippet: "\"All trip requests require submission 10 school days in advance, including a completed risk-assessment form...\"", updated: "Reviewed Sep 2025" } },
}
export const CHAT_EMAILS: Record<string, ChatEmail> = {
  email_alex: { subject: "Checking in on Alex's progress in Math",
    bodyByTone: {
      casual: "Hi there! Just wanted to check in about Alex — they're putting in effort in Math class, but unlike-denominator fraction problems are still tripping them up. Happy to chat anytime about how we can support Alex at home too!",
      professional: "Dear Mr./Mrs. Rivera, I wanted to reach out regarding Alex's progress in Math class. Alex has been engaged and putting in effort, but is currently finding problems with unlike denominators challenging. I'd welcome the chance to discuss strategies to support Alex both in class and at home.",
      formal: "Dear Mr./Mrs. Rivera, I am writing to inform you of Alex's current progress in Mathematics. While Alex demonstrates consistent effort, recent assessments indicate difficulty with fraction operations involving unlike denominators. I would appreciate the opportunity to schedule a conference to discuss appropriate support measures.",
    } },
  email_jordan: { subject: "Missing homework check-in for Jordan",
    bodyByTone: {
      casual: "Hey! Just a heads up that Jordan's missed a few homework turn-ins this week. Nothing urgent, but wanted to loop you in early — let me know if anything's going on at home I should know about.",
      professional: "Dear Mr./Mrs. Patel, I wanted to let you know Jordan has missed several homework submissions this week. I'd like to work together to get Jordan back on track — please let me know if there's anything getting in the way that I should be aware of.",
      formal: "Dear Mr./Mrs. Patel, this letter is to notify you that Jordan has failed to submit homework assignments on four occasions this week. Please contact me at your earliest convenience to discuss a plan to address this pattern.",
    } },
}
export const CHAT_ROOT_CHIPS: ChatRootChip[] = [
  { id: "worksheet", label: "📝 Generate Worksheet" },
  { id: "grades", label: "📊 Summarize Grades" },
  { id: "email", label: "📧 Draft Parent Email" },
  { id: "exitticket", label: "🧩 Create Exit Ticket" },
  { id: "ask", label: "💬 Ask a Question" },
]
export const CHAT_GREETING = "Hi Miss Priya 👋 I'm your teaching assistant. I can help you plan a lesson, draft a parent email, create an exit ticket, or answer school policy questions. What would you like to do?"
