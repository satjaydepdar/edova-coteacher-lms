
// ---------- Mock data ----------
const TEACHER_NAME = "Meenakshi Parameswaran";

const NAV_GROUPS = [
  { label: "Home", items: [
    { key: "dashboard", label: "Dashboard", icon: "🏠" },
    { key: "calendar", label: "My Calendar", icon: "📅" },
    { key: "classes", label: "My Classes", icon: "🏫" },
    { key: "subjects", label: "My Subjects", icon: "📘" },
  ]},
  { label: "Administration", adminOnly: true, items: [
    { key: "settings", label: "Settings", icon: "⚙️" },
  ]},
  { label: "Planning", items: [
    { key: "lessonPlanner", label: "Lesson Planner", icon: "📝" },
    { key: "curriculumMap", label: "Syllabus Map", icon: "🗺️" },
    { key: "courseProgress", label: "Course Progress", icon: "📈" },
  ]},
  { label: "Teaching", items: [
    { key: "assignments", label: "Assignments", icon: "📋" },
    { key: "homeworkTracker", label: "Homework Tracker", icon: "✅" },
    { key: "exams", label: "Assessment & Exams", icon: "🧪" },
    { key: "assessmentBuilder", label: "Assessment Builder", icon: "🧮" },
    { key: "attendance", label: "Attendance", icon: "🗓️" },
    { key: "resources", label: "Learning Resources", icon: "📁" },
  ]},
  { label: "Students", items: [
    { key: "behavior", label: "Student Behavior", icon: "🌟" },
    { key: "gradebook", label: "Gradebook", icon: "🎓" },
    { key: "studentProgress", label: "Student Progress", icon: "📊" },
    { key: "analytics", label: "Class Analytics", icon: "🔍" },
  ]},
  { label: "Communication", items: [
    { key: "announcements", label: "Announcements", icon: "📣" },
    { key: "upcomingTasks", label: "Upcoming Tasks", icon: "🗒️" },
    { key: "parentCommunication", label: "Parent Communication", icon: "💬" },
    { key: "reports", label: "Reports", icon: "📄" },
  ]},
];

const VIEW_LABELS = {};
NAV_GROUPS.forEach(g => g.items.forEach(i => VIEW_LABELS[i.key] = i.label));

const CLASSES = [
  { id: "c1", name: "Grade 8 — Section A", subject: "Mathematics", room: "Room 204", students: 32, schedule: "Mon–Fri, 9:00–9:45", sectionId: "sec_8a" },
  { id: "c2", name: "Grade 8 — Section B", subject: "Mathematics", room: "Room 204", students: 30, schedule: "Mon–Fri, 10:00–10:45", sectionId: "sec_8b" },
  { id: "c3", name: "Grade 7 — Section A", subject: "Mathematics", room: "Room 108", students: 28, schedule: "Mon, Wed, Fri, 11:15–12:00", sectionId: "sec_7a" },
  { id: "c4", name: "Grade 9 — Section C", subject: "Algebra II", room: "Room 204", students: 26, schedule: "Tue, Thu, 1:00–1:45", sectionId: "sec_9c" },
  { id: "c5", name: "Grade 8 — Section A", subject: "Homeroom", room: "Room 204", students: 32, schedule: "Mon–Fri, 8:15–8:30", sectionId: "sec_8a" },
];

const STUDENTS = [
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
];

const CALENDAR_EVENTS = [
  { date: "Jul 9", day: "Today", title: "Grade 8A — Algebra Quiz", type: "exam", time: "9:00 AM" },
  { date: "Jul 9", day: "Today", title: "Parent Meeting — Olivia Brown", type: "meeting", time: "2:30 PM" },
  { date: "Jul 10", day: "Tomorrow", title: "Grade 9C — Chapter 5 Review", type: "class", time: "1:00 PM" },
  { date: "Jul 11", day: "Fri", title: "Homework Due — Linear Equations", type: "deadline", time: "11:59 PM" },
  { date: "Jul 14", day: "Mon", title: "Staff Meeting", type: "meeting", time: "8:00 AM" },
  { date: "Jul 17", day: "Thu", title: "Mid-Term Exams Begin", type: "exam", time: "All day" },
  { date: "Jul 20", day: "Sun", title: "School Holiday — Founders Day", type: "holiday", time: "All day" },
];

// ---------- Assignments (backed by real per-student submissions) & Assessment Bank ----------
// submission.status: "not_started" | "submitted" | "late" | "missing"
const ASSIGNMENTS_SEED = [
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
];

const ASSESSMENT_BANK_SEED = [
  { id: "bank1", title: "Photosynthesis — Formative Quiz", classId: "c1", subject: "Mathematics", term: "Term 2", academicYear: "2026–27", totalPoints: 24, sectionCount: 2, questionCount: 8, createdOn: "Jul 2" },
];

const ANNOUNCEMENTS = [
  { id: "n1", title: "Mid-term exam schedule released", body: "Mid-term exams begin Jul 17. Please review the updated timetable and syllabus coverage with your sections.", date: "Jul 8", audience: "Students & Parents" },
  { id: "n2", title: "Parent-teacher meeting slots open", body: "Booking is now open for the Jul 9 parent-teacher meeting window. Slots fill on a first-come basis.", date: "Jul 6", audience: "Parents" },
  { id: "n3", title: "Founders Day holiday reminder", body: "School will remain closed on Jul 20 for Founders Day. Regular classes resume Jul 21.", date: "Jul 5", audience: "All" },
];

const TASKS = [
  { id: "t1", title: "Grade Linear Equations Worksheet (8A)", due: "Jul 10", priority: "high", done: false },
  { id: "t2", title: "Prepare Mid-term question bank — Algebra II", due: "Jul 12", priority: "high", done: false },
  { id: "t3", title: "Upload Chapter 5 slides for 9C", due: "Jul 11", priority: "medium", done: false },
  { id: "t4", title: "Respond to 3 parent messages", due: "Jul 9", priority: "medium", done: false },
  { id: "t5", title: "Submit attendance summary to admin", due: "Jul 9", priority: "low", done: true },
];

const BEHAVIOR_NOTES = [
  { student: "Sophia Lee", classId: "c1", type: "positive", note: "Helped a classmate understand factoring during group work.", date: "Jul 8" },
  { student: "Ethan Davis", classId: "c1", type: "incident", note: "Disruptive during quiz; asked to step out briefly.", date: "Jul 7" },
  { student: "Jacob Turner", classId: "c3", type: "incident", note: "Missed second homework deadline this month.", date: "Jul 6" },
  { student: "Isabella Wright", classId: "c3", type: "positive", note: "Volunteered to present geometry proof to the class.", date: "Jul 5" },
];

const RESOURCES = [
  { id: "res_up1", title: "Linear Equations — Slide Deck", type: "Slides", classId: "c1", uploaded: "Jul 2" },
  { id: "res_up2", title: "Quadratic Functions — Worked Examples", type: "PDF", classId: "c2", uploaded: "Jun 29" },
  { id: "res_up3", title: "Geometry Basics — Explainer Video", type: "Video", classId: "c3", uploaded: "Jun 27" },
  { id: "res_up4", title: "Polynomial Identities — Practice Set", type: "PDF", classId: "c4", uploaded: "Jun 24" },
];

// ---------- OKF (Open Knowledge Format) Library — CBSE Class 10 Mathematics ----------
// Read-only curriculum-anchored catalog: Chapter -> Topic -> Resources (video/PDF/worksheet/PPT).
// Each node keeps its okf_ref so anything pulled from here stays traceable to source.
const RESOURCE_TYPE_ICON = { Video: "🎬", PDF: "📄", Worksheet: "📝", PPT: "📊" };
const OKF_LIBRARY = {
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
};

// ---------- OKF Question Bank — same Chapter/Topic taxonomy as OKF_LIBRARY, used by ----------
// ---------- Assessment Builder's "Import from OKF" question source. ----------
const OKF_QUESTION_BANK = {
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
};

// ---------- OKF Chapter Performance — class-wide average score per OKF chapter, rolled up ----------
// ---------- from graded OKF-linked questions across assessments/homework. Feeds Gradebook. ----------
const OKF_CHAPTER_PERFORMANCE = [
  { chapterId: "ch01", avgScore: 82, questionsGraded: 46 },
  { chapterId: "ch02", avgScore: 74, questionsGraded: 38 },
  { chapterId: "ch03", avgScore: 61, questionsGraded: 42 },
  { chapterId: "ch04", avgScore: 58, questionsGraded: 34 },
  { chapterId: "ch05", avgScore: 88, questionsGraded: 29 },
];

const REPORTS = [
  { name: "Attendance Summary — June", type: "Attendance", generated: "Jul 1" },
  { name: "Grade 8A Performance Report", type: "Performance", generated: "Jun 28" },
  { name: "Syllabus Coverage — Term 2", type: "Syllabus", generated: "Jun 20" },
  { name: "Homework Completion — Q2", type: "Homework", generated: "Jun 15" },
];

const EXAMS = [
  { id: "ex1", title: "Algebra Quiz — Linear Equations", classId: "c1", date: "Jul 9", type: "Quiz", weight: "10%", duration: 45, coverageUnitIds: ["cu1"], revisionAllocated: 1, revisionUsed: 1 },
  { id: "ex2", title: "Mid-Term Exam — Mathematics", classId: "c1", date: "Jul 17", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu1"], revisionAllocated: 3, revisionUsed: 1 },
  { id: "ex3", title: "Mid-Term Exam — Mathematics", classId: "c2", date: "Jul 17", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu2"], revisionAllocated: 2, revisionUsed: 0 },
  { id: "ex4", title: "Unit Test — Geometry Basics", classId: "c3", date: "Jul 22", type: "Unit Test", weight: "15%", duration: 60, coverageUnitIds: ["cu3"], revisionAllocated: 2, revisionUsed: 2 },
  { id: "ex5", title: "Mid-Term Exam — Algebra II", classId: "c4", date: "Jul 18", type: "Exam", weight: "30%", duration: 90, coverageUnitIds: ["cu4"], revisionAllocated: 3, revisionUsed: 1 },
];

// ---------- Academic Calendar (holidays/events — reduce effective teaching days) ----------
const CALENDAR_TYPES = ["Holiday", "Event"];
const ACADEMIC_CALENDAR_SEED = [
  { id: "cal1", date: "Jul 4", label: "Teacher Training Day", type: "Holiday" },
  { id: "cal2", date: "Jul 12", label: "Sports Day", type: "Event" },
  { id: "cal3", date: "Jul 20", label: "Founders Day", type: "Holiday" },
];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatShortDate(d) { return MONTH_NAMES_SHORT[d.getMonth()] + " " + d.getDate(); }

// ---------- Settings-managed data (Timetable / Curriculum / Exam Schedule) ----------
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const EXAM_TYPES = ["Quiz", "Unit Test", "Exam", "Final"];

const TIMETABLE_SEED = [
  { id: "tt1", day: "Monday", time: "9:00 AM", classId: "c1" },
  { id: "tt2", day: "Tuesday", time: "1:00 PM", classId: "c4" },
  { id: "tt3", day: "Wednesday", time: "11:15 AM", classId: "c3" },
  { id: "tt4", day: "Thursday", time: "10:00 AM", classId: "c2" },
  { id: "tt5", day: "Friday", time: "9:00 AM", classId: "c1" },
];

// ---------- Master (school-wide) Timetable — Class / Teacher grids + Period Allocation ----------
const MT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MT_PERIODS = [1, 2, 3, 4, 5];
const PERIOD_TIME_LABELS = { 1: "9:00–9:45", 2: "9:45–10:30", 3: "10:45–11:30", 4: "11:30–12:15", 5: "1:00–1:45" };
// Structural rows drawn between periods on the class-grid view
const MT_GRID_STRUCTURE = [
  { kind: "period", period: 1 }, { kind: "period", period: 2 },
  { kind: "break", label: "Break", time: "10:30–10:45" },
  { kind: "period", period: 3 }, { kind: "period", period: 4 },
  { kind: "lunch", label: "Lunch", time: "12:15–1:00" },
  { kind: "period", period: 5 },
];

const MT_SECTIONS = [
  { id: "sec_8a", label: "Grade 8 — Section A", grade: 8, section: "A" },
  { id: "sec_8b", label: "Grade 8 — Section B", grade: 8, section: "B" },
  { id: "sec_7a", label: "Grade 7 — Section A", grade: 7, section: "A" },
  { id: "sec_9c", label: "Grade 9 — Section C", grade: 9, section: "C" },
];

const MASTER_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"];
const SUBJECT_TEACHER = {
  "Mathematics": "Meenakshi Parameswaran",
  "Algebra II": "Meenakshi Parameswaran",
  "Science": "James Okafor",
  "English": "Priya Nair",
  "Social Studies": "David Kim",
  "Computer Science": "Laura Chen",
};
const SUBJECT_ROOM = {
  "Mathematics": "Room 204",
  "Algebra II": "Room 204",
  "Science": "Science Lab",
  "English": "Room 112",
  "Social Studies": "Room 108",
  "Computer Science": "Computer Lab",
};
// Section + subject → the Syllabus (Settings > Syllabus) classId this timetable subject feeds pace data for
const SECTION_SUBJECT_TO_SYLLABUS_CLASS = {
  "sec_8a|Mathematics": "c1",
  "sec_8b|Mathematics": "c2",
  "sec_7a|Mathematics": "c3",
  "sec_9c|Algebra II": "c4",
};
// Reverse of SECTION_SUBJECT_TO_SYLLABUS_CLASS: classId → { sectionId, subject } — lets a
// Syllabus unit look up its own Timetable periods/week to auto-project a finish date.
const CLASSID_TO_SECTION_SUBJECT = {};
Object.entries(SECTION_SUBJECT_TO_SYLLABUS_CLASS).forEach(([key, classId]) => {
  const [sectionId, subject] = key.split("|");
  CLASSID_TO_SECTION_SUBJECT[classId] = { sectionId, subject };
});

function buildMasterTimetableSeed(academicYear, rotationOffset) {
  const rows = [];
  MT_SECTIONS.forEach((sec, sIdx) => {
    MT_DAYS.forEach((day, dIdx) => {
      // One period per day rotates to a "Study Hall" (no subject teacher), so no single
      // teacher ends up scheduled nearly every period across all four sections.
      const studyHallPeriod = ((dIdx + 1) % MT_PERIODS.length) + 1;
      MT_PERIODS.forEach((period, pIdx) => {
        let subject;
        if (period === studyHallPeriod) {
          subject = "Study Hall";
        } else {
          subject = MASTER_SUBJECTS[(pIdx + dIdx + sIdx + rotationOffset) % MASTER_SUBJECTS.length];
          if (sec.id === "sec_9c") subject = subject === "Mathematics" ? "Algebra II" : subject; // 9C's math track is Algebra II
        }
        rows.push({
          id: `mt_${academicYear}_${sec.id}_${day}_${period}`,
          sectionId: sec.id, academicYear, day, period,
          subject,
          teacher: subject === "Study Hall" ? "—" : (SUBJECT_TEACHER[subject] || "Unassigned"),
          room: subject === "Study Hall" ? "Library" : (SUBJECT_ROOM[subject] || "TBD"),
        });
      });
    });
  });
  // Deliberate double-booking for the conflict-detection demo: Meenakshi teaches
  // both 8A and 8B Mathematics at the same time on Monday, Period 1.
  if (academicYear === "2026–27") {
    const idx = rows.findIndex(r => r.sectionId === "sec_8b" && r.day === "Monday" && r.period === 1);
    if (idx >= 0) rows[idx] = { ...rows[idx], subject: "Mathematics", teacher: "Meenakshi Parameswaran", room: "Room 204" };
  }
  return rows;
}
const MASTER_TIMETABLE = [
  ...buildMasterTimetableSeed("2026–27", 0),
  ...buildMasterTimetableSeed("2025–26", 2),
];

const APP_TODAY = new Date(2026, 6, 9); // Jul 9, 2026 — "today" in this mockup
const MONTH_MAP = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
function parseShortDate(str) {
  const parts = (str || "").trim().split(/\s+/);
  const mon = MONTH_MAP[parts[0]];
  const day = parseInt(parts[1], 10);
  if (mon === undefined || isNaN(day)) return new Date(2026, 0, 1);
  return new Date(2026, mon, day);
}
function dayLabelForDate(d) {
  const diffDays = Math.round((d - APP_TODAY) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

const PARENT_MESSAGES = [
  { parent: "Mrs. Brown", student: "Olivia Brown", last: "Thank you for the update — we'll work on homework consistency at home.", date: "Jul 8", unread: false },
  { parent: "Mr. Davis", student: "Ethan Davis", last: "Can we schedule a call this week to discuss his attendance?", date: "Jul 8", unread: true },
  { parent: "Mrs. Turner", student: "Jacob Turner", last: "He mentioned he's struggling with the last two assignments.", date: "Jul 7", unread: true },
  { parent: "Mr. & Mrs. Lee", student: "Sophia Lee", last: "Great to hear about her progress, thank you!", date: "Jul 5", unread: false },
];

const ACADEMIC_YEARS = ["2025–26", "2026–27"];
const WEIGHTAGE_LEVELS = ["High", "Medium", "Low"];
const DIFFICULTY_LEVELS = ["Low", "Medium", "High"];

const CURRICULUM = [
  // ---- 2026–27 (current year, actively tracked) ----
  { id: "cu1", subject: "Mathematics", classId: "c1", academicYear: "2026–27", term: "Term 2", unit: "Linear Equations & Graphing",
    plannedStart: "Jul 1", plannedEnd: "Jul 15", periods: 8, textbookRef: "NCERT Math VIII, Ch. 4", weightage: "High",
    planned: 100, actual: 82, okfChapterId: "ch03",
    topics: [
      { id: "t1", name: "Slope-intercept form", done: true },
      { id: "t2", name: "Graphing linear equations", done: true },
      { id: "t3", name: "Systems of equations", done: false },
      { id: "t4", name: "Word problems", done: false },
    ] },
  { id: "cu2", subject: "Mathematics", classId: "c2", academicYear: "2026–27", term: "Term 2", unit: "Linear Equations & Graphing",
    plannedStart: "Jul 1", plannedEnd: "Jul 15", periods: 8, textbookRef: "NCERT Math VIII, Ch. 4", weightage: "High",
    planned: 100, actual: 60, okfChapterId: "ch03",
    topics: [
      { id: "t1", name: "Slope-intercept form", done: true },
      { id: "t2", name: "Graphing linear equations", done: false },
      { id: "t3", name: "Systems of equations", done: false },
      { id: "t4", name: "Word problems", done: false },
    ] },
  { id: "cu3", subject: "Mathematics", classId: "c3", academicYear: "2026–27", term: "Term 2", unit: "Geometry Basics",
    plannedStart: "Jun 20", plannedEnd: "Jul 10", periods: 10, textbookRef: "NCERT Math VII, Ch. 6", weightage: "Medium",
    planned: 100, actual: 95,
    topics: [
      { id: "t1", name: "Angles", done: true },
      { id: "t2", name: "Triangles", done: true },
      { id: "t3", name: "Properties of shapes", done: true },
    ] },
  { id: "cu4", subject: "Algebra II", classId: "c4", academicYear: "2026–27", term: "Term 2", unit: "Polynomials & Factoring",
    plannedStart: "Jun 25", plannedEnd: "Jul 20", periods: 12, textbookRef: "Algebra II Standard, Ch. 5", weightage: "High",
    planned: 100, actual: 58, okfChapterId: "ch02",
    topics: [
      { id: "t1", name: "Factoring quadratics", done: true },
      { id: "t2", name: "Polynomial division", done: false },
      { id: "t3", name: "Roots & zeros", done: false },
    ] },
  { id: "cu5", subject: "Homeroom", classId: "c5", academicYear: "2026–27", term: "Term 2", unit: "Study Skills & Ethics",
    plannedStart: "Jul 1", plannedEnd: "Jul 31", periods: 4, textbookRef: "—", weightage: "Low",
    planned: 100, actual: 70,
    topics: [
      { id: "t1", name: "Time management", done: true },
      { id: "t2", name: "Academic integrity", done: false },
    ] },

  // ---- 2025–26 (previous year, archived — source for "Copy from Previous Year") ----
  { id: "cu_p1", subject: "Mathematics", classId: "c1", academicYear: "2025–26", term: "Term 2", unit: "Linear Equations & Graphing",
    plannedStart: "Jul 3", plannedEnd: "Jul 18", periods: 8, textbookRef: "NCERT Math VIII, Ch. 4", weightage: "High",
    planned: 100, actual: 100,
    topics: [
      { id: "t1", name: "Slope-intercept form", done: true },
      { id: "t2", name: "Graphing linear equations", done: true },
      { id: "t3", name: "Systems of equations", done: true },
      { id: "t4", name: "Word problems", done: true },
    ] },
  { id: "cu_p2", subject: "Mathematics", classId: "c3", academicYear: "2025–26", term: "Term 2", unit: "Geometry Basics",
    plannedStart: "Jun 22", plannedEnd: "Jul 8", periods: 10, textbookRef: "NCERT Math VII, Ch. 6", weightage: "Medium",
    planned: 100, actual: 100,
    topics: [
      { id: "t1", name: "Angles", done: true },
      { id: "t2", name: "Triangles", done: true },
      { id: "t3", name: "Properties of shapes", done: true },
    ] },
  { id: "cu_p3", subject: "Algebra II", classId: "c4", academicYear: "2025–26", term: "Term 2", unit: "Polynomials & Factoring",
    plannedStart: "Jun 27", plannedEnd: "Jul 22", periods: 12, textbookRef: "Algebra II Standard, Ch. 5", weightage: "High",
    planned: 100, actual: 100,
    topics: [
      { id: "t1", name: "Factoring quadratics", done: true },
      { id: "t2", name: "Polynomial division", done: true },
      { id: "t3", name: "Roots & zeros", done: true },
    ] },
];

const DEMAND_TIERS = [
  { tier: "Foundational", e: 60, m: 40, h: 0 },
  { tier: "Easy-Weighted", e: 60, m: 30, h: 10 },
  { tier: "Balanced", e: 30, m: 50, h: 20 },
  { tier: "Challenging", e: 10, m: 50, h: 40 },
  { tier: "Stretch", e: 10, m: 30, h: 60 },
];

const SECTION_TEMPLATES = {
  multiple_choice: { icon: "☰", title: "Multiple Choice", bg: "#E0F2FE", iconColor: "#0369A1" },
  multi_select: { icon: "☑", title: "Multi-Select", bg: "#F3E8FF", iconColor: "#7C3AED" },
  true_false: { icon: "⊘", title: "True/False", bg: "#DCFCE7", iconColor: "#15803D" },
  matching: { icon: "🔗", title: "Matching", bg: "#FFEDD5", iconColor: "#C2410C" },
  fill_blank: { icon: "✎", title: "Fill in the Blank", bg: "#FEF9C3", iconColor: "#A16207" },
  short_answer: { icon: "🔍", title: "Short Answer", bg: "#E0E7FF", iconColor: "#4338CA" },
  scenario: { icon: "📄", title: "Scenario-Based", bg: "#FCE7F3", iconColor: "#BE185D" },
  multi_part: { icon: "🧩", title: "Multi-Part", bg: "#ECFDF5", iconColor: "#047857" },
  essay: { icon: "💬", title: "Essay", bg: "#F5F3FF", iconColor: "#6D28D9" },
  okf_import: { icon: "🔗", title: "OKF Import", bg: "#E9F1EC", iconColor: "#16332B" },
};

const SECTION_TYPE_META = {
  multiple_choice: { hasOptions: true, singleCorrect: true, defaultOptions: 4 },
  multi_select: { hasOptions: true, singleCorrect: false, defaultOptions: 4 },
  true_false: { hasOptions: true, singleCorrect: true, defaultOptions: 2, fixed: true },
  matching: { hasPairs: true, defaultPairs: 4 },
  fill_blank: { hasCorrectAnswer: true },
  short_answer: { hasModelAnswer: true },
  scenario: { hasScenarioText: true, hasModelAnswer: true },
  multi_part: { hasSubQuestions: true, hasModelAnswer: true },
  essay: { hasRubric: true },
};

const PALETTE_TYPES = [
  { type: "multiple_choice", label: "Multiple Choice", icon: "☰", bg: "#E0F2FE", color: "#0369A1" },
  { type: "multi_select", label: "Multi-Select", icon: "☑", bg: "#F3E8FF", color: "#7C3AED" },
  { type: "true_false", label: "True/False", icon: "⊘", bg: "#DCFCE7", color: "#15803D" },
  { type: "matching", label: "Matching", icon: "🔗", bg: "#FFEDD5", color: "#C2410C" },
  { type: "fill_blank", label: "Fill in the Blank", icon: "✎", bg: "#FEF9C3", color: "#A16207" },
  { type: "short_answer", label: "Short Answer", icon: "🔍", bg: "#E0E7FF", color: "#4338CA" },
  { type: "scenario", label: "Scenario-Based", icon: "📄", bg: "#FCE7F3", color: "#BE185D" },
  { type: "multi_part", label: "Multi-Part", icon: "🧩", bg: "#ECFDF5", color: "#047857" },
  { type: "essay", label: "Essay", icon: "💬", bg: "#F5F3FF", color: "#6D28D9" },
];

const DEMAND_PRESETS = [
  { key: "foundational", name: "Foundational", easy: 60, medium: 40, hard: 0 },
  { key: "easy_weighted", name: "Easy-Weighted", easy: 60, medium: 30, hard: 10 },
  { key: "balanced", name: "Balanced", easy: 30, medium: 50, hard: 20 },
  { key: "challenging", name: "Challenging", easy: 10, medium: 50, hard: 40 },
  { key: "stretch", name: "Stretch", easy: 10, medium: 30, hard: 60 },
];

const TOPIC_OPTIONS = [
  { id: "photosynthesis", label: "Biology — Photosynthesis" },
  { id: "fractions", label: "Maths — Fractions" },
  { id: "atoms", label: "Chemistry — Atoms" },
];

const QUESTION_BANK_V2 = {
  photosynthesis: [
    { id: 1, text: "What is the primary pigment involved in photosynthesis?", difficulty: "Easy", options: ["Chlorophyll", "Carotene", "Xanthophyll", "Hemoglobin"], correct: [0] },
    { id: 2, text: "Which gas is taken in by plants during photosynthesis?", difficulty: "Easy", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correct: [1] },
    { id: 3, text: "In which organelle does photosynthesis occur?", difficulty: "Easy", options: ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"], correct: [2] },
    { id: 4, text: "What are the products of photosynthesis?", difficulty: "Medium", options: ["Glucose and oxygen", "Carbon dioxide and water", "ATP and NADPH", "Proteins and lipids"], correct: [0] },
    { id: 5, text: "Which part of photosynthesis occurs in the thylakoid membranes?", difficulty: "Medium", options: ["Calvin cycle", "Light-dependent reactions", "Krebs cycle", "Glycolysis"], correct: [1] },
    { id: 6, text: "What is the role of NADP+ in photosynthesis?", difficulty: "Medium", options: ["Electron carrier", "Carbon source", "Oxygen acceptor", "Pigment molecule"], correct: [0] },
    { id: 7, text: "Explain the significance of the Calvin cycle.", difficulty: "Hard", options: ["It fixes carbon into organic molecules", "It releases oxygen", "It produces ATP directly", "It breaks down glucose"], correct: [0] },
    { id: 8, text: "How does photorespiration differ from photosynthesis?", difficulty: "Hard", options: ["It consumes oxygen and releases CO2", "It produces glucose", "It requires light only", "It occurs in mitochondria"], correct: [0] },
    { id: 9, text: "What happens to the light energy absorbed by chlorophyll?", difficulty: "Hard", options: ["It is converted to chemical energy", "It is reflected as heat", "It is stored as starch", "It is lost as fluorescence"], correct: [0] }
  ],
  fractions: [
    { id: 101, text: "What is 1/2 + 1/4?", difficulty: "Easy", options: ["1/6", "3/4", "2/6", "1/4"], correct: [1] },
    { id: 102, text: "Which fraction is equivalent to 2/4?", difficulty: "Easy", options: ["1/2", "3/4", "1/4", "2/3"], correct: [0] },
    { id: 103, text: "Simplify 6/8.", difficulty: "Easy", options: ["3/4", "2/3", "1/2", "4/5"], correct: [0] },
    { id: 104, text: "What is 3/5 of 25?", difficulty: "Medium", options: ["10", "15", "20", "5"], correct: [1] },
    { id: 105, text: "Convert 0.75 to a fraction.", difficulty: "Medium", options: ["3/4", "1/4", "2/5", "7/10"], correct: [0] },
    { id: 106, text: "Which is greater: 2/3 or 3/5?", difficulty: "Medium", options: ["2/3", "3/5", "Equal", "Cannot tell"], correct: [0] },
    { id: 107, text: "Solve: 2/3 ÷ 4/5.", difficulty: "Hard", options: ["5/6", "8/15", "3/10", "1/2"], correct: [0] },
    { id: 108, text: "A recipe calls for 3/4 cup of sugar. How much for half the recipe?", difficulty: "Hard", options: ["3/8 cup", "1/2 cup", "1/4 cup", "2/3 cup"], correct: [0] }
  ],
  atoms: [
    { id: 201, text: "What particle has a negative charge?", difficulty: "Easy", options: ["Proton", "Neutron", "Electron", "Nucleus"], correct: [2] },
    { id: 202, text: "Where is most of the mass of an atom located?", difficulty: "Easy", options: ["Electron cloud", "Nucleus", "Orbitals", "Shells"], correct: [1] },
    { id: 203, text: "What is the atomic number?", difficulty: "Medium", options: ["Number of protons", "Number of neutrons", "Number of electrons", "Mass of atom"], correct: [0] },
    { id: 204, text: "Isotopes differ in number of _____.", difficulty: "Medium", options: ["Protons", "Neutrons", "Electrons", "Shells"], correct: [1] },
    { id: 205, text: "Describe Bohr's model of the atom.", difficulty: "Hard", options: ["Electrons orbit nucleus in fixed paths", "Electrons form a cloud", "Atoms are indivisible", "Protons orbit neutrons"], correct: [0] }
  ]
};

function normalizeQuestion(raw) {
  return {
    ...raw,
    hasOptions: !!(raw.options && raw.options.length),
    hasPairs: !!(raw.pairs && raw.pairs.length),
    hasAnswer: raw.correctAnswer !== undefined && raw.correctAnswer !== null,
    hasRubric: !!raw.rubric,
    hasModel: !!raw.modelAnswer && !raw.rubric && !(raw.subQuestions && raw.subQuestions.length),
    hasSubQ: !!(raw.subQuestions && raw.subQuestions.length),
    hasScenario: !!raw.scenarioText,
  };
}

function generatePlaceholderQuestionData(type, idx, topicId) {
  const topicNames = { photosynthesis: "photosynthesis", fractions: "fractions", atoms: "atoms" };
  const topic = topicNames[topicId] || "this topic";
  const diffCycle = ["Easy", "Medium", "Hard"];
  const difficulty = diffCycle[idx % 3];

  if (type === "multi_select") {
    const prompts = {
      photosynthesis: "Select all that apply: Which of the following are involved in photosynthesis?",
      fractions: "Select all statements that are true about fractions.",
      atoms: "Select all that apply: Which particles are found in an atom?"
    };
    const optionSets = {
      photosynthesis: [{ text: "Chlorophyll", correct: true }, { text: "Carbon dioxide", correct: true }, { text: "Oxygen only as a reactant", correct: false }, { text: "Water", correct: true }],
      fractions: [{ text: "A fraction has a numerator and denominator", correct: true }, { text: "Equivalent fractions represent the same value", correct: true }, { text: "The denominator can never be zero", correct: true }, { text: "All fractions are greater than 1", correct: false }],
      atoms: [{ text: "Protons", correct: true }, { text: "Neutrons", correct: true }, { text: "Electrons", correct: true }, { text: "Photons", correct: false }]
    };
    const opts = optionSets[topicId] || optionSets.atoms;
    const options = opts.map((o, i) => ({ label: String.fromCharCode(65 + i), text: o.text, correct: o.correct }));
    return { text: prompts[topicId] || ("Select all that apply about " + topic + "."), difficulty, options };
  }

  if (type === "true_false") {
    const statements = { photosynthesis: "Plants release oxygen during photosynthesis.", fractions: "The fraction 2/4 is equivalent to 1/2.", atoms: "Electrons are positively charged." };
    const correctMap = { photosynthesis: 0, fractions: 0, atoms: 1 };
    const correctIdx = correctMap[topicId] ?? 0;
    return {
      text: statements[topicId] || ("True or false: this statement about " + topic + " is true."),
      difficulty,
      options: [
        { label: "A", text: "True", correct: correctIdx === 0 },
        { label: "B", text: "False", correct: correctIdx === 1 },
      ],
    };
  }

  if (type === "matching") {
    const pairSets = {
      photosynthesis: [{ left: "Chlorophyll", right: "Pigment that absorbs sunlight" }, { left: "Chloroplast", right: "Organelle where photosynthesis occurs" }, { left: "Carbon dioxide", right: "Gas taken in through stomata" }, { left: "Glucose", right: "Sugar produced by photosynthesis" }],
      fractions: [{ left: "1/2", right: "Equivalent to 2/4" }, { left: "Numerator", right: "Top number of a fraction" }, { left: "Denominator", right: "Bottom number of a fraction" }, { left: "Improper fraction", right: "Numerator is greater than denominator" }],
      atoms: [{ left: "Proton", right: "Positively charged particle" }, { left: "Neutron", right: "Particle with no charge" }, { left: "Electron", right: "Negatively charged particle" }, { left: "Nucleus", right: "Center of the atom" }]
    };
    return { text: "Match the items related to " + topic + ".", difficulty, pairs: pairSets[topicId] || pairSets.atoms };
  }

  if (type === "fill_blank") {
    const blanks = {
      photosynthesis: { text: "The process of _______ converts light energy into chemical energy.", answer: "photosynthesis" },
      fractions: { text: "A fraction with a numerator smaller than its denominator is called a _______ fraction.", answer: "proper" },
      atoms: { text: "The _______ has a negative charge and orbits the nucleus.", answer: "electron" }
    };
    const b = blanks[topicId] || { text: "Complete this sentence about " + topic + ".", answer: "answer" };
    return { text: b.text, difficulty, correctAnswer: b.answer };
  }

  if (type === "short_answer") {
    const prompts = {
      photosynthesis: { text: "Explain the role of chlorophyll in photosynthesis.", answer: "Chlorophyll absorbs light energy and transfers it to electrons, driving the light-dependent reactions." },
      fractions: { text: "Explain how to convert an improper fraction to a mixed number.", answer: "Divide the numerator by the denominator; the quotient is the whole number and the remainder becomes the new numerator." },
      atoms: { text: "Describe the difference between protons and electrons.", answer: "Protons are positively charged and located in the nucleus; electrons are negatively charged and orbit the nucleus." }
    };
    const p = prompts[topicId] || { text: "Short answer question about " + topic + ".", answer: "" };
    return { text: p.text, difficulty, modelAnswer: p.answer };
  }

  if (type === "scenario") {
    return {
      text: "What conclusion can be drawn from the scenario?",
      scenarioText: "A student is investigating " + topic + " and records an unexpected result. Using what you know about " + topic + ", explain what the student should do next.",
      difficulty,
      modelAnswer: "The student should check the procedure, repeat the observation, and compare the result with the expected behavior of " + topic + ".",
    };
  }

  if (type === "multi_part") {
    const parts = {
      photosynthesis: [{ text: "Name the organelle where photosynthesis takes place.", answer: "Chloroplast" }, { text: "State the two main reactants needed for photosynthesis.", answer: "Carbon dioxide and water" }],
      fractions: [{ text: "Convert 7/4 to a mixed number.", answer: "1 3/4" }, { text: "Simplify 8/12 to lowest terms.", answer: "2/3" }],
      atoms: [{ text: "What is the charge of a neutron?", answer: "Neutral (no charge)" }, { text: "Which particle determines the identity of an element?", answer: "Proton" }]
    };
    const chosen = parts[topicId] || parts.atoms;
    return { text: "Answer the following parts about " + topic + ".", difficulty, subQuestions: chosen, modelAnswer: chosen.map((p, i) => (i + 1) + ". " + p.answer).join("; ") };
  }

  if (type === "essay") {
    const prompts = {
      photosynthesis: { text: "Describe the process of photosynthesis in detail.", rubric: "Includes light-dependent reactions, Calvin cycle, reactants, products, and location in the chloroplast." },
      fractions: { text: "Explain the importance of fractions in everyday life and how to compare them.", rubric: "Includes real-world examples, equivalent fractions, and comparison strategies." },
      atoms: { text: "Describe the structure of an atom and the roles of its subatomic particles.", rubric: "Includes nucleus, protons, neutrons, electrons, charges, and locations." }
    };
    const e = prompts[topicId] || { text: "Essay question about " + topic + ".", rubric: "" };
    return { text: e.text, difficulty, rubric: e.rubric };
  }

  // multiple_choice fallback (shouldn't normally hit here — handled separately)
  return { text: "Sample question about " + topic + ".", difficulty, options: [{ label: "A", text: "Correct option", correct: true }, { label: "B", text: "Distractor 1", correct: false }, { label: "C", text: "Distractor 2", correct: false }, { label: "D", text: "Distractor 3", correct: false }] };
}

function buildSectionQuestions(type, topicId, count, demand) {
  if (type === "multiple_choice") {
    const bank = QUESTION_BANK_V2[topicId] || [];
    const easyTarget = Math.round(count * demand.easy / 100);
    const mediumTarget = Math.round(count * demand.medium / 100);
    const hardTarget = Math.max(0, count - easyTarget - mediumTarget);
    const byDiff = { Easy: bank.filter(q => q.difficulty === "Easy"), Medium: bank.filter(q => q.difficulty === "Medium"), Hard: bank.filter(q => q.difficulty === "Hard") };
    let picked = [];
    [["Easy", easyTarget], ["Medium", mediumTarget], ["Hard", hardTarget]].forEach(([diff, t]) => {
      picked = picked.concat(byDiff[diff].slice(0, t));
    });
    if (picked.length < count) {
      const usedIds = new Set(picked.map(q => q.id));
      const remaining = bank.filter(q => !usedIds.has(q.id));
      picked = picked.concat(remaining.slice(0, count - picked.length));
    }
    picked = picked.slice(0, count);
    return picked.map((q, idx) => normalizeQuestion({
      id: "q_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 1000),
      text: q.text, difficulty: q.difficulty,
      options: q.options.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt, correct: q.correct.includes(i) })),
    }));
  }
  return Array.from({ length: count }, (_, idx) => normalizeQuestion({
    id: "q_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 1000),
    ...generatePlaceholderQuestionData(type, idx, topicId),
    difficulty: generatePlaceholderQuestionData(type, idx, topicId).difficulty,
  }));
}

const TEACHERS_ADMIN = [
  { name: "Meenakshi Parameswaran", subject: "Mathematics", classes: 5, avgAttendance: 91, rating: 4.8 },
  { name: "James Okafor", subject: "Science", classes: 4, avgAttendance: 88, rating: 4.6 },
  { name: "Priya Nair", subject: "English", classes: 6, avgAttendance: 93, rating: 4.9 },
  { name: "David Kim", subject: "Social Studies", classes: 4, avgAttendance: 85, rating: 4.4 },
  { name: "Laura Chen", subject: "Computer Science", classes: 3, avgAttendance: 95, rating: 4.9 },
];

const STANDARDS_OPTIONS = [
  { code: "8.EE.C.7", label: "8.EE.C.7 — Solve linear equations in one variable" },
  { code: "8.EE.C.8", label: "8.EE.C.8 — Solve systems of two linear equations" },
  { code: "8.F.A.2", label: "8.F.A.2 — Compare properties of two functions" },
  { code: "7.G.B.5", label: "7.G.B.5 — Angle relationships in geometric figures" },
];

const DEFAULT_PLAN = {
  topic: "Solving Linear Equations with Variables on Both Sides",
  className: "Grade 8 — Section A",
  subject: "Mathematics",
  duration: "45",
  standards: ["8.EE.C.7"],
  objective: "Students will be able to solve linear equations with variables on both sides with at least 80% accuracy on independent practice.",
  materials: ["Whiteboard & markers", "Practice worksheet (printable)", "Exit ticket slips", "Calculator (optional)"],
  warmup: "5 min — Quick recap: 3 review problems from the previous lesson, solved individually then checked in pairs.",
  instruction: "15 min — Direct instruction with worked examples on the board; think-aloud modeling of each solution step.",
  activity: "18 min — Small-group problem set (mixed-ability groups of 3); circulate to provide targeted support.",
  assessment: "7 min — 4-question exit ticket covering today's objective; used to group students for tomorrow's warm-up.",
  homework: "Practice worksheet, problems 1–10, due next class.",
};

const SAVED_LIBRARY_SEED = [
  { id: "lib1", topic: "Factoring Polynomials — Intro", className: "Grade 9 — Section C", subject: "Algebra II", duration: "45", savedOn: "Jul 6" },
  { id: "lib2", topic: "Geometry: Angle Pair Relationships", className: "Grade 7 — Section A", subject: "Mathematics", duration: "40", savedOn: "Jul 3" },
  { id: "lib3", topic: "Quadratic Functions — Graphing Basics", className: "Grade 8 — Section B", subject: "Mathematics", duration: "45", savedOn: "Jun 28" },
];

const DIFFERENTIATE_CONTENT = {
  support: "Provide a worked-example reference sheet and sentence starters. Reduce problem set to 6 items with scaffolded steps shown. Pair with a peer partner for the group activity.",
  onlevel: "Standard problem set as planned. Encourage students to explain their reasoning verbally before writing the final answer.",
  challenge: "Add 2 multi-step word problems requiring the equation to be set up from context. Ask students to create and solve their own equation for a partner to check.",
};

// ---------- Chat widget data ----------
const CHAT_TOPICS = {
  w_fractions: { title: "Fractions: Adding & Subtracting Unlike Denominators", grade: "Grade 5", subject: "Math", standard: "CCSS.MATH.5.NF.1", duration: "20 min", count: 10,
    byLevel: { remedial: "Uses visual fraction bars and denominators limited to 2, 4, and 8 for extra scaffolding.", onlevel: "Standard 10-question set mixing halves, thirds, fourths, and sixths.", gifted: "Adds unlike denominators up to twelfths plus one multi-step word problem." } },
  w_photo: { title: "Photosynthesis: Inputs, Outputs & Chloroplast Structure", grade: "Grade 7", subject: "Science", standard: "NGSS.MS-LS1-6", duration: "25 min", count: 12,
    byLevel: { remedial: "Includes a labeled diagram word bank and simplified vocabulary.", onlevel: "Standard set covering the light and dark reactions with short-answer prompts.", gifted: "Adds a chemical-equation balancing task and a compare/contrast with cellular respiration." } },
  w_revolution: { title: "Causes of the American Revolution", grade: "Grade 8", subject: "History", standard: "C3.D2.His.1.6-8", duration: "30 min", count: 8,
    byLevel: { remedial: "Uses a guided timeline with sentence starters for each cause.", onlevel: "Standard set analyzing 4 primary-source excerpts.", gifted: "Adds a DBQ-style essay prompt weighing economic vs. political causes." } },
};
const CHAT_EXIT_TICKETS = {
  et_fractions: { title: "Fractions – Exit Ticket", className: "Grade 5 Math", questions: ["Simplify 6/8 to lowest terms.", "Add 1/3 + 1/6 and show your work.", "Rate your confidence with today's lesson (1–5)."] },
  et_photo: { title: "Photosynthesis – Exit Ticket", className: "Grade 7 Science", questions: ["Name the two main inputs of photosynthesis.", "What organelle is photosynthesis carried out in?", "One thing that's still unclear to you?"] },
};
const CHAT_QUESTIONS = {
  q_late: { answer: "Riverside's policy allows one late submission per unit with a 10% deduction, unless the student has an active IEP/504 accommodation extending deadlines [1]. Extensions beyond 3 days require department-head approval.",
    source: { name: "Riverside MS – Grading & Late Work Policy.pdf", snippet: "\"Students may submit one late assignment per grading period at a 10% point deduction...\"", updated: "Reviewed Aug 2025" } },
  q_iep: { answer: "For students with an active IEP, extended time (typically 1.5x) and reduced-distraction settings apply automatically to all assessments unless the IEP specifies otherwise [1]. Case managers must be copied on any modified assignment.",
    source: { name: "Special Education – IEP Classroom Accommodations Guide.pdf", snippet: "\"Extended time accommodations default to time-and-a-half unless otherwise noted in the student's IEP...\"", updated: "Reviewed Jan 2026" } },
  q_trip: { answer: "Field trip permission forms and the trip request packet must be submitted to the front office at least 10 school days before the trip date, with a signed risk-assessment form attached [1].",
    source: { name: "Riverside MS – Field Trip Procedures.pdf", snippet: "\"All trip requests require submission 10 school days in advance, including a completed risk-assessment form...\"", updated: "Reviewed Sep 2025" } },
};
const CHAT_EMAILS = {
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
};
const CHAT_ROOT_CHIPS = [
  { id: "worksheet", label: "📝 Generate Worksheet" },
  { id: "grades", label: "📊 Summarize Grades" },
  { id: "email", label: "📧 Draft Parent Email" },
  { id: "exitticket", label: "🧩 Create Exit Ticket" },
  { id: "ask", label: "💬 Ask a Question" },
];
const CHAT_GREETING = "Hi Miss Priya 👋 I'm your teaching assistant. I can help you plan a lesson, draft a parent email, create an exit ticket, or answer school policy questions. What would you like to do?";

class Component extends DCLogic {
  state = {
    view: "dashboard",
    role: "teacher",
    aiDraftOpen: false,
    taskDone: {},

    chatOpen: false,
    chatMessages: [
      { id: "m1", from: "bot", kind: "text", text: CHAT_GREETING, chips: CHAT_ROOT_CHIPS, time: "9:14 AM" },
    ],
    diffLevel: "onlevel",
    toneLevel: "professional",
    kbSourcesOpen: false,

    schoolConfig: {
      timetable: TIMETABLE_SEED.map(x => ({ ...x })),
      curriculum: CURRICULUM.map(x => ({ ...x, topics: (x.topics || []).map(t => ({ ...t })) })),
      examSchedule: EXAMS.map(x => ({ ...x })),
      masterTimetable: MASTER_TIMETABLE.map(x => ({ ...x })),
      academicCalendar: ACADEMIC_CALENDAR_SEED.map(x => ({ ...x })),
      assignments: ASSIGNMENTS_SEED.map(a => ({ ...a, submissions: a.submissions.map(s => ({ ...s })) })),
      assessmentBank: ASSESSMENT_BANK_SEED.map(x => ({ ...x })),
      announcements: ANNOUNCEMENTS.map(x => ({ ...x })),
    },
    okfExpandedChapters: {},
    notifyModal: null,
    resourceFlash: null,
    settingsTab: "timetable",
    settingsModal: null,
    globalContext: { year: "2026–27", sectionId: "sec_8a" },
    curriculumFilters: { year: "2026–27", classId: "all", search: "" },
    okfAlignmentFilters: { classId: "all", subject: "all", topicId: "all" },
    gradebookFilters: { grade: "all", section: "all" },
    curriculumExpanded: {},
    curriculumFlash: null,
    bulkUploadOpen: false,
    bulkUploadText: "",
    timetableFilters: { year: "2026–27", sectionId: "sec_8a", teacherName: "Meenakshi Parameswaran" },
    examFilters: { year: "2026–27", sectionId: "all" },
    timetableSubView: "class",
    timetableFlash: null,
    timetableBulkOpen: false,
    timetableBulkText: "",
    examExpanded: {},
    homeworkExpanded: {},
    homeworkFlash: null,
    newAssignmentModalOpen: false,
    newAssignmentForm: { title: "", classId: "c1", subject: "Mathematics", due: "", totalPoints: 20 },
    assignFromBankModal: null,
    abBuilderTab: "build",
    abClassId: "c1",
    abTerm: "Term 2",
    abSaveFlash: null,
    okfImportOpen: false,
    okfImportExpanded: {},
    okfImportSelectedIds: {},

    lessonSubTab: "generator",
    lessonFlash: null,    planTopic: "Solving Linear Equations with Variables on Both Sides",
    planClassId: "c1",
    planDuration: "45",
    planStandards: ["8.EE.C.7"],
    isGenerating: false,
    generatedPlan: DEFAULT_PLAN,
    differentiateOpen: false,
    differentiateTier: "onlevel",
    savedLibrary: SAVED_LIBRARY_SEED,

    abTopicId: "photosynthesis",
    abGrade: "8th Grade Students",
    abObjectiveOpen: false,
    abObjectiveText: "",
    abSections: [],
    abSelectedSectionId: null,
    abDemandDropdownSectionId: null,
    abManageOpen: false,
    abManageSectionId: null,
    abEditingQuestionId: null,
    abEditorText: "",
    abEditorDifficulty: "Easy",
    abEditorExplanation: "",
    abEditorOptions: [],
    abEditorPairs: [],
    abEditorCorrectAnswer: "",
    abEditorModelAnswer: "",
    abEditorScenarioText: "",
    abEditorSubQuestions: [],
    abDiagOpen: false,
    abGenerating: false,
  };

  toggleAiDraft = () => this.setState(s => ({ aiDraftOpen: !s.aiDraftOpen }));
  toggleTask = (id) => () => this.setState(s => ({ taskDone: { ...s.taskDone, [id]: !s.taskDone[id] } }));

  componentDidMount() {
    try {
      const saved = JSON.parse(localStorage.getItem("tpp_global_context") || "null");
      if (saved && saved.year && saved.sectionId) this.syncGlobalContext(saved.year, saved.sectionId);
    } catch (e) { /* ignore malformed storage */ }
  }
  // Single source of truth for "which class/section + year am I looking at" — kept in sync
  // across Syllabus Map, Timetable, and Exam Schedule, and persisted so it survives navigation/reload.
  syncGlobalContext(year, sectionId) {
    localStorage.setItem("tpp_global_context", JSON.stringify({ year, sectionId }));
    this.setState(s => {
      const classesInSection = CLASSES.filter(c => c.sectionId === sectionId).map(c => c.id);
      const classIdStillValid = classesInSection.includes(s.curriculumFilters.classId);
      return {
        globalContext: { year, sectionId },
        curriculumFilters: { ...s.curriculumFilters, year, classId: classIdStillValid ? s.curriculumFilters.classId : "all" },
        timetableFilters: { ...s.timetableFilters, year, sectionId },
        examFilters: { ...s.examFilters, year, sectionId: s.examFilters.sectionId === "all" ? "all" : sectionId },
      };
    });
  }
  handleGlobalContextChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    const next = { year: this.state.globalContext.year, sectionId: this.state.globalContext.sectionId, [field]: value };
    this.syncGlobalContext(next.year, next.sectionId);
  };

  setLessonSubTab = (tab) => () => this.setState({ lessonSubTab: tab });
  handleLessonSubTabClick = (e) => this.setState({ lessonSubTab: e.currentTarget.getAttribute("data-tab") });
  handleDifferentiateTierClick = (e) => this.setState({ differentiateTier: e.currentTarget.getAttribute("data-tier") });
  handleStandardClick = (e) => {
    const code = e.currentTarget.getAttribute("data-code");
    this.setState(s => ({
      planStandards: s.planStandards.includes(code) ? s.planStandards.filter(c => c !== code) : [...s.planStandards, code],
    }));
  };
  handleTaskClick = (e) => {
    const id = e.currentTarget.getAttribute("data-taskid");
    this.setState(s => ({ taskDone: { ...s.taskDone, [id]: !s.taskDone[id] } }));
  };
  setPlanTopic = (e) => this.setState({ planTopic: e.target.value });
  setPlanClassId = (e) => this.setState({ planClassId: e.target.value });
  setPlanDuration = (e) => this.setState({ planDuration: e.target.value });
  toggleStandard = (code) => () => this.setState(s => ({
    planStandards: s.planStandards.includes(code) ? s.planStandards.filter(c => c !== code) : [...s.planStandards, code],
  }));
  toggleDifferentiate = () => this.setState(s => ({ differentiateOpen: !s.differentiateOpen }));
  setDifferentiateTier = (tier) => () => this.setState({ differentiateTier: tier });

  generatePlan = () => {
    this.setState({ isGenerating: true });
    const topic = this.state.planTopic || "Today's Lesson";
    const cls = CLASSES.find(c => c.id === this.state.planClassId);
    setTimeout(() => {
      this.setState({
        isGenerating: false,
        generatedPlan: {
          topic,
          className: cls ? cls.name : "Class",
          subject: cls ? cls.subject : "Mathematics",
          duration: this.state.planDuration,
          standards: [...this.state.planStandards],
          objective: `Students will be able to ${topic.charAt(0).toLowerCase() + topic.slice(1)} with at least 80% accuracy on independent practice.`,
          materials: ["Whiteboard & markers", "Practice worksheet (printable)", "Exit ticket slips", "Calculator (optional)"],
          warmup: "5 min — Quick recap: 3 review problems from the previous lesson, solved individually then checked in pairs.",
          instruction: "15 min — Direct instruction with worked examples on the board; think-aloud modeling of each solution step.",
          activity: "18 min — Small-group problem set (mixed-ability groups of 3); circulate to provide targeted support.",
          assessment: "7 min — 4-question exit ticket covering today's objective; used to group students for tomorrow's warm-up.",
          homework: "Practice worksheet, problems 1–10, due next class.",
        },
      });
    }, 900);
  };

  saveToLibrary = () => {
    const p = this.state.generatedPlan;
    if (!p) return;
    this.setState(s => ({
      savedLibrary: [{ ...p, savedOn: "Just now", id: "lib" + Date.now() }, ...s.savedLibrary],
      lessonSubTab: "library",
    }));
  };

  toggleAbObjective = () => this.setState(s => ({ abObjectiveOpen: !s.abObjectiveOpen }));
  setAbObjectiveText = (e) => this.setState({ abObjectiveText: e.target.value });
  setAbTopic = (e) => {
    const topicId = e.target.value;
    this.setState(s => ({
      abTopicId: topicId,
      abSections: s.abSections.map(sec => ({ ...sec, questions: buildSectionQuestions(sec.type, topicId, sec.count, sec.demand) })),
    }));
  };
  setAbGrade = (e) => this.setState({ abGrade: e.target.value });

  handleAddSection = (e) => {
    const type = e.currentTarget.getAttribute("data-type");
    const demand = { name: "Balanced", easy: 30, medium: 50, hard: 20 };
    const id = "sec_" + Date.now();
    const questions = buildSectionQuestions(type, this.state.abTopicId, 5, demand);
    const section = { id, type, count: 5, pointsPer: 2, demand, questions };
    this.setState(s => ({ abSections: [...s.abSections, section], abSelectedSectionId: id }));
  };

  viewOkfChapterFromSyllabus = (e) => {
    e.stopPropagation();
    const chapterId = e.currentTarget.getAttribute("data-chapter-id");
    this.setState(s => ({ view: "resources", okfExpandedChapters: { ...s.okfExpandedChapters, [chapterId]: true } }));
  };
  openOkfImport = () => this.setState({ okfImportOpen: true, okfImportExpanded: {}, okfImportSelectedIds: {} });
  closeOkfImport = () => this.setState({ okfImportOpen: false });
  toggleOkfImportChapter = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ okfImportExpanded: { ...s.okfImportExpanded, [id]: !s.okfImportExpanded[id] } }));
  };
  toggleOkfImportQuestion = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ okfImportSelectedIds: { ...s.okfImportSelectedIds, [id]: !s.okfImportSelectedIds[id] } }));
  };
  confirmOkfImport = () => {
    const selectedIds = this.state.okfImportSelectedIds;
    const picked = [];
    OKF_QUESTION_BANK.chapters.forEach(ch => ch.topics.forEach(tp => tp.questions.forEach(q => {
      if (selectedIds[q.id]) picked.push(q);
    })));
    if (!picked.length) return;
    const questions = picked.map((q, idx) => {
      if (q.type === "MCQ") {
        return normalizeQuestion({
          id: "q_okf_" + Date.now() + "_" + idx,
          text: q.text, difficulty: "Medium", okfRef: q.okf_ref, marks: q.marks,
          options: q.options.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt, correct: i === q.correctIndex })),
        });
      }
      // Short Answer / Long Answer / Proof — all render as a correct-answer/model-answer question
      return normalizeQuestion({
        id: "q_okf_" + Date.now() + "_" + idx,
        text: q.text, difficulty: "Medium", okfRef: q.okf_ref, marks: q.marks,
        modelAnswer: q.type + " — model solution to be reviewed by teacher before publishing.",
      });
    });
    const totalMarks = picked.reduce((a, q) => a + q.marks, 0);
    const id = "sec_okf_" + Date.now();
    const section = { id, type: "okf_import", count: questions.length, pointsPer: Math.round(totalMarks / questions.length) || 1, demand: { name: "OKF Curriculum", easy: 0, medium: 100, hard: 0 }, questions };
    this.setState(s => ({ abSections: [...s.abSections, section], abSelectedSectionId: id, okfImportOpen: false }));
  };
  toggleAbSectionSelect = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ abSelectedSectionId: s.abSelectedSectionId === id ? null : id }));
  };

  removeAbSection = (e) => {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({
      abSections: s.abSections.filter(sec => sec.id !== id),
      abSelectedSectionId: s.abSelectedSectionId === id ? null : s.abSelectedSectionId,
    }));
  };

  changeSectionCount = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const delta = parseInt(e.currentTarget.getAttribute("data-delta"), 10);
    const topicId = this.state.abTopicId;
    this.setState(s => ({
      abSections: s.abSections.map(sec => {
        if (sec.id !== id) return sec;
        const count = Math.max(1, Math.min(30, sec.count + delta));
        return { ...sec, count, questions: buildSectionQuestions(sec.type, topicId, count, sec.demand) };
      }),
    }));
  };

  changeSectionPoints = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const delta = parseInt(e.currentTarget.getAttribute("data-delta"), 10);
    this.setState(s => ({
      abSections: s.abSections.map(sec => sec.id === id ? { ...sec, pointsPer: Math.max(1, Math.min(20, sec.pointsPer + delta)) } : sec),
    }));
  };

  toggleSectionDemandDropdown = (e) => {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ abDemandDropdownSectionId: s.abDemandDropdownSectionId === id ? null : id }));
  };

  pickSectionDemand = (e) => {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    const key = e.currentTarget.getAttribute("data-preset");
    const preset = DEMAND_PRESETS.find(p => p.key === key);
    if (!preset) return;
    const topicId = this.state.abTopicId;
    this.setState(s => ({
      abDemandDropdownSectionId: null,
      abSections: s.abSections.map(sec => sec.id === id
        ? { ...sec, demand: { name: preset.name, easy: preset.easy, medium: preset.medium, hard: preset.hard }, questions: buildSectionQuestions(sec.type, topicId, sec.count, preset) }
        : sec),
    }));
  };

  repickSectionQuestions = (e) => {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    const topicId = this.state.abTopicId;
    this.setState(s => ({
      abSections: s.abSections.map(sec => sec.id === id
        ? { ...sec, questions: buildSectionQuestions(sec.type, topicId, sec.count, sec.demand) }
        : sec),
    }));
  };

  getAbSection = (id) => this.state.abSections.find(s => s.id === id);

  openManageQuestions = (e) => {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    this.setState({ abManageOpen: true, abManageSectionId: id, abEditingQuestionId: null });
    this.resetEditorForm(id);
  };
  closeManageQuestions = () => this.setState({ abManageOpen: false, abManageSectionId: null, abEditingQuestionId: null });

  resetEditorForm = (sectionId) => {
    const section = this.getAbSection(sectionId);
    const meta = section ? (SECTION_TYPE_META[section.type] || {}) : {};
    this.setState({
      abEditorText: "", abEditorDifficulty: "Easy", abEditorExplanation: "",
      abEditorOptions: meta.hasOptions ? Array.from({ length: meta.defaultOptions || 4 }, (_, i) => ({ text: meta.fixed ? (i === 0 ? "True" : "False") : "", correct: false })) : [],
      abEditorPairs: meta.hasPairs ? Array.from({ length: meta.defaultPairs || 4 }, () => ({ left: "", right: "" })) : [],
      abEditorCorrectAnswer: "", abEditorModelAnswer: "", abEditorScenarioText: "",
      abEditorSubQuestions: meta.hasSubQuestions ? Array.from({ length: 2 }, () => ({ text: "", answer: "" })) : [],
    });
  };

  setEditorText = (e) => this.setState({ abEditorText: e.target.value });
  setEditorDifficulty = (e) => this.setState({ abEditorDifficulty: e.target.value });
  setEditorExplanation = (e) => this.setState({ abEditorExplanation: e.target.value });
  setEditorCorrectAnswer = (e) => this.setState({ abEditorCorrectAnswer: e.target.value });
  setEditorModelAnswer = (e) => this.setState({ abEditorModelAnswer: e.target.value });
  setEditorScenarioText = (e) => this.setState({ abEditorScenarioText: e.target.value });

  handleOptionTextChange = (e) => {
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
    const val = e.target.value;
    this.setState(s => ({ abEditorOptions: s.abEditorOptions.map((o, i) => i === idx ? { ...o, text: val } : o) }));
  };
  handleOptionCorrectToggle = (e) => {
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
    const section = this.getAbSection(this.state.abManageSectionId);
    const meta = section ? (SECTION_TYPE_META[section.type] || {}) : {};
    this.setState(s => ({
      abEditorOptions: s.abEditorOptions.map((o, i) => {
        if (meta.singleCorrect) return { ...o, correct: i === idx };
        return i === idx ? { ...o, correct: !o.correct } : o;
      }),
    }));
  };
  addOptionRow = () => this.setState(s => ({ abEditorOptions: [...s.abEditorOptions, { text: "", correct: false }] }));

  handlePairChange = (e) => {
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
    const side = e.currentTarget.getAttribute("data-side");
    const val = e.target.value;
    this.setState(s => ({ abEditorPairs: s.abEditorPairs.map((p, i) => i === idx ? { ...p, [side]: val } : p) }));
  };
  addPairRow = () => this.setState(s => ({ abEditorPairs: [...s.abEditorPairs, { left: "", right: "" }] }));

  handleSubQChange = (e) => {
    const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
    const field = e.currentTarget.getAttribute("data-field");
    const val = e.target.value;
    this.setState(s => ({ abEditorSubQuestions: s.abEditorSubQuestions.map((sq, i) => i === idx ? { ...sq, [field]: val } : sq) }));
  };
  addSubQRow = () => this.setState(s => ({ abEditorSubQuestions: [...s.abEditorSubQuestions, { text: "", answer: "" }] }));

  editEditorQuestion = (e) => {
    const qid = e.currentTarget.getAttribute("data-qid");
    const section = this.getAbSection(this.state.abManageSectionId);
    if (!section) return;
    const q = section.questions.find(x => x.id === qid);
    if (!q) return;
    this.setState({
      abEditingQuestionId: qid,
      abEditorText: q.text || "",
      abEditorDifficulty: q.difficulty || "Easy",
      abEditorExplanation: q.explanation || "",
      abEditorOptions: q.options ? q.options.map(o => ({ text: o.text, correct: o.correct })) : [],
      abEditorPairs: q.pairs ? q.pairs.map(p => ({ ...p })) : [],
      abEditorCorrectAnswer: q.correctAnswer || "",
      abEditorModelAnswer: q.modelAnswer || q.rubric || "",
      abEditorScenarioText: q.scenarioText || "",
      abEditorSubQuestions: q.subQuestions ? q.subQuestions.map(sq => ({ ...sq })) : [],
    });
  };

  deleteEditorQuestion = (e) => {
    const qid = e.currentTarget.getAttribute("data-qid");
    const sectionId = this.state.abManageSectionId;
    this.setState(s => ({
      abSections: s.abSections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const questions = sec.questions.filter(q => q.id !== qid);
        return { ...sec, questions, count: questions.length || sec.count };
      }),
    }));
  };

  saveEditorQuestion = () => {
    const sectionId = this.state.abManageSectionId;
    const section = this.getAbSection(sectionId);
    if (!section || !this.state.abEditorText.trim()) return;
    const meta = SECTION_TYPE_META[section.type] || {};
    let raw = { text: this.state.abEditorText.trim(), difficulty: this.state.abEditorDifficulty, explanation: this.state.abEditorExplanation.trim() };
    if (meta.hasOptions) {
      raw.options = this.state.abEditorOptions.filter(o => o.text.trim()).map((o, i) => ({ label: String.fromCharCode(65 + i), text: o.text.trim(), correct: o.correct }));
    } else if (meta.hasPairs) {
      raw.pairs = this.state.abEditorPairs.filter(p => p.left.trim() && p.right.trim());
    } else if (meta.hasCorrectAnswer) {
      raw.correctAnswer = this.state.abEditorCorrectAnswer.trim();
    } else if (meta.hasSubQuestions) {
      raw.subQuestions = this.state.abEditorSubQuestions.filter(sq => sq.text.trim());
      raw.modelAnswer = this.state.abEditorModelAnswer.trim();
    } else if (meta.hasScenarioText) {
      raw.scenarioText = this.state.abEditorScenarioText.trim();
      raw.modelAnswer = this.state.abEditorModelAnswer.trim();
    } else if (meta.hasRubric) {
      raw.rubric = this.state.abEditorModelAnswer.trim();
    } else if (meta.hasModelAnswer) {
      raw.modelAnswer = this.state.abEditorModelAnswer.trim();
    }
    const editingId = this.state.abEditingQuestionId;
    const question = normalizeQuestion({ id: editingId || ("q_" + Date.now()), ...raw });
    this.setState(s => ({
      abSections: s.abSections.map(sec => {
        if (sec.id !== sectionId) return sec;
        let questions;
        if (editingId) {
          questions = sec.questions.map(q => q.id === editingId ? question : q);
        } else {
          questions = [...sec.questions, question];
        }
        return { ...sec, questions, count: questions.length };
      }),
    }));
    this.resetEditorForm(sectionId);
  };

  openAbDiag = () => this.setState({ abDiagOpen: true });
  closeAbDiag = () => this.setState({ abDiagOpen: false });

  studentsForClass(classId) { return STUDENTS.filter(s => s.classId === classId); }

  setAbBuilderTab = (e) => this.setState({ abBuilderTab: e.currentTarget.getAttribute("data-tab") });
  setAbClassId = (e) => this.setState({ abClassId: e.target.value });
  setAbTerm = (e) => this.setState({ abTerm: e.target.value });

  // "Generate" now means finalize + persist the assessment to the school's Assessment Bank
  // (this used to be a stub that silently added another section — now it truly saves).
  generateAssessment = () => {
    this.setState({ abGenerating: true });
    setTimeout(() => {
      const s = this.state;
      const cls = CLASSES.find(c => c.id === s.abClassId);
      const totalPoints = s.abSections.reduce((a, sec) => a + sec.count * sec.pointsPer, 0);
      const questionCount = s.abSections.reduce((a, sec) => a + sec.count, 0);
      const topicLabel = (TOPIC_OPTIONS.find(t => t.id === s.abTopicId) || {}).label || "Assessment";
      const bankEntry = {
        id: "bank_" + Date.now(),
        title: topicLabel.replace(/^.*—\s*/, "") + " — Assessment",
        classId: s.abClassId, subject: cls ? cls.subject : "", term: s.abTerm, academicYear: this.state.globalContext.year,
        totalPoints, sectionCount: s.abSections.length, questionCount, createdOn: "Just now",
      };
      this.setState(prev => ({
        abGenerating: false,
        schoolConfig: { ...prev.schoolConfig, assessmentBank: [bankEntry, ...prev.schoolConfig.assessmentBank] },
        abBuilderTab: "saved",
        abSaveFlash: `Saved "${bankEntry.title}" to your Assessment Bank.`,
      }));
      setTimeout(() => this.setState({ abSaveFlash: null }), 4000);
    }, 900);
  };

  openAssignFromBank = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const entry = this.state.schoolConfig.assessmentBank.find(b => b.id === id);
    if (!entry) return;
    this.setState({ assignFromBankModal: { bankId: id, classId: entry.classId, due: "", totalPoints: entry.totalPoints } });
  };
  closeAssignFromBank = () => this.setState({ assignFromBankModal: null });
  handleAssignFromBankFieldChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => ({ assignFromBankModal: { ...s.assignFromBankModal, [field]: value } }));
  };
  confirmAssignFromBank = () => {
    const modal = this.state.assignFromBankModal;
    const entry = this.state.schoolConfig.assessmentBank.find(b => b.id === modal.bankId);
    if (!entry || !modal.due) return;
    const cls = CLASSES.find(c => c.id === modal.classId);
    const submissions = this.studentsForClass(modal.classId).map(st => ({ studentId: st.id, status: "not_started", submittedOn: "", score: null, feedback: "" }));
    const assignment = {
      id: "a_" + Date.now(), title: entry.title, classId: modal.classId, subject: cls ? cls.subject : entry.subject,
      term: entry.term, academicYear: entry.academicYear, due: modal.due, totalPoints: Number(modal.totalPoints) || entry.totalPoints,
      status: "active", sourceAssessmentId: entry.id, publishedToStudents: true, createdOn: "Just now", submissions,
    };
    this.setState(s => ({
      schoolConfig: { ...s.schoolConfig, assignments: [assignment, ...s.schoolConfig.assignments] },
      assignFromBankModal: null,
    }));
    this.flashHomeworkMsg(`Assigned "${entry.title}" to ${cls ? cls.name : "class"} — published to students.`);
  };

  openNewAssignmentModal = () => this.setState({ newAssignmentModalOpen: true, newAssignmentForm: { title: "", classId: this.state.globalContext.sectionId ? (CLASSES.find(c => c.sectionId === this.state.globalContext.sectionId) || CLASSES[0]).id : "c1", subject: "Mathematics", due: "", totalPoints: 20 } });
  closeNewAssignmentModal = () => this.setState({ newAssignmentModalOpen: false });
  handleNewAssignmentFieldChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => {
      const form = { ...s.newAssignmentForm, [field]: value };
      if (field === "classId") { const cls = CLASSES.find(c => c.id === value); if (cls) form.subject = cls.subject; }
      return { newAssignmentForm: form };
    });
  };
  submitNewAssignment = () => {
    const f = this.state.newAssignmentForm;
    if (!f.title.trim() || !f.due) return;
    const submissions = this.studentsForClass(f.classId).map(st => ({ studentId: st.id, status: "not_started", submittedOn: "", score: null, feedback: "" }));
    const assignment = {
      id: "a_" + Date.now(), title: f.title, classId: f.classId, subject: f.subject, term: this.state.globalContext.year ? "Term 2" : "Term 2",
      academicYear: this.state.globalContext.year, due: f.due, totalPoints: Number(f.totalPoints) || 20,
      status: "active", sourceAssessmentId: null, publishedToStudents: true, createdOn: "Just now", submissions,
    };
    this.setState(s => ({
      schoolConfig: { ...s.schoolConfig, assignments: [assignment, ...s.schoolConfig.assignments] },
      newAssignmentModalOpen: false,
    }));
    this.flashHomeworkMsg(`"${f.title}" published to students.`);
  };

  flashHomeworkMsg(msg) {
    this.setState({ homeworkFlash: msg });
    setTimeout(() => this.setState({ homeworkFlash: null }), 3500);
  }
  toggleOkfChapter = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ okfExpandedChapters: { ...s.okfExpandedChapters, [id]: !s.okfExpandedChapters[id] } }));
  };
  flashResourceMsg(msg) {
    this.setState({ resourceFlash: msg });
    setTimeout(() => this.setState({ resourceFlash: null }), 3500);
  }
  openNotifyModal = (e) => {
    const resourceId = e.currentTarget.getAttribute("data-resource-id");
    const title = e.currentTarget.getAttribute("data-title");
    const okfRef = e.currentTarget.getAttribute("data-okf-ref");
    this.setState({ notifyModal: { resourceId, title, okfRef, classId: this.state.globalContext.sectionId ? (CLASSES.find(c => c.sectionId === this.state.globalContext.sectionId) || CLASSES[0]).id : "c1", note: `New resource available: "${title}" — please review before the next class/quiz.` } });
  };
  closeNotifyModal = () => this.setState({ notifyModal: null });
  handleNotifyFieldChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => ({ notifyModal: { ...s.notifyModal, [field]: value } }));
  };
  submitNotify = () => {
    const m = this.state.notifyModal;
    const cls = CLASSES.find(c => c.id === m.classId);
    const announcement = {
      id: "n_" + Date.now(),
      title: `New Learning Resource: ${m.title}`,
      body: m.note,
      date: "Just now",
      audience: "Students & Parents",
      className: cls ? cls.name : "",
    };
    this.setState(s => ({
      schoolConfig: { ...s.schoolConfig, announcements: [announcement, ...s.schoolConfig.announcements] },
      notifyModal: null,
    }));
    this.flashResourceMsg(`Notified ${cls ? cls.name : "class"} about "${m.title}".`);
  };
  toggleHomeworkExpanded = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ homeworkExpanded: { ...s.homeworkExpanded, [id]: !s.homeworkExpanded[id] } }));
  };
  handleScoreChange = (e) => {
    const assignmentId = e.currentTarget.getAttribute("data-assignment-id");
    const studentId = e.currentTarget.getAttribute("data-student-id");
    const value = e.currentTarget.value;
    this.setState(s => ({
      schoolConfig: {
        ...s.schoolConfig,
        assignments: s.schoolConfig.assignments.map(a => {
          if (a.id !== assignmentId) return a;
          const submissions = a.submissions.map(sub => sub.studentId === studentId ? { ...sub, score: value === "" ? null : Number(value) } : sub);
          const allGraded = submissions.filter(sub => sub.status === "submitted" || sub.status === "late").every(sub => sub.score != null) && submissions.some(sub => sub.status === "submitted" || sub.status === "late");
          return { ...a, submissions, status: allGraded ? "graded" : a.status === "graded" ? "closed" : a.status };
        }),
      },
    }));
  };
  submissionStatusStyle(status) {
    const map = {
      not_started: { bg: "#F1F5F9", color: "#64748B", label: "Not Started" },
      submitted: { bg: "#DCFCE7", color: "#15803D", label: "Submitted" },
      late: { bg: "#FEF3C7", color: "#B45309", label: "Late" },
      missing: { bg: "#FEE2E2", color: "#DC2626", label: "Missing" },
    };
    return map[status] || map.not_started;
  }

  stopPropagationHandler = (e) => e.stopPropagation();

  makeNavClick = (key) => () => this.setState({ view: key });
  handleNavClick = (e) => {
    const key = e.currentTarget.getAttribute("data-navkey");
    if (key) this.setState({ view: key });
  };

  eventDotStyle(type) {
    const colors = { exam: "#DC2626", meeting: "#0284C7", class: "#16332B", deadline: "#F59E0B", holiday: "#16A34A" };
    return { width: "8px", height: "8px", borderRadius: "50%", background: colors[type] || "#9CA3AF" };
  }
  eventBadgeStyle(type) {
    const colors = { exam: "#DC2626", meeting: "#0284C7", class: "#16332B", deadline: "#F59E0B", holiday: "#16A34A" };
    const c = colors[type] || "#6B7280";
    return { fontSize: "13px", fontWeight: 600, color: c, background: c + "1A", padding: "3px 8px", borderRadius: "999px", textTransform: "capitalize" };
  }
  priorityDotStyle(p) {
    const colors = { high: "#DC2626", medium: "#F59E0B", low: "#16A34A" };
    return { width: "7px", height: "7px", borderRadius: "50%", background: colors[p] || "#9CA3AF" };
  }
  statusBadgeStyle(status) {
    const map = { "on-track": ["#16A34A", "#F0FDF4"], "at-risk": ["#DC2626", "#FEF2F2"] };
    const [c, bg] = map[status] || ["#6B7280", "#F9FAFB"];
    return { fontSize: "13px", fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: "999px", textTransform: "capitalize", whiteSpace: "nowrap" };
  }
  assignmentStatusStyle(status) {
    const map = { active: ["#0284C7", "#F0F9FF"], closed: ["#6B7280", "#F9FAFB"], graded: ["#16A34A", "#F0FDF4"] };
    const [c, bg] = map[status] || ["#6B7280", "#F9FAFB"];
    return { fontSize: "13px", fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: "999px", textTransform: "capitalize" };
  }
  behaviorBadgeStyle(type) {
    return type === "positive"
      ? { fontSize: "13px", fontWeight: 600, color: "#16A34A", background: "#F0FDF4", padding: "3px 9px", borderRadius: "999px" }
      : { fontSize: "13px", fontWeight: 600, color: "#DC2626", background: "#FEF2F2", padding: "3px 9px", borderRadius: "999px" };
  }
  barFillStyle(pct, color) {
    return { width: pct + "%", height: "100%", background: color || "#16332B", borderRadius: "999px" };
  }
  // ---------- Chat widget ----------
  chatIdSeq = 2;
  chatClockMin = 15;
  msgsRef = React.createRef();

  nextChatId() { return "m" + (this.chatIdSeq++); }
  nextChatTime() {
    const totalMin = this.chatClockMin++;
    const hour = 9 + Math.floor(totalMin / 60);
    const min = totalMin % 60;
    return hour + ":" + String(min).padStart(2, "0") + " AM";
  }
  segStyle(active) {
    return active
      ? "flex:1; text-align:center; padding:7px 4px; border-radius:7px; font-size:12.5px; font-weight:700; cursor:pointer; background:#3F6E62; color:#fff;"
      : "flex:1; text-align:center; padding:7px 4px; border-radius:7px; font-size:12.5px; font-weight:600; cursor:pointer; background:transparent; color:#374151;";
  }

  toggleChat = () => this.setState(s => ({ chatOpen: !s.chatOpen }));

  handleChipClick = (e) => {
    const { chipid, label } = e.currentTarget.dataset;
    this.routeChat(chipid, label);
  };
  handleDiffClick = (e) => this.setState({ diffLevel: e.currentTarget.dataset.level });
  handleToneClick = (e) => this.setState({ toneLevel: e.currentTarget.dataset.level });
  toggleKbSources = () => this.setState(s => ({ kbSourcesOpen: !s.kbSourcesOpen }));

  routeChat(chipId, label) {
    this.setState(s => {
      const msgs = s.chatMessages.map(m => ({ ...m, chips: null }));
      const userMsg = { id: this.nextChatId(), from: "user", kind: "text", text: label, chips: null, time: this.nextChatTime() };
      const typingMsg = { id: this.nextChatId(), from: "bot", kind: "typing", chips: null, time: null };
      return { chatMessages: [...msgs, userMsg, typingMsg] };
    }, () => setTimeout(() => this.resolveChat(chipId), 700));
  }

  resolveChat(chipId) {
    this.setState(s => {
      const msgs = s.chatMessages.slice(0, -1);
      const mk = (kind, extra, chips) => ({ id: this.nextChatId(), from: "bot", kind, chips: chips || null, time: this.nextChatTime(), ...extra });
      let botMsg;
      switch (chipId) {
        case "worksheet":
          botMsg = mk("text", { text: "Great — what topic and grade level should I build this for?" }, [
            { id: "w_fractions", label: "Fractions · Grade 5" },
            { id: "w_photo", label: "Photosynthesis · Grade 7" },
            { id: "w_revolution", label: "American Revolution · Grade 8" },
          ]);
          break;
        case "w_fractions": case "w_photo": case "w_revolution":
          botMsg = mk("worksheet", { topicId: chipId }, [
            { id: "ask", label: "💬 Ask a Question" },
            { id: "restart", label: "↩ Back to Menu" },
          ]);
          break;
        case "grades":
          botMsg = mk("summary", {}, [{ id: "restart", label: "↩ Back to Menu" }]);
          break;
        case "email":
          botMsg = mk("text", { text: "Who is this about, and what's the topic?" }, [
            { id: "email_alex", label: "Struggling in Math – Alex R." },
            { id: "email_jordan", label: "Missing Homework – Jordan P." },
          ]);
          break;
        case "email_alex": case "email_jordan":
          botMsg = mk("email", { emailId: chipId }, [{ id: "restart", label: "↩ Back to Menu" }]);
          break;
        case "exitticket":
          botMsg = mk("text", { text: "Which class should this exit ticket be for?" }, [
            { id: "et_fractions", label: "Grade 5 Math – Fractions" },
            { id: "et_photo", label: "Grade 7 Science – Photosynthesis" },
          ]);
          break;
        case "et_fractions": case "et_photo":
          botMsg = mk("exitticket", { etId: chipId }, [{ id: "restart", label: "↩ Back to Menu" }]);
          break;
        case "ask":
          botMsg = mk("text", { text: "Sure — here are a few things teachers often ask me:" }, [
            { id: "q_late", label: "Late homework policy?" },
            { id: "q_iep", label: "IEP accommodation guidelines?" },
            { id: "q_trip", label: "Field trip form submission?" },
          ]);
          break;
        case "q_late": case "q_iep": case "q_trip":
          botMsg = mk("kb", { qId: chipId }, [{ id: "restart", label: "↩ Ask Something Else" }]);
          break;
        default:
          botMsg = mk("text", { text: "Of course — what else can I help with?" }, CHAT_ROOT_CHIPS);
          break;
      }
      return { chatMessages: [...msgs, botMsg] };
    });
  }

  componentDidUpdate() {
    if (this.msgsRef.current) this.msgsRef.current.scrollTop = this.msgsRef.current.scrollHeight;
  }

  mergedCalendarEvents() {
    const nonExam = CALENDAR_EVENTS.filter(e => e.type !== "exam");
    const examEvents = this.state.schoolConfig.examSchedule.map(ex => {
      const d = parseShortDate(ex.date);
      return {
        date: ex.date, day: dayLabelForDate(d),
        title: `${this.classNameById(ex.classId)} — ${ex.title}`,
        type: "exam", time: ex.type === "Quiz" || ex.type === "Unit Test" ? "9:00 AM" : "All day",
        _sort: d.getTime(),
      };
    });
    return [...nonExam.map(e => ({ ...e, _sort: parseShortDate(e.date).getTime() })), ...examEvents]
      .sort((a, b) => a._sort - b._sort);
  }
  classNameById(id) {
    const c = CLASSES.find(x => x.id === id);
    return c ? c.name : id;
  }
  lessonStatusStyle(status) {
    const c = status === "Ready" ? "#16A34A" : "#F59E0B";
    const bg = status === "Ready" ? "#F0FDF4" : "#FFFBEB";
    return { fontSize: "13px", fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: "999px" };
  }
  checkboxStyle(done) {
    return {
      width: "20px", height: "20px", borderRadius: "6px",
      border: done ? "2px solid #16A34A" : "2px solid #D1D5DB",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      background: done ? "#16A34A" : "#FFFFFF", color: "#fff", fontSize: "14px", flexShrink: 0,
    };
  }
  checkboxLabel(done) {
    return done ? "✓" : "";
  }
  lessonTabStyle(tab) {
    const active = this.state.lessonSubTab === tab;
    return {
      padding: "9px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer",
      background: active ? "#111827" : "transparent", color: active ? "#fff" : "#6B7280",
    };
  }
  settingsTabStyle(tab) {
    const active = this.state.settingsTab === tab;
    return {
      padding: "9px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer",
      background: active ? "#111827" : "transparent", color: active ? "#fff" : "#6B7280",
    };
  }
  handleSettingsTabClick = (e) => this.setState({ settingsTab: e.currentTarget.getAttribute("data-tab") });

  openAddModal = (type) => () => {
    const blank = {
      timetable: { day: "Monday", time: "", classId: "c1" },
      curriculum: { subject: "", classId: CLASSES[0].id, academicYear: this.state.curriculumFilters.year, term: "Term 1", unit: "", plannedStart: "", plannedEnd: "", periods: "", textbookRef: "", weightage: "Medium", difficulty: "Medium", dependsOn: "", planned: 100, actual: 0, topics: [] },
      exam: { title: "", classId: "c1", date: "", type: "Quiz", weight: "", duration: 45, coverageUnitIds: [], revisionAllocated: 0, revisionUsed: 0 },
      masterTimetable: { sectionId: this.state.timetableFilters.sectionId, academicYear: this.state.timetableFilters.year, day: "Monday", period: 1, subject: MASTER_SUBJECTS[0], teacher: SUBJECT_TEACHER[MASTER_SUBJECTS[0]], room: SUBJECT_ROOM[MASTER_SUBJECTS[0]] },
      calendar: { date: "", label: "", type: "Holiday" },
    }[type];
    this.setState({ settingsModal: { type, mode: "add", editingId: null, form: blank } });
  };
  openEditModal = (type) => (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const list = { timetable: this.state.schoolConfig.timetable, curriculum: this.state.schoolConfig.curriculum, exam: this.state.schoolConfig.examSchedule, masterTimetable: this.state.schoolConfig.masterTimetable, calendar: this.state.schoolConfig.academicCalendar }[type];
    const row = list.find(r => r.id === id);
    if (!row) return;
    this.setState({ settingsModal: { type, mode: "edit", editingId: id, form: { ...row, coverageUnitIds: row.coverageUnitIds ? [...row.coverageUnitIds] : [] } } });
  };
  toggleExamCoverageUnit = (e) => {
    const unitId = e.currentTarget.getAttribute("data-unit-id");
    this.setState(s => {
      const cur = s.settingsModal.form.coverageUnitIds || [];
      const next = cur.includes(unitId) ? cur.filter(x => x !== unitId) : [...cur, unitId];
      return { settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, coverageUnitIds: next } } };
    });
  };
  closeSettingsModal = () => this.setState({ settingsModal: null });
  handleModalTopicChange = (e) => {
    const idx = Number(e.currentTarget.getAttribute("data-idx"));
    const value = e.currentTarget.value;
    this.setState(s => {
      const topics = [...(s.settingsModal.form.topics || [])];
      topics[idx] = { ...topics[idx], name: value };
      return { settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, topics } } };
    });
  };
  addModalTopic = () => {
    this.setState(s => {
      const topics = [...(s.settingsModal.form.topics || []), { id: "t_" + Date.now(), name: "", done: false }];
      return { settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, topics } } };
    });
  };
  useModalAutoEnd = () => {
    const info = this.computeAutoPlannedEnd(this.state.settingsModal.form.classId, this.state.settingsModal.form.plannedStart, this.state.settingsModal.form.periods, this.state.settingsModal.form.academicYear);
    if (!info) return;
    this.setState(s => ({ settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, plannedEnd: info.endDate } } }));
  };
  removeModalTopic = (e) => {
    const idx = Number(e.currentTarget.getAttribute("data-idx"));
    this.setState(s => {
      const topics = [...(s.settingsModal.form.topics || [])];
      topics.splice(idx, 1);
      return { settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, topics } } };
    });
  };

  topicLabelStyle(done) {
    return done
      ? { fontSize: "14.5px", color: "#9CA3AF", textDecoration: "line-through" }
      : { fontSize: "14.5px", color: "#374151" };
  }
  unitStatus(row) {
    if (Number(row.actual) >= 100) return "Completed";
    const start = parseShortDate(row.plannedStart);
    const end = parseShortDate(row.plannedEnd);
    if (!row.plannedStart || !row.plannedEnd) return Number(row.actual) > 0 ? "In Progress" : "Not Started";
    if (APP_TODAY < start && Number(row.actual) === 0) return "Not Started";
    if (APP_TODAY > end && Number(row.actual) < 100) return "Delayed";
    return "In Progress";
  }
  unitStatusStyle(status) {
    const map = {
      "Not Started": { bg: "#F1F5F9", color: "#64748B" },
      "In Progress": { bg: "#E0F2FE", color: "#0369A1" },
      "Delayed": { bg: "#FEE2E2", color: "#DC2626" },
      "Completed": { bg: "#DCFCE7", color: "#15803D" },
    };
    const c = map[status] || map["In Progress"];
    return { display: "inline-block", padding: "4px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" };
  }
  weightageChipStyle(w) {
    const map = {
      High: { bg: "#FEE2E2", color: "#DC2626" },
      Medium: { bg: "#FEF3C7", color: "#B45309" },
      Low: { bg: "#F1F5F9", color: "#64748B" },
    };
    const c = map[w] || map.Medium;
    return { display: "inline-block", padding: "3px 9px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" };
  }
  computeAutoPlannedEnd(classId, plannedStart, periods, academicYear) {
    const map = CLASSID_TO_SECTION_SUBJECT[classId];
    if (!map || !plannedStart || !periods) return null;
    const periodsPerWeek = this.state.schoolConfig.masterTimetable.filter(r =>
      r.sectionId === map.sectionId && r.subject === map.subject && r.academicYear === academicYear).length;
    if (!periodsPerWeek) return null;
    const periodsPerDay = periodsPerWeek / 5;
    const teachingDaysNeeded = Math.ceil(Number(periods) / periodsPerDay);
    const holidaySet = new Set(this.state.schoolConfig.academicCalendar.map(h => h.date));
    let d = parseShortDate(plannedStart);
    let counted = 0, guard = 0;
    while (counted < teachingDaysNeeded && guard < 400) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6 && !holidaySet.has(formatShortDate(d))) counted++;
      if (counted < teachingDaysNeeded) d = new Date(d.getTime() + 86400000);
      guard++;
    }
    return { endDate: formatShortDate(d), periodsPerWeek };
  }
  effectiveTeachingDaysInWindow(startDate, weeks) {
    const holidaySet = new Set(this.state.schoolConfig.academicCalendar.map(h => h.date));
    const endMs = startDate.getTime() + weeks * 7 * 86400000;
    let d = new Date(startDate);
    let total = 0, effective = 0;
    while (d.getTime() < endMs) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        total++;
        if (!holidaySet.has(formatShortDate(d))) effective++;
      }
      d = new Date(d.getTime() + 86400000);
    }
    return { total, effective, lost: total - effective };
  }
  filteredExamSchedule() {
    const f = this.state.examFilters;
    return this.state.schoolConfig.examSchedule.filter(ex => {
      const cls = CLASSES.find(c => c.id === ex.classId);
      const yearMatches = (ex.coverageUnitIds || []).length
        ? this.state.schoolConfig.curriculum.some(u => (ex.coverageUnitIds || []).includes(u.id) && u.academicYear === f.year)
        : true; // exams without linked units aren't year-scoped yet
      const sectionMatches = f.sectionId === "all" || (cls && cls.sectionId === f.sectionId);
      return yearMatches && sectionMatches;
    });
  }
  toggleExamExpanded = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ examExpanded: { ...s.examExpanded, [id]: !s.examExpanded[id] } }));
  };
  buildExamRow(r) {
    const cls = CLASSES.find(c => c.id === r.classId);
    const subject = cls ? cls.subject : "";
    const section = cls ? cls.name : "";
    const daysToExam = Math.round((parseShortDate(r.date) - APP_TODAY) / 86400000);
    const coveredUnits = (r.coverageUnitIds || []).map(id => this.state.schoolConfig.curriculum.find(u => u.id === id)).filter(Boolean);
    const totalPeriodsInScope = coveredUnits.reduce((a, u) => a + Number(u.periods || 0), 0);
    const periodsCompleted = coveredUnits.reduce((a, u) => a + Number(u.periods || 0) * Number(u.actual || 0) / 100, 0);
    const readinessPct = totalPeriodsInScope ? Math.round(periodsCompleted / totalPeriodsInScope * 100) : null;
    const status = readinessPct == null ? "—" : readinessPct >= 80 ? "Ready" : readinessPct >= 60 ? "Needs Revision" : "Not Ready";
    const atRiskUnit = coveredUnits.find(u => Number(u.actual) === 0);
    return {
      ...r,
      className: section, subjectLabel: subject,
      daysToExamLabel: daysToExam < 0 ? "Past" : daysToExam + "d",
      coveredUnitsDetail: coveredUnits.map(u => ({ unit: u.unit, actual: u.actual, periods: u.periods })),
      hasCoverage: coveredUnits.length > 0,
      totalPeriodsInScope, periodsCompleted: Math.round(periodsCompleted),
      readinessLabel: readinessPct == null ? "—" : readinessPct + "%",
      status, statusStyle: this.examReadinessStatusStyle(status),
      atRiskLabel: atRiskUnit ? `⚠ ${atRiskUnit.unit} not yet started` : "",
      revisionLabel: `${r.revisionUsed || 0}/${r.revisionAllocated || 0} used`,
      expanded: !!this.state.examExpanded[r.id],
      expandArrow: this.state.examExpanded[r.id] ? "▾" : "▸",
    };
  }
  examReadinessStatusStyle(status) {
    const map = {
      "Ready": { bg: "#DCFCE7", color: "#15803D" },
      "Needs Revision": { bg: "#FEF3C7", color: "#B45309" },
      "Not Ready": { bg: "#FEE2E2", color: "#DC2626" },
      "—": { bg: "#F1F5F9", color: "#64748B" },
    };
    const c = map[status] || map["—"];
    return { display: "inline-block", padding: "4px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" };
  }
  filteredCurriculum() {
    const f = this.state.curriculumFilters;
    return this.state.schoolConfig.curriculum.filter(r =>
      r.academicYear === f.year &&
      (f.classId === "all" || r.classId === f.classId) &&
      (!f.search || (r.subject + " " + r.unit).toLowerCase().includes(f.search.toLowerCase()))
    );
  }
  handleGradebookFilterChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => {
      const next = { ...s.gradebookFilters, [field]: value };
      if (field === "grade") { next.section = "all"; }
      return { gradebookFilters: next };
    });
  };
  handleOkfAlignmentFilterChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => {
      const next = { ...s.okfAlignmentFilters, [field]: value };
      if (field === "classId") { next.subject = "all"; next.topicId = "all"; }
      if (field === "subject") { next.topicId = "all"; }
      return { okfAlignmentFilters: next };
    });
  };
  handleCurriculumFilterChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    if (field === "year") { this.syncGlobalContext(value, this.state.globalContext.sectionId); return; }
    if (field === "classId" && value !== "all") {
      const cls = CLASSES.find(c => c.id === value);
      if (cls) { this.syncGlobalContext(this.state.globalContext.year, cls.sectionId); }
    }
    this.setState(s => ({ curriculumFilters: { ...s.curriculumFilters, [field]: value } }));
  };
  toggleUnitExpanded = (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    this.setState(s => ({ curriculumExpanded: { ...s.curriculumExpanded, [id]: !s.curriculumExpanded[id] } }));
  };
  toggleTopicDone = (e) => {
    const unitId = e.currentTarget.getAttribute("data-unit-id");
    const topicId = e.currentTarget.getAttribute("data-topic-id");
    this.setState(s => ({
      schoolConfig: {
        ...s.schoolConfig,
        curriculum: s.schoolConfig.curriculum.map(r => {
          if (r.id !== unitId) return r;
          const topics = r.topics.map(t => t.id === topicId ? { ...t, done: !t.done } : t);
          // Actual % follows topic completion automatically — taught in Lesson Planner
          // or ticked in Syllabus Map, either one keeps Course Progress/Exam Readiness live.
          const actual = topics.length ? Math.round(topics.filter(t => t.done).length / topics.length * 100) : r.actual;
          return { ...r, topics, actual };
        }),
      },
    }));
    this.flashLessonMsg("Marked taught — Syllabus Actual % updated.");
  };
  flashLessonMsg(msg) {
    this.setState({ lessonFlash: msg });
    setTimeout(() => this.setState({ lessonFlash: null }), 3000);
  }
  flashCurriculumMsg(msg) {
    this.setState({ curriculumFlash: msg });
    setTimeout(() => this.setState({ curriculumFlash: null }), 3500);
  }
  copyFromPreviousYear = () => {
    const idx = ACADEMIC_YEARS.indexOf(this.state.curriculumFilters.year);
    if (idx <= 0) { this.flashCurriculumMsg("No earlier academic year to copy from."); return; }
    const prevYear = ACADEMIC_YEARS[idx - 1];
    const curYear = ACADEMIC_YEARS[idx];
    let count = 0;
    this.setState(s => {
      const existing = s.schoolConfig.curriculum.filter(r => r.academicYear === curYear);
      const already = new Set(existing.map(r => r.classId + "|" + r.unit));
      const source = s.schoolConfig.curriculum.filter(r => r.academicYear === prevYear && !already.has(r.classId + "|" + r.unit));
      const copies = source.map((r, i) => ({
        ...r, id: "cu_" + Date.now() + "_" + i,
        academicYear: curYear, actual: 0, plannedStart: "", plannedEnd: "",
        topics: r.topics.map(t => ({ ...t, done: false })),
      }));
      count = copies.length;
      return { schoolConfig: { ...s.schoolConfig, curriculum: [...s.schoolConfig.curriculum, ...copies] } };
    });
    setTimeout(() => this.flashCurriculumMsg(count
      ? `Copied ${count} unit${count === 1 ? "" : "s"} from ${prevYear}. Set new planned dates for each.`
      : `Nothing new to copy — all units already exist for ${curYear}.`), 0);
  };
  openBulkUpload = () => this.setState({ bulkUploadOpen: true, bulkUploadText: "" });
  closeBulkUpload = () => this.setState({ bulkUploadOpen: false });
  handleBulkFieldChange = (e) => this.setState({ bulkUploadText: e.currentTarget.value });
  handleBulkFile = (e) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.setState({ bulkUploadText: String(reader.result || "") });
    reader.readAsText(file);
  };
  submitBulkUpload = () => {
    const lines = (this.state.bulkUploadText || "").split("\n").map(l => l.trim()).filter(Boolean);
    const year = this.state.curriculumFilters.year;
    const rows = [];
    lines.forEach((line, i) => {
      if (i === 0 && /subject/i.test(line) && /unit/i.test(line)) return;
      const cols = line.split(",").map(c => c.trim());
      if (cols.length < 3) return;
      const [subject, className, unit, periods, plannedStart, plannedEnd, plannedPct] = cols;
      const cls = CLASSES.find(c => c.name.toLowerCase() === (className || "").toLowerCase())
        || CLASSES.find(c => c.subject.toLowerCase() === (subject || "").toLowerCase());
      rows.push({
        id: "cu_bulk_" + Date.now() + "_" + i,
        subject: subject || "Untitled Subject", classId: cls ? cls.id : CLASSES[0].id, academicYear: year,
        term: this.state.curriculumFilters.term || "Term 2", unit: unit || "Untitled Unit",
        plannedStart: plannedStart || "", plannedEnd: plannedEnd || "", periods: Number(periods) || 0,
        textbookRef: "", weightage: "Medium", planned: Number(plannedPct) || 100, actual: 0, topics: [],
      });
    });
    this.setState(s => ({
      schoolConfig: { ...s.schoolConfig, curriculum: [...s.schoolConfig.curriculum, ...rows] },
      bulkUploadOpen: false,
    }));
    this.flashCurriculumMsg(`Added ${rows.length} unit${rows.length === 1 ? "" : "s"} from upload.`);
  };
  exportCurriculumCSV = () => {
    const rows = this.filteredCurriculum();
    const header = ["Subject", "Class/Section", "Term", "Unit", "Periods", "Planned Start", "Planned End", "Planned %", "Actual %", "Status", "Textbook", "Weightage"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      const status = this.unitStatus(r);
      const cls = this.classNameById(r.classId);
      lines.push([r.subject, cls, r.term, r.unit, r.periods, r.plannedStart, r.plannedEnd, r.planned, r.actual, status, r.textbookRef, r.weightage]
        .map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `syllabus_${this.state.curriculumFilters.year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  handleModalFieldChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    this.setState(s => ({ settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, [field]: value } } }));
  };
  saveSettingsModal = () => {
    const modal = this.state.settingsModal;
    if (!modal) return;
    const key = { timetable: "timetable", curriculum: "curriculum", exam: "examSchedule", masterTimetable: "masterTimetable", calendar: "academicCalendar" }[modal.type];
    this.setState(s => {
      const list = s.schoolConfig[key];
      let newList;
      if (modal.mode === "edit") {
        newList = list.map(r => r.id === modal.editingId ? { ...r, ...modal.form } : r);
      } else {
        const id = modal.type + "_" + Date.now();
        newList = [...list, { id, ...modal.form }];
      }
      return { schoolConfig: { ...s.schoolConfig, [key]: newList }, settingsModal: null };
    });
  };
  deleteSettingsRow = (type) => (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    const key = { timetable: "timetable", curriculum: "curriculum", exam: "examSchedule", masterTimetable: "masterTimetable", calendar: "academicCalendar" }[type];
    this.setState(s => ({ schoolConfig: { ...s.schoolConfig, [key]: s.schoolConfig[key].filter(r => r.id !== id) } }));
  };
  handleMasterSubjectChange = (e) => {
    const subject = e.currentTarget.value;
    this.setState(s => ({ settingsModal: { ...s.settingsModal, form: { ...s.settingsModal.form, subject, teacher: SUBJECT_TEACHER[subject] || "Unassigned", room: SUBJECT_ROOM[subject] || "TBD" } } }));
  };

  sectionLabel(id) {
    const s = MT_SECTIONS.find(x => x.id === id);
    return s ? s.label : id;
  }
  handleTimetableFilterChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    if (field === "year") { this.syncGlobalContext(value, this.state.globalContext.sectionId); return; }
    if (field === "sectionId") { this.syncGlobalContext(this.state.globalContext.year, value); return; }
    this.setState(s => ({ timetableFilters: { ...s.timetableFilters, [field]: value } }));
  };
  handleExamFilterChange = (e) => {
    const field = e.currentTarget.getAttribute("data-field");
    const value = e.currentTarget.value;
    if (field === "year") { this.syncGlobalContext(value, this.state.globalContext.sectionId); return; }
    if (field === "sectionId" && value !== "all") { this.syncGlobalContext(this.state.globalContext.year, value); return; }
    this.setState(s => ({ examFilters: { ...s.examFilters, [field]: value } }));
  };
  setTimetableSubView = (e) => this.setState({ timetableSubView: e.currentTarget.getAttribute("data-view") });
  flashTimetableMsg(msg) {
    this.setState({ timetableFlash: msg });
    setTimeout(() => this.setState({ timetableFlash: null }), 3500);
  }
  computeTimetableConflicts(rowsForYear) {
    const byKey = {};
    rowsForYear.forEach(r => { (byKey[r.day + "|" + r.period] = byKey[r.day + "|" + r.period] || []).push(r); });
    const conflictIds = new Set();
    const messages = [];
    Object.values(byKey).forEach(list => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.sectionId === b.sectionId) continue;
          if (a.teacher === b.teacher && a.teacher !== "—") {
            conflictIds.add(a.id); conflictIds.add(b.id);
            messages.push(`${a.teacher} is double-booked: ${this.sectionLabel(a.sectionId)} & ${this.sectionLabel(b.sectionId)}, both ${a.day} Period ${a.period}.`);
          } else if (a.room === b.room && a.subject !== "Study Hall" && b.subject !== "Study Hall") {
            conflictIds.add(a.id); conflictIds.add(b.id);
            messages.push(`${a.room} is double-booked: ${this.sectionLabel(a.sectionId)} & ${this.sectionLabel(b.sectionId)}, both ${a.day} Period ${a.period}.`);
          }
        }
      }
    });
    return { conflictIds, messages: [...new Set(messages)] };
  }
  copyTimetableFromPreviousYear = () => {
    const idx = ACADEMIC_YEARS.indexOf(this.state.timetableFilters.year);
    if (idx <= 0) { this.flashTimetableMsg("No earlier academic year to copy from."); return; }
    const prevYear = ACADEMIC_YEARS[idx - 1];
    const curYear = ACADEMIC_YEARS[idx];
    let count = 0;
    this.setState(s => {
      const existing = s.schoolConfig.masterTimetable.filter(r => r.academicYear === curYear);
      const already = new Set(existing.map(r => r.sectionId + "|" + r.day + "|" + r.period));
      const source = s.schoolConfig.masterTimetable.filter(r => r.academicYear === prevYear && !already.has(r.sectionId + "|" + r.day + "|" + r.period));
      const copies = source.map((r, i) => ({ ...r, id: "mt_copy_" + Date.now() + "_" + i, academicYear: curYear }));
      count = copies.length;
      return { schoolConfig: { ...s.schoolConfig, masterTimetable: [...s.schoolConfig.masterTimetable, ...copies] } };
    });
    setTimeout(() => this.flashTimetableMsg(count
      ? `Copied ${count} slot${count === 1 ? "" : "s"} from ${prevYear}.`
      : `Nothing new to copy — all slots already exist for ${curYear}.`), 0);
  };
  exportTimetableCSV = () => {
    const rows = this.state.schoolConfig.masterTimetable.filter(r => r.academicYear === this.state.timetableFilters.year);
    const header = ["Section", "Day", "Period", "Time", "Subject", "Teacher", "Room"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      lines.push([this.sectionLabel(r.sectionId), r.day, r.period, PERIOD_TIME_LABELS[r.period], r.subject, r.teacher, r.room]
        .map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `timetable_${this.state.timetableFilters.year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  openTimetableBulk = () => this.setState({ timetableBulkOpen: true, timetableBulkText: "" });
  closeTimetableBulk = () => this.setState({ timetableBulkOpen: false });
  handleTimetableBulkFieldChange = (e) => this.setState({ timetableBulkText: e.currentTarget.value });
  handleTimetableBulkFile = (e) => {
    const file = e.currentTarget.files && e.currentTarget.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.setState({ timetableBulkText: String(reader.result || "") });
    reader.readAsText(file);
  };
  submitTimetableBulk = () => {
    const lines = (this.state.timetableBulkText || "").split("\n").map(l => l.trim()).filter(Boolean);
    const year = this.state.timetableFilters.year;
    const rows = [];
    lines.forEach((line, i) => {
      if (i === 0 && /section/i.test(line) && /subject/i.test(line)) return;
      const cols = line.split(",").map(c => c.trim());
      if (cols.length < 4) return;
      const [sectionLabel, day, period, subject] = cols;
      const sec = MT_SECTIONS.find(s => s.label.toLowerCase() === (sectionLabel || "").toLowerCase());
      rows.push({
        id: "mt_bulk_" + Date.now() + "_" + i,
        sectionId: sec ? sec.id : MT_SECTIONS[0].id, academicYear: year,
        day: day || "Monday", period: Number(period) || 1,
        subject: subject || MASTER_SUBJECTS[0],
        teacher: SUBJECT_TEACHER[subject] || "Unassigned", room: SUBJECT_ROOM[subject] || "TBD",
      });
    });
    this.setState(s => ({
      schoolConfig: { ...s.schoolConfig, masterTimetable: [...s.schoolConfig.masterTimetable, ...rows] },
      timetableBulkOpen: false,
    }));
    this.flashTimetableMsg(`Added ${rows.length} slot${rows.length === 1 ? "" : "s"} from upload.`);
  };

  standardChipStyle(code) {
    const active = this.state.planStandards.includes(code);
    return {
      padding: "7px 12px", borderRadius: "999px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
      border: active ? "1px solid #16332B" : "1px solid #E5E7EB",
      background: active ? "#E9F1EC" : "#fff", color: active ? "#16332B" : "#374151",
    };
  }
  differentiateTierStyle(tier) {
    const active = this.state.differentiateTier === tier;
    return {
      padding: "8px 16px", borderRadius: "8px", fontSize: "14.5px", fontWeight: 600, cursor: "pointer",
      background: active ? "#3F6E62" : "#E4F0ED", color: active ? "#fff" : "#3F6E62",
    };
  }

  navItemStyle(key) {
    const active = this.state.view === key;
    return {
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 12px", borderRadius: "8px", fontSize: "15.5px",
      fontWeight: active ? 700 : 500, cursor: "pointer", marginBottom: "2px",
      background: active ? "rgba(127,191,122,.16)" : "transparent",
      boxShadow: active ? "inset 0 0 0 1px rgba(127,191,122,.35)" : "none",
      color: active ? "#7FBF7A" : "#E8E4DC",
    };
  }

  roleToggleStyle(role) {
    const active = this.state.role === role;
    return {
      padding: "6px 16px", borderRadius: "999px", fontSize: "14.5px", fontWeight: 600,
      cursor: "pointer", background: active ? "#16332B" : "transparent",
      color: active ? "#fff" : "#6B7280",
    };
  }

  buildChatMessagesView() {
    const s = this.state;
    return s.chatMessages.map(m => {
      const isUser = m.from === "user";
      const base = {
        ...m,
        isUser, isBot: !isUser,
        isText: m.kind === "text",
        isTyping: m.kind === "typing",
        isWorksheet: m.kind === "worksheet",
        isKB: m.kind === "kb",
        isSummary: m.kind === "summary",
        isEmail: m.kind === "email",
        isExitTicket: m.kind === "exitticket",
        hasChips: !!(m.chips && m.chips.length),
        rowStyle: "display:flex; justify-content:" + (isUser ? "flex-end" : "flex-start") + "; margin-bottom:4px;",
        bubbleStyle: isUser
          ? "max-width:82%; background:#3F6E62; color:#fff; border-radius:14px 14px 4px 14px; padding:11px 14px; font-size:14px; line-height:1.5;"
          : "max-width:90%; background:#fff; color:#111827; border:1px solid #E5E7EB; border-radius:14px 14px 14px 4px; padding:12px 14px; font-size:14px; line-height:1.5;",
        timeStyle: "font-size:11px; color:#9CA3AF; margin-top:5px; text-align:" + (isUser ? "right" : "left") + ";",
      };
      if (m.kind === "worksheet") {
        const topic = CHAT_TOPICS[m.topicId];
        base.topic = topic;
        base.previewText = topic.byLevel[s.diffLevel];
        base.segRemedial = this.segStyle(s.diffLevel === "remedial");
        base.segOnlevel = this.segStyle(s.diffLevel === "onlevel");
        base.segGifted = this.segStyle(s.diffLevel === "gifted");
      }
      if (m.kind === "kb") {
        base.q = CHAT_QUESTIONS[m.qId];
        base.sourcesOpen = s.kbSourcesOpen;
        base.sourcesLabel = s.kbSourcesOpen ? "📚 Hide source" : "📚 1 source";
      }
      if (m.kind === "email") {
        const email = CHAT_EMAILS[m.emailId];
        base.email = email;
        base.bodyText = email.bodyByTone[s.toneLevel];
        base.segCasual = this.segStyle(s.toneLevel === "casual");
        base.segProfessional = this.segStyle(s.toneLevel === "professional");
        base.segFormal = this.segStyle(s.toneLevel === "formal");
      }
      if (m.kind === "exitticket") {
        base.et = CHAT_EXIT_TICKETS[m.etId];
      }
      if (base.hasChips) {
        base.chipsView = m.chips.map(c => ({ ...c, style: "background:#fff; border:1px solid #CFE3DC; color:#16332B; border-radius:999px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;" }));
      }
      return base;
    });
  }

  renderVals() {
    const view = this.state.view;
    const role = this.state.role;
    const curriculumUnitRows = this.filteredCurriculum().map(r => {
      const autoInfo = this.computeAutoPlannedEnd(r.classId, r.plannedStart, r.periods, r.academicYear);
      const displayPlannedEnd = autoInfo ? autoInfo.endDate : r.plannedEnd;
      const status = this.unitStatus({ ...r, plannedEnd: displayPlannedEnd });
      const siblings = this.state.schoolConfig.curriculum.filter(u => u.classId === r.classId && u.academicYear === r.academicYear && u.term === r.term);
      const cumulativePeriods = siblings.filter(u => (parseShortDate(u.plannedStart || "Jan 1")) <= parseShortDate(r.plannedStart || "Jan 1")).reduce((a, u) => a + Number(u.periods || 0), 0);
      const dependsOnUnit = r.dependsOn ? this.state.schoolConfig.curriculum.find(u => u.id === r.dependsOn) : null;
      const testedIn = this.state.schoolConfig.examSchedule.filter(ex => (ex.coverageUnitIds || []).includes(r.id)).map(ex => ex.title);
      return {
        ...r,
        className: this.classNameById(r.classId),
        barStyle: this.barFillStyle(r.actual, "#3F6E62"),
        status,
        statusStyle: this.unitStatusStyle(status),
        weightageStyle: this.weightageChipStyle(r.weightage),
        difficultyStyle: this.weightageChipStyle(r.difficulty === "High" ? "High" : r.difficulty === "Low" ? "Low" : "Medium"),
        expanded: !!this.state.curriculumExpanded[r.id],
        expandArrow: this.state.curriculumExpanded[r.id] ? "▾" : "▸",
        topics: r.topics.map(t => ({ ...t, labelStyle: this.topicLabelStyle(t.done) })),
        topicsDoneCount: r.topics.filter(t => t.done).length,
        topicsTotalCount: r.topics.length,
        displayPlannedEnd,
        isAutoPlannedEnd: !!autoInfo,
        cumulativePeriods,
        dependsOnLabel: dependsOnUnit ? dependsOnUnit.unit : "",
        dependsOnIncomplete: !!(dependsOnUnit && Number(dependsOnUnit.actual) < 100),
        dependsOnStyle: { fontSize: "13px", marginTop: "6px", color: (dependsOnUnit && Number(dependsOnUnit.actual) < 100) ? "#DC2626" : "#9CA3AF" },
        testedInLabel: testedIn.length ? testedIn.join(", ") : "Not yet linked to an exam",
        okfChapter: r.okfChapterId ? OKF_LIBRARY.chapters.find(c => c.id === r.okfChapterId) : null,
        hasOkfChapter: !!r.okfChapterId,
      };
    });

    // ---- Master Timetable computed views ----
    const ttYear = this.state.timetableFilters.year;
    const ttAllYearRows = this.state.schoolConfig.masterTimetable.filter(r => r.academicYear === ttYear);
    const ttConflicts = this.computeTimetableConflicts(ttAllYearRows);
    const ttSection = this.state.timetableFilters.sectionId;
    const ttTeacher = this.state.timetableFilters.teacherName;

    const cellStyleFor = (hasConflict) => ({
      background: hasConflict ? "#FEE2E2" : "#fff",
      border: hasConflict ? "1px solid #FCA5A5" : "1px solid #E5E7EB",
      borderRadius: "8px", padding: "8px", minHeight: "56px",
    });
    const classGridRows = MT_GRID_STRUCTURE.map(g => {
      if (g.kind !== "period") return { isPeriod: false, isBreakRow: true, label: g.label, time: g.time };
      const cells = MT_DAYS.map(day => {
        const slot = ttAllYearRows.find(r => r.sectionId === ttSection && r.day === day && r.period === g.period);
        const hasConflict = !!(slot && ttConflicts.conflictIds.has(slot.id));
        return {
          hasSlot: !!slot, noSlot: !slot,
          subject: slot ? slot.subject : "", teacher: slot ? slot.teacher : "", room: slot ? slot.room : "",
          cellStyle: cellStyleFor(hasConflict),
        };
      });
      return { isPeriod: true, isBreakRow: false, period: g.period, time: PERIOD_TIME_LABELS[g.period], cells };
    });

    const teacherGridRows = MT_GRID_STRUCTURE.map(g => {
      if (g.kind !== "period") return { isPeriod: false, isBreakRow: true, label: g.label, time: g.time };
      const cells = MT_DAYS.map(day => {
        const slot = ttAllYearRows.find(r => r.teacher === ttTeacher && r.day === day && r.period === g.period);
        const hasConflict = !!(slot && ttConflicts.conflictIds.has(slot.id));
        return {
          hasSlot: !!slot, noSlot: !slot,
          sectionLabel: slot ? this.sectionLabel(slot.sectionId) : "", subject: slot ? slot.subject : "", room: slot ? slot.room : "",
          cellStyle: cellStyleFor(hasConflict),
        };
      });
      return { isPeriod: true, isBreakRow: false, period: g.period, time: PERIOD_TIME_LABELS[g.period], cells };
    });
    const teacherTotalPeriods = ttAllYearRows.filter(r => r.teacher === ttTeacher).length;
    const teacherFreePeriods = (MT_DAYS.length * MT_PERIODS.length) - teacherTotalPeriods;

    const subjectsForSection = [...new Set(ttAllYearRows.filter(r => r.sectionId === ttSection).map(r => r.subject))];
    const periodAllocationRows = subjectsForSection.map(subject => {
      const periodsPerWeek = ttAllYearRows.filter(r => r.sectionId === ttSection && r.subject === subject).length;
      const teacher = SUBJECT_TEACHER[subject] || "Unassigned";
      const syllabusClassId = SECTION_SUBJECT_TO_SYLLABUS_CLASS[ttSection + "|" + subject];
      const units = syllabusClassId ? this.state.schoolConfig.curriculum.filter(u => u.classId === syllabusClassId && u.academicYear === ttYear) : [];
      let requiredPerWeek = null, shortfall = false;
      if (units.length) {
        const activeUnit = units.find(u => this.unitStatus(u) === "In Progress") || units[0];
        if (activeUnit.plannedStart && activeUnit.plannedEnd) {
          const weeks = Math.max(1, Math.round((parseShortDate(activeUnit.plannedEnd) - parseShortDate(activeUnit.plannedStart)) / (7 * 86400000)));
          requiredPerWeek = Math.ceil(activeUnit.periods / weeks);
          shortfall = periodsPerWeek < requiredPerWeek;
        }
      }
      return {
        subject, teacher, periodsPerWeek,
        unitsLabel: units.length ? units.map(u => u.unit).join(", ") : "—",
        requiredPerWeek, shortfall,
        requiredLabel: requiredPerWeek == null ? "—" : (requiredPerWeek + "/week" + (shortfall ? " ⚠" : "")),
        requiredCellStyle: {
          fontWeight: shortfall ? 700 : 400,
          color: shortfall ? "#DC2626" : "#374151",
        },
      };
    });
    const totalWeeklyPeriods = periodAllocationRows.reduce((a, r) => a + r.periodsPerWeek, 0);
    const teacherNameOptions = [...new Set(Object.values(SUBJECT_TEACHER))];
    const ett = this.effectiveTeachingDaysInWindow(APP_TODAY, 4);
    const effectiveTeachingDaysLabel = `${ett.effective} of ${ett.total} school days in the next 4 weeks` + (ett.lost ? ` — ${ett.lost} lost to holidays/events` : "");
    const masterTimetableSectionRows = [...ttAllYearRows]
      .filter(r => r.sectionId === ttSection)
      .sort((a, b) => MT_DAYS.indexOf(a.day) - MT_DAYS.indexOf(b.day) || a.period - b.period);

    return {
      chatOpen: this.state.chatOpen,
      fabIcon: this.state.chatOpen ? "✕" : "🤖",
      toggleChat: this.toggleChat,
      chatMessages: this.buildChatMessagesView(),
      handleChipClick: this.handleChipClick,
      handleDiffClick: this.handleDiffClick,
      handleToneClick: this.handleToneClick,
      toggleKbSources: this.toggleKbSources,
      msgsRef: this.msgsRef,
      navGroups: NAV_GROUPS.filter(g => !g.adminOnly || role === "admin").map(g => ({
        ...g,
        items: g.items.map(it => ({ ...it, style: this.navItemStyle(it.key) })),
      })),
      userName: role === "admin" ? "Principal A. Reyes" : `${TEACHER_NAME}`,
      userInitials: role === "admin" ? "AR" : "SM",
      userRoleLabel: role === "admin" ? "Administrator" : "Mathematics Teacher",
      isTeacherRole: role === "teacher",
      isAdminRole: role === "admin",
      setRoleTeacher: () => this.setState(s => ({ role: "teacher", view: s.view === "settings" ? "dashboard" : s.view })),
      setRoleAdmin: () => this.setState({ role: "admin" }),
      roleToggleStyle: (r) => this.roleToggleStyle(r),
      teacherToggleStyle: this.roleToggleStyle("teacher"),
      adminToggleStyle: this.roleToggleStyle("admin"),
      makeNavClick: this.makeNavClick,
      handleNavClick: this.handleNavClick,
      navItemStyle: (k) => this.navItemStyle(k),
      currentViewLabel: VIEW_LABELS[view] || view,
      isDashboardTeacher: view === "dashboard" && role === "teacher",
      isDashboardAdmin: view === "dashboard" && role === "admin",
      isPlaceholderView: false,
      firstName: TEACHER_NAME.split(" ")[0],
      todayEvents: (() => {
        const all = this.mergedCalendarEvents();
        return all.filter(e => e.day === "Today").concat(all.filter(e => e.day !== "Today").slice(0, 2))
          .map(ev => ({ ...ev, dotStyle: this.eventDotStyle(ev.type), badgeStyle: this.eventBadgeStyle(ev.type) }));
      })(),
      topTasks: TASKS.filter(t => !t.done).slice(0, 4).map(t => ({ ...t, dotStyle: this.priorityDotStyle(t.priority) })),
      recentAnnouncements: this.state.schoolConfig.announcements.slice(0, 2),
      classSnapshot: CLASSES.slice(0, 3),
      teachersAdmin: TEACHERS_ADMIN,
      eventDotStyle: (t) => this.eventDotStyle(t),
      eventBadgeStyle: (t) => this.eventBadgeStyle(t),
      priorityDotStyle: (p) => this.priorityDotStyle(p),

      isCalendar: view === "calendar",
      allEvents: this.mergedCalendarEvents().map(ev => ({ ...ev, dotStyle: this.eventDotStyle(ev.type), badgeStyle: this.eventBadgeStyle(ev.type) })),

      isClasses: view === "classes",
      allClasses: CLASSES,

      isSubjects: view === "subjects",
      subjectsList: [
        { subject: "Mathematics", classes: "8A, 8B", students: 62, progress: 78 },
        { subject: "Mathematics (Grade 7)", classes: "7A", students: 28, progress: 95 },
        { subject: "Algebra II", classes: "9C", students: 26, progress: 58 },
        { subject: "Homeroom", classes: "8A", students: 32, progress: 70 },
      ].map(s => ({ ...s, barStyle: this.barFillStyle(s.progress, "#16332B") })),
      barFillStyle: (pct, color) => this.barFillStyle(pct, color),

      isLessonPlanner: view === "lessonPlanner",
      aiDraftOpen: this.state.aiDraftOpen,
      toggleAiDraft: this.toggleAiDraft,
      lessonPlanRows: this.state.schoolConfig.timetable.map(r => {
        const currentYear = this.state.curriculumFilters.year;
        const candidateUnits = this.state.schoolConfig.curriculum.filter(u => u.classId === r.classId && u.academicYear === currentYear);
        const unit = candidateUnits.find(u => this.unitStatus(u) === "In Progress") || candidateUnits[0] || null;
        return {
          day: r.day, classId: r.classId, time: r.time,
          className: this.classNameById(r.classId),
          hasUnit: !!unit,
          unitId: unit ? unit.id : null,
          unitName: unit ? unit.unit : "",
          unitActual: unit ? unit.actual : null,
          topics: unit ? unit.topics.map(t => ({ ...t, labelStyle: this.topicLabelStyle(t.done) })) : [],
          status: unit ? this.unitStatus(unit) : "No Syllabus unit linked",
        };
      }).map(r => ({ ...r, statusStyle: this.lessonStatusStyle(r.hasUnit ? r.status : "Draft") })),
      classNameById: (id) => this.classNameById(id),
      lessonStatusStyle: (s) => this.lessonStatusStyle(s),
      lessonFlash: this.state.lessonFlash,
      toggleLessonTopic: this.toggleTopicDone,

      lessonSubTab: this.state.lessonSubTab,
      isLessonGenerator: this.state.lessonSubTab === "generator",
      isLessonWeek: this.state.lessonSubTab === "week",
      isLessonLibrary: this.state.lessonSubTab === "library",
      lessonTabStyle: (t) => this.lessonTabStyle(t),
      tabStyleGenerator: this.lessonTabStyle("generator"),
      tabStyleWeek: this.lessonTabStyle("week"),
      tabStyleLibrary: this.lessonTabStyle("library"),
      setLessonSubTab: this.setLessonSubTab,
      handleLessonSubTabClick: this.handleLessonSubTabClick,
      handleDifferentiateTierClick: this.handleDifferentiateTierClick,
      handleStandardClick: this.handleStandardClick,
      handleTaskClick: this.handleTaskClick,

      classOptions: CLASSES,
      standardsOptions: STANDARDS_OPTIONS.map(s => ({ ...s, chipStyle: this.standardChipStyle(s.code) })),
      planTopic: this.state.planTopic,
      setPlanTopic: this.setPlanTopic,
      planClassId: this.state.planClassId,
      setPlanClassId: this.setPlanClassId,
      planDuration: this.state.planDuration,
      setPlanDuration: this.setPlanDuration,
      planStandards: this.state.planStandards,
      toggleStandard: this.toggleStandard,
      standardChipStyle: (code) => this.standardChipStyle(code),
      isGenerating: this.state.isGenerating,
      generateBtnLabel: this.state.isGenerating ? "Generating…" : "✦ Generate Lesson Plan",
      generatePlan: this.generatePlan,

      generatedPlan: this.state.generatedPlan,
      hasGeneratedPlan: !!this.state.generatedPlan,
      saveToLibrary: this.saveToLibrary,

      differentiateOpen: this.state.differentiateOpen,
      toggleDifferentiate: this.toggleDifferentiate,
      differentiateTier: this.state.differentiateTier,
      setDifferentiateTier: this.setDifferentiateTier,
      differentiateTierStyle: (t) => this.differentiateTierStyle(t),
      tierStyleSupport: this.differentiateTierStyle("support"),
      tierStyleOnlevel: this.differentiateTierStyle("onlevel"),
      tierStyleChallenge: this.differentiateTierStyle("challenge"),
      differentiateText: DIFFERENTIATE_CONTENT[this.state.differentiateTier],

      savedLibrary: this.state.savedLibrary,

      isAssessmentBuilder: view === "assessmentBuilder",
      paletteTypes: PALETTE_TYPES,
      topicOptions: TOPIC_OPTIONS,
      openOkfImport: this.openOkfImport,
      closeOkfImport: this.closeOkfImport,
      okfImportOpen: this.state.okfImportOpen,
      toggleOkfImportChapter: this.toggleOkfImportChapter,
      toggleOkfImportQuestion: this.toggleOkfImportQuestion,
      confirmOkfImport: this.confirmOkfImport,
      okfImportChapterRows: OKF_QUESTION_BANK.chapters.map(ch => ({
        id: ch.id, number: ch.number, title: ch.title,
        expanded: !!this.state.okfImportExpanded[ch.id],
        expandArrow: this.state.okfImportExpanded[ch.id] ? "▾" : "▸",
        topics: ch.topics.map(tp => ({
          id: tp.id, title: tp.title,
          questions: tp.questions.map(q => ({ ...q, checked: !!this.state.okfImportSelectedIds[q.id] })),
        })),
      })),
      okfImportSelectedCount: Object.values(this.state.okfImportSelectedIds).filter(Boolean).length,
      abTopicId: this.state.abTopicId,
      setAbTopic: this.setAbTopic,
      abGrade: this.state.abGrade,
      setAbGrade: this.setAbGrade,
      handleAddSection: this.handleAddSection,

      abBuilderTab: this.state.abBuilderTab,
      isAbBuildTab: this.state.abBuilderTab === "build",
      isAbSavedTab: this.state.abBuilderTab === "saved",
      setAbBuilderTab: this.setAbBuilderTab,
      abBuildTabStyle: { padding: "9px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", background: this.state.abBuilderTab === "build" ? "#111827" : "transparent", color: this.state.abBuilderTab === "build" ? "#fff" : "#6B7280" },
      abSavedTabStyle: { padding: "9px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", background: this.state.abBuilderTab === "saved" ? "#111827" : "transparent", color: this.state.abBuilderTab === "saved" ? "#fff" : "#6B7280" },
      abClassId: this.state.abClassId,
      setAbClassId: this.setAbClassId,
      abTerm: this.state.abTerm,
      setAbTerm: this.setAbTerm,
      classOptionsForAb: CLASSES,
      termsOptionsForAb: TERMS,
      abSaveFlash: this.state.abSaveFlash,
      assessmentBankRows: this.state.schoolConfig.assessmentBank.map(b => ({ ...b, className: this.classNameById(b.classId) })),
      openAssignFromBank: this.openAssignFromBank,
      closeAssignFromBank: this.closeAssignFromBank,
      assignFromBankModal: this.state.assignFromBankModal,
      handleAssignFromBankFieldChange: this.handleAssignFromBankFieldChange,
      confirmAssignFromBank: this.confirmAssignFromBank,
      assignFromBankClassName: this.state.assignFromBankModal ? this.classNameById(this.state.assignFromBankModal.classId) : "",

      abObjectiveOpen: this.state.abObjectiveOpen,
      toggleAbObjective: this.toggleAbObjective,
      abObjectiveText: this.state.abObjectiveText,
      setAbObjectiveText: this.setAbObjectiveText,
      abObjectivePillStyle: {
        display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 14px", borderRadius: "8px",
        border: this.state.abObjectiveOpen ? "1px solid #4A7C6F" : "1px solid #D9A94E",
        background: this.state.abObjectiveOpen ? "#E4F0ED" : "#F8F0D8",
        color: this.state.abObjectiveOpen ? "#4A7C6F" : "#13231F", fontSize: "15px", fontWeight: 600, cursor: "pointer",
      },
      abObjectiveTextareaStyle: {
        width: "100%", marginTop: "14px", minHeight: "64px", resize: "vertical", fontFamily: "Nunito, sans-serif",
        fontSize: "15px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #DDD8CF",
        display: this.state.abObjectiveOpen ? "block" : "none",
      },

      abHasSections: this.state.abSections.length > 0,
      abNoSections: this.state.abSections.length === 0,
      abEmptyStateStyle: {
        display: this.state.abSections.length === 0 ? "flex" : "none",
        alignItems: "center", justifyContent: "center", flex: 1, minHeight: "120px",
      },
      abSectionsView: this.state.abSections.map((s, idx) => {
        const tmpl = SECTION_TEMPLATES[s.type] || SECTION_TEMPLATES.multiple_choice;
        const isExpanded = s.id === this.state.abSelectedSectionId;
        const demandOpen = s.id === this.state.abDemandDropdownSectionId;
        return {
          id: s.id, type: s.type, letter: String.fromCharCode(65 + idx),
          title: tmpl.title, icon: tmpl.icon, bg: tmpl.bg, iconColor: tmpl.iconColor,
          count: s.count, pointsPer: s.pointsPer,
          totalPoints: s.count * s.pointsPer, estMinutes: Math.ceil(s.count * 2),
          demandName: s.demand.name, demandEasy: s.demand.easy, demandMedium: s.demand.medium, demandHard: s.demand.hard,
          isExpanded, collapseIcon: isExpanded ? "▲" : "▼",
          demandOpen,
          demandOptions: DEMAND_PRESETS.map(p => ({
            key: p.key, name: p.name, easy: p.easy, medium: p.medium, hard: p.hard,
            selected: p.name === s.demand.name,
            rowBg: p.name === s.demand.name ? "#E4F0ED" : "transparent",
          })),
          previewQuestions: s.questions.slice(0, 2).map((q, qi) => ({
            ...q, num: qi + 1,
            options: q.options ? q.options.map(o => ({
              ...o,
              correctIcon: o.correct ? "✓" : "○",
              boxBg: o.correct ? "#DFF5EC" : "#fff",
              boxBorder: o.correct ? "1px solid #2E9E6B" : "1px solid #D8E8E4",
            })) : undefined,
          })),
          moreCount: Math.max(0, s.questions.length - 2),
          selectedCount: s.questions.length,
        };
      }),
      toggleAbSectionSelect: this.toggleAbSectionSelect,
      removeAbSection: this.removeAbSection,
      changeSectionCount: this.changeSectionCount,
      changeSectionPoints: this.changeSectionPoints,
      toggleSectionDemandDropdown: this.toggleSectionDemandDropdown,
      pickSectionDemand: this.pickSectionDemand,
      repickSectionQuestions: this.repickSectionQuestions,
      openManageQuestions: this.openManageQuestions,

      abManageOpen: this.state.abManageOpen,
      closeManageQuestions: this.closeManageQuestions,
      stopPropagationHandler: this.stopPropagationHandler,
      abManageSectionTitle: (() => {
        const sec = this.getAbSection(this.state.abManageSectionId);
        return sec ? (SECTION_TEMPLATES[sec.type] || {}).title || "Questions" : "Questions";
      })(),
      abManageQuestions: (() => {
        const sec = this.getAbSection(this.state.abManageSectionId);
        return sec ? sec.questions.map((q, i) => ({ ...q, num: i + 1 })) : [];
      })(),
      abIsEditingQuestion: !!this.state.abEditingQuestionId,
      abEditorText: this.state.abEditorText,
      setEditorText: this.setEditorText,
      abEditorDifficulty: this.state.abEditorDifficulty,
      setEditorDifficulty: this.setEditorDifficulty,
      abEditorExplanation: this.state.abEditorExplanation,
      setEditorExplanation: this.setEditorExplanation,
      abEditorOptions: this.state.abEditorOptions,
      handleOptionTextChange: this.handleOptionTextChange,
      handleOptionCorrectToggle: this.handleOptionCorrectToggle,
      addOptionRow: this.addOptionRow,
      abEditorPairs: this.state.abEditorPairs,
      handlePairChange: this.handlePairChange,
      addPairRow: this.addPairRow,
      abEditorCorrectAnswer: this.state.abEditorCorrectAnswer,
      setEditorCorrectAnswer: this.setEditorCorrectAnswer,
      abEditorModelAnswer: this.state.abEditorModelAnswer,
      setEditorModelAnswer: this.setEditorModelAnswer,
      abEditorScenarioText: this.state.abEditorScenarioText,
      setEditorScenarioText: this.setEditorScenarioText,
      abEditorSubQuestions: this.state.abEditorSubQuestions,
      handleSubQChange: this.handleSubQChange,
      addSubQRow: this.addSubQRow,
      editEditorQuestion: this.editEditorQuestion,
      deleteEditorQuestion: this.deleteEditorQuestion,
      saveEditorQuestion: this.saveEditorQuestion,
      abOptionInputType: (() => {
        const sec = this.getAbSection(this.state.abManageSectionId);
        const meta = sec ? (SECTION_TYPE_META[sec.type] || {}) : {};
        return meta.singleCorrect ? "radio" : "checkbox";
      })(),
      abEditorHasOptions: (() => { const sec = this.getAbSection(this.state.abManageSectionId); return !!(sec && (SECTION_TYPE_META[sec.type] || {}).hasOptions); })(),
      abEditorHasPairs: (() => { const sec = this.getAbSection(this.state.abManageSectionId); return !!(sec && (SECTION_TYPE_META[sec.type] || {}).hasPairs); })(),
      abEditorHasCorrectAnswer: (() => { const sec = this.getAbSection(this.state.abManageSectionId); return !!(sec && (SECTION_TYPE_META[sec.type] || {}).hasCorrectAnswer); })(),
      abEditorHasSubQuestions: (() => { const sec = this.getAbSection(this.state.abManageSectionId); return !!(sec && (SECTION_TYPE_META[sec.type] || {}).hasSubQuestions); })(),
      abEditorHasScenario: (() => { const sec = this.getAbSection(this.state.abManageSectionId); return !!(sec && (SECTION_TYPE_META[sec.type] || {}).hasScenarioText); })(),
      abEditorIsSubjective: (() => {
        const sec = this.getAbSection(this.state.abManageSectionId);
        if (!sec) return false;
        const meta = SECTION_TYPE_META[sec.type] || {};
        return !!((meta.hasModelAnswer || meta.hasRubric) && !meta.hasSubQuestions && !meta.hasScenarioText);
      })(),
      abEditorRubricLabel: (() => {
        const sec = this.getAbSection(this.state.abManageSectionId);
        return sec && sec.type === "essay" ? "Rubric / Model Answer" : "Model Answer";
      })(),

      abDiagOpen: this.state.abDiagOpen,
      openAbDiag: this.openAbDiag,
      closeAbDiag: this.closeAbDiag,
      generateAssessment: this.generateAssessment,
      abGenerating: this.state.abGenerating,
      abGenerateLabel: this.state.abGenerating ? "💾 Saving…" : "💾 Save Assessment",

      abStatusReady: this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0,
      abStatusStyle: (this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0)
        ? { display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", fontSize: "14px", fontWeight: 600, background: "#DFF5EC", color: "#2E9E6B" }
        : { display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", fontSize: "14px", fontWeight: 600, background: "#FDF1D3", color: "#D48A0C" },
      abStatusLabel: (this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0) ? "✓ Ready to generate" : "⚠ Needs Objective",
      abSummaryText: "Sections " + this.state.abSections.length + " · Items " + this.state.abSections.reduce((a, s) => a + s.count, 0) + " · ~Time " + this.state.abSections.reduce((a, s) => a + Math.ceil(s.count * 2), 0) + "m · Points " + this.state.abSections.reduce((a, s) => a + s.count * s.pointsPer, 0),
      abGenerateBtnStyle: {
        padding: "10px 20px", borderRadius: "8px", fontFamily: "Nunito, sans-serif", fontSize: "15px", fontWeight: 700,
        cursor: (this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0 && !this.state.abGenerating) ? "pointer" : "not-allowed", border: "none",
        background: "#D9A94E", color: "#13231F", boxShadow: "0 4px 12px rgba(201,168,76,.28)",
        opacity: (this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0 && !this.state.abGenerating) ? 1 : 0.5,
      },
      abGenerateDisabled: !(this.state.abObjectiveText.trim().length > 10 && this.state.abSections.length > 0) || this.state.abGenerating,

      abDiagItems: this.state.abSections.reduce((a, s) => a + s.count, 0),
      abDiagPoints: this.state.abSections.reduce((a, s) => a + s.count * s.pointsPer, 0),
      abDiagMinutes: this.state.abSections.reduce((a, s) => a + Math.ceil(s.count * 2), 0),
      abDiagBars: (() => {
        const items = this.state.abSections.reduce((a, s) => a + s.count, 0);
        const easy = this.state.abSections.reduce((a, s) => a + s.questions.filter(q => q.difficulty === "Easy").length, 0);
        const medium = this.state.abSections.reduce((a, s) => a + s.questions.filter(q => q.difficulty === "Medium").length, 0);
        const hard = this.state.abSections.reduce((a, s) => a + s.questions.filter(q => q.difficulty === "Hard").length, 0);
        const pct = (n) => items ? Math.round(n / items * 100) : 0;
        return { easyPct: pct(easy), mediumPct: pct(medium), hardPct: pct(hard) };
      })(),
      abTypeDistribution: (() => {
        const map = {};
        this.state.abSections.forEach(s => { const t = (SECTION_TEMPLATES[s.type] || {}).title || s.type; map[t] = (map[t] || 0) + s.count; });
        const total = this.state.abSections.reduce((a, s) => a + s.count, 0);
        return Object.entries(map).map(([name, count]) => ({ name, count, pct: total ? Math.round(count / total * 100) : 0 }));
      })(),
      abHasTypeDistribution: this.state.abSections.length > 0,
      abAlignmentDotStyle: {
        width: "10px", height: "10px", borderRadius: "50%",
        background: this.state.abObjectiveText.trim().length > 10 ? "#2E9E6B" : "#D48A0C",
      },

      isCurriculumMap: view === "curriculumMap",
      curriculumRows: curriculumUnitRows,
      okfAlignFilters: this.state.okfAlignmentFilters,
      handleOkfAlignmentFilterChange: this.handleOkfAlignmentFilterChange,
      okfAlignClassOptions: CLASSES,
      okfAlignSubjectOptions: [...new Set(CLASSES.filter(c => this.state.okfAlignmentFilters.classId === "all" || c.id === this.state.okfAlignmentFilters.classId).map(c => c.subject))],
      okfAlignTopicOptions: OKF_LIBRARY.chapters.flatMap(ch => ch.topics.map(t => ({ id: t.id, label: `Ch.${ch.number} — ${t.title}`, chapterId: ch.id }))),
      okfSyllabusCoverageRows: OKF_LIBRARY.chapters
        .filter(ch => {
          const topicFilter = this.state.okfAlignmentFilters.topicId;
          if (topicFilter === "all") return true;
          const t = OKF_LIBRARY.chapters.flatMap(c => c.topics.map(tp => ({ ...tp, chapterId: c.id }))).find(t => t.id === topicFilter);
          return t && t.chapterId === ch.id;
        })
        .map(ch => {
        const { classId, subject } = this.state.okfAlignmentFilters;
        const linked = this.state.schoolConfig.curriculum.filter(u => u.okfChapterId === ch.id && u.academicYear === "2026–27"
          && (classId === "all" || u.classId === classId)
          && (subject === "all" || u.subject === subject));
        const avgActual = linked.length ? Math.round(linked.reduce((a, u) => a + Number(u.actual || 0), 0) / linked.length) : 0;
        return {
          id: ch.id, number: ch.number, title: ch.title,
          linked: linked.length > 0,
          notLinked: linked.length === 0,
          coverage: avgActual,
          barStyle: this.barFillStyle(avgActual, "#3F6E62"),
          linkedUnitsLabel: linked.map(u => u.unit + " — " + this.classNameById(u.classId)).join(", "),
        };
      }),
      viewOkfChapterFromSyllabus: this.viewOkfChapterFromSyllabus,

      isCourseProgress: view === "courseProgress",
      courseProgressRows: curriculumUnitRows,

      curriculumFilters: this.state.curriculumFilters,
      handleCurriculumFilterChange: this.handleCurriculumFilterChange,
      academicYearsOptions: ACADEMIC_YEARS,
      weightageOptions: WEIGHTAGE_LEVELS,
      curriculumFlash: this.state.curriculumFlash,
      toggleUnitExpanded: this.toggleUnitExpanded,
      toggleTopicDone: this.toggleTopicDone,
      copyFromPreviousYear: this.copyFromPreviousYear,
      openBulkUpload: this.openBulkUpload,
      closeBulkUpload: this.closeBulkUpload,
      exportCurriculumCSV: this.exportCurriculumCSV,
      bulkUploadOpen: this.state.bulkUploadOpen,
      bulkUploadText: this.state.bulkUploadText,
      handleBulkFieldChange: this.handleBulkFieldChange,
      handleBulkFile: this.handleBulkFile,
      submitBulkUpload: this.submitBulkUpload,
      handleModalTopicChange: this.handleModalTopicChange,
      addModalTopic: this.addModalTopic,
      removeModalTopic: this.removeModalTopic,

      isSettings: view === "settings" && role === "admin",
      settingsTab: this.state.settingsTab,
      isSettingsTimetable: this.state.settingsTab === "timetable",
      isSettingsCurriculum: this.state.settingsTab === "curriculum",
      isSettingsExam: this.state.settingsTab === "exam",
      isSettingsCalendar: this.state.settingsTab === "calendar",
      settingsTabStyle: (t) => this.settingsTabStyle(t),
      tabStyleSettingsTimetable: this.settingsTabStyle("timetable"),
      tabStyleSettingsCurriculum: this.settingsTabStyle("curriculum"),
      tabStyleSettingsExam: this.settingsTabStyle("exam"),
      tabStyleSettingsCalendar: this.settingsTabStyle("calendar"),
      handleSettingsTabClick: this.handleSettingsTabClick,

      timetableRows: this.state.schoolConfig.timetable.map(r => ({ ...r, className: this.classNameById(r.classId) })),
      settingsCurriculumRows: curriculumUnitRows,
      settingsExamRows: this.filteredExamSchedule().map(r => this.buildExamRow(r)),
      examFilters: this.state.examFilters,
      handleExamFilterChange: this.handleExamFilterChange,
      calendarRows: [...this.state.schoolConfig.academicCalendar].sort((a, b) => parseShortDate(a.date) - parseShortDate(b.date)),
      calendarTypeOptions: CALENDAR_TYPES,
      openAddCalendar: this.openAddModal("calendar"),
      openEditCalendar: this.openEditModal("calendar"),
      deleteCalendarRow: this.deleteSettingsRow("calendar"),
      difficultyOptions: DIFFICULTY_LEVELS,
      toggleExamCoverageUnit: this.toggleExamCoverageUnit,
      toggleExamExpanded: this.toggleExamExpanded,
      examCoverageOptionsForModal: this.state.settingsModal && this.state.settingsModal.form.classId
        ? this.state.schoolConfig.curriculum.filter(u => u.classId === this.state.settingsModal.form.classId)
          .map(u => ({ ...u, checked: (this.state.settingsModal.form.coverageUnitIds || []).includes(u.id) }))
        : [],
      dependsOnOptionsForModal: this.state.settingsModal && this.state.settingsModal.form.classId
        ? this.state.schoolConfig.curriculum.filter(u => u.classId === this.state.settingsModal.form.classId && u.id !== this.state.settingsModal.editingId)
        : [],
      hasNoCoverageOptions: !(this.state.settingsModal && this.state.settingsModal.form.classId
        && this.state.schoolConfig.curriculum.some(u => u.classId === this.state.settingsModal.form.classId)),

      timetableFilters: this.state.timetableFilters,
      handleTimetableFilterChange: this.handleTimetableFilterChange,
      sectionsOptions: MT_SECTIONS,
      teacherNameOptions,
      timetableSubView: this.state.timetableSubView,
      setTimetableSubView: this.setTimetableSubView,
      isTimetableClassView: this.state.timetableSubView === "class",
      isTimetableTeacherView: this.state.timetableSubView === "teacher",
      isTimetableSummaryView: this.state.timetableSubView === "summary",
      timetableSubTabStyle: (v) => ({
        padding: "9px 16px", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer",
        background: this.state.timetableSubView === v ? "#111827" : "transparent", color: this.state.timetableSubView === v ? "#fff" : "#6B7280",
      }),
      dayColumns: MT_DAYS,
      globalContextLabel: this.sectionLabel(this.state.globalContext.sectionId) + " · " + this.state.globalContext.year,
      selectedSectionLabel: this.sectionLabel(this.state.timetableFilters.sectionId),
      masterTimetableSectionRows,
      classGridRows, teacherGridRows, teacherTotalPeriods, teacherFreePeriods,
      periodAllocationRows, totalWeeklyPeriods, effectiveTeachingDaysLabel,
      ttConflictMessages: ttConflicts.messages,
      hasTtConflicts: ttConflicts.messages.length > 0,
      timetableFlash: this.state.timetableFlash,
      copyTimetableFromPreviousYear: this.copyTimetableFromPreviousYear,
      exportTimetableCSV: this.exportTimetableCSV,
      openTimetableBulk: this.openTimetableBulk,
      closeTimetableBulk: this.closeTimetableBulk,
      timetableBulkOpen: this.state.timetableBulkOpen,
      timetableBulkText: this.state.timetableBulkText,
      handleTimetableBulkFieldChange: this.handleTimetableBulkFieldChange,
      handleTimetableBulkFile: this.handleTimetableBulkFile,
      submitTimetableBulk: this.submitTimetableBulk,
      masterSubjectsOptions: MASTER_SUBJECTS,
      handleMasterSubjectChange: this.handleMasterSubjectChange,
      periodsOptions: MT_PERIODS,

      openAddMasterTimetable: this.openAddModal("masterTimetable"),
      openEditMasterTimetable: this.openEditModal("masterTimetable"),
      deleteMasterTimetableRow: this.deleteSettingsRow("masterTimetable"),

      openAddTimetable: this.openAddModal("timetable"),
      openEditTimetable: this.openEditModal("timetable"),
      deleteTimetableRow: this.deleteSettingsRow("timetable"),
      openAddCurriculum: this.openAddModal("curriculum"),
      openEditCurriculum: this.openEditModal("curriculum"),
      deleteCurriculumRow: this.deleteSettingsRow("curriculum"),
      openAddExam: this.openAddModal("exam"),
      openEditExam: this.openEditModal("exam"),
      deleteExamRow: this.deleteSettingsRow("exam"),

      settingsModal: this.state.settingsModal,
      modalOpen: !!this.state.settingsModal,
      modalIsTimetable: this.state.settingsModal && this.state.settingsModal.type === "timetable",
      modalIsCurriculum: this.state.settingsModal && this.state.settingsModal.type === "curriculum",
      modalIsExam: this.state.settingsModal && this.state.settingsModal.type === "exam",
      modalIsMasterTimetable: this.state.settingsModal && this.state.settingsModal.type === "masterTimetable",
      modalIsAdd: this.state.settingsModal && this.state.settingsModal.mode === "add",
      modalForm: this.state.settingsModal ? this.state.settingsModal.form : {},
      modalTitle: this.state.settingsModal ? ({
        timetable: (this.state.settingsModal.mode === "add" ? "Add" : "Edit") + " Timetable Slot",
        curriculum: (this.state.settingsModal.mode === "add" ? "Add" : "Edit") + " Syllabus Unit",
        exam: (this.state.settingsModal.mode === "add" ? "Add" : "Edit") + " Exam",
        masterTimetable: (this.state.settingsModal.mode === "add" ? "Add" : "Edit") + " Timetable Slot",
        calendar: (this.state.settingsModal.mode === "add" ? "Add" : "Edit") + " Calendar Entry",
      }[this.state.settingsModal.type]) : "",
      modalIsCalendar: this.state.settingsModal && this.state.settingsModal.type === "calendar",
      modalAutoEndSuggestion: (this.state.settingsModal && this.state.settingsModal.type === "curriculum")
        ? (this.computeAutoPlannedEnd(this.state.settingsModal.form.classId, this.state.settingsModal.form.plannedStart, this.state.settingsModal.form.periods, this.state.settingsModal.form.academicYear) || {}).endDate || ""
        : "",
      useModalAutoEnd: this.useModalAutoEnd,
      daysOfWeek: DAYS_OF_WEEK,
      termsOptions: TERMS,
      examTypesOptions: EXAM_TYPES,
      classOptionsAll: CLASSES,
      handleModalFieldChange: this.handleModalFieldChange,
      closeSettingsModal: this.closeSettingsModal,
      saveSettingsModal: this.saveSettingsModal,

      isAssignments: view === "assignments",
      assignmentRows: this.state.schoolConfig.assignments.map(r => {
        const submitted = r.submissions.filter(s => s.status === "submitted" || s.status === "late").length;
        return { ...r, className: this.classNameById(r.classId), statusStyle: this.assignmentStatusStyle(r.status), submitted, total: r.submissions.length };
      }),
      assignmentStatusStyle: (s) => this.assignmentStatusStyle(s),
      openNewAssignmentModal: this.openNewAssignmentModal,
      closeNewAssignmentModal: this.closeNewAssignmentModal,
      newAssignmentModalOpen: this.state.newAssignmentModalOpen,
      newAssignmentForm: this.state.newAssignmentForm,
      handleNewAssignmentFieldChange: this.handleNewAssignmentFieldChange,
      submitNewAssignment: this.submitNewAssignment,
      classOptionsForAssignment: CLASSES,

      isHomeworkTracker: view === "homeworkTracker",
      homeworkFlash: this.state.homeworkFlash,
      homeworkRows: this.state.schoolConfig.assignments.map(r => {
        const submitted = r.submissions.filter(s => s.status === "submitted" || s.status === "late").length;
        const total = r.submissions.length;
        const rosterRows = r.submissions.map(s => {
          const student = STUDENTS.find(st => st.id === s.studentId) || { name: "Unknown" };
          const st = this.submissionStatusStyle(s.status);
          return {
            ...s, studentName: student.name, rollNo: student.rollNo,
            statusLabel: st.label, statusChipStyle: { fontSize: "13px", fontWeight: 600, padding: "3px 9px", borderRadius: "999px", background: st.bg, color: st.color, whiteSpace: "nowrap" },
            canScore: s.status === "submitted" || s.status === "late",
            scoreValue: s.score == null ? "" : s.score,
          };
        });
        return {
          ...r, className: this.classNameById(r.classId), barStyle: this.barFillStyle(total ? (submitted / total * 100).toFixed(0) : 0, "#F59E0B"),
          submitted, total, statusStyle: this.assignmentStatusStyle(r.status),
          expanded: !!this.state.homeworkExpanded[r.id], expandArrow: this.state.homeworkExpanded[r.id] ? "▾" : "▸",
          rosterRows,
        };
      }),
      toggleHomeworkExpanded: this.toggleHomeworkExpanded,
      handleScoreChange: this.handleScoreChange,

      isExams: view === "exams",
      examRows: this.filteredExamSchedule().map(r => this.buildExamRow(r)),

      isAttendance: view === "attendance",
      attendanceRows: STUDENTS.map(r => ({ ...r, statusStyle: this.statusBadgeStyle(r.status) })),
      statusBadgeStyle: (s) => this.statusBadgeStyle(s),

      isBehavior: view === "behavior",
      behaviorRows: BEHAVIOR_NOTES.map(r => ({ ...r, className: this.classNameById(r.classId), badgeStyle: this.behaviorBadgeStyle(r.type) })),
      behaviorBadgeStyle: (t) => this.behaviorBadgeStyle(t),

      isGradebook: view === "gradebook",
      gradebookFilters: this.state.gradebookFilters,
      gradebookGradeOptions: [...new Set(MT_SECTIONS.map(sec => sec.grade))].sort((a, b) => a - b).map(g => ({ id: String(g), name: `Grade ${g}` })),
      gradebookSectionOptions: MT_SECTIONS
        .filter(sec => this.state.gradebookFilters.grade === "all" || sec.grade === Number(this.state.gradebookFilters.grade))
        .map(sec => ({ id: sec.id, name: `Section ${sec.section}` })),
      handleGradebookFilterChange: this.handleGradebookFilterChange,
      gradebookRows: STUDENTS.filter(st => {
        const cls = CLASSES.find(c => c.id === st.classId);
        if (!cls) return false;
        const sec = MT_SECTIONS.find(s => s.id === cls.sectionId);
        if (!sec) return false;
        const f = this.state.gradebookFilters;
        if (f.grade !== "all" && sec.grade !== Number(f.grade)) return false;
        if (f.section !== "all" && sec.id !== f.section) return false;
        return true;
      }),
      okfChapterPerfRows: OKF_QUESTION_BANK.chapters.map(ch => {
        const perf = OKF_CHAPTER_PERFORMANCE.find(p => p.chapterId === ch.id) || { avgScore: 0, questionsGraded: 0 };
        const weak = perf.avgScore < 65;
        const barColor = weak ? "#D97706" : (perf.avgScore >= 80 ? "#16A34A" : "#3D5A60");
        return {
          id: ch.id, number: ch.number, title: ch.title,
          okf_ref: "OKF/CBSE/X/MATH/" + ch.id.toUpperCase(),
          avgScore: perf.avgScore, questionsGraded: perf.questionsGraded, weak,
          barStyle: `width:${perf.avgScore}%; height:100%; background:${barColor}; border-radius:999px;`,
        };
      }),

      isStudentProgress: view === "studentProgress",
      progressRows: STUDENTS.map(r => ({ ...r, statusStyle: this.statusBadgeStyle(r.status), barStyle: this.barFillStyle(r.attendance, r.status==='at-risk' ? '#DC2626' : '#16A34A') })),

      isAnalytics: view === "analytics",
      atRiskStudents: STUDENTS.filter(s => s.status === "at-risk"),

      isResources: view === "resources",
      resourceRows: RESOURCES.map(r => ({ ...r, className: this.classNameById(r.classId) })),
      okfChapterRows: OKF_LIBRARY.chapters.map(ch => ({
        ...ch,
        expanded: !!this.state.okfExpandedChapters[ch.id],
        expandArrow: this.state.okfExpandedChapters[ch.id] ? "▾" : "▸",
        topics: ch.topics.map(tp => ({
          ...tp,
          resources: tp.resources.map(r => ({ ...r, icon: RESOURCE_TYPE_ICON[r.type] || "📄" })),
        })),
      })),
      toggleOkfChapter: this.toggleOkfChapter,
      openNotifyModal: this.openNotifyModal,
      closeNotifyModal: this.closeNotifyModal,
      notifyModal: this.state.notifyModal,
      handleNotifyFieldChange: this.handleNotifyFieldChange,
      submitNotify: this.submitNotify,
      resourceFlash: this.state.resourceFlash,
      classOptionsForNotify: CLASSES,

      isAnnouncements: view === "announcements",
      announcementRows: this.state.schoolConfig.announcements,

      isUpcomingTasks: view === "upcomingTasks",
      taskRows: TASKS.map(t => ({ ...t, done: this.state.taskDone[t.id] ?? t.done }))
        .map(t => ({ ...t, checkStyle: this.checkboxStyle(t.done), checkLabel: this.checkboxLabel(t.done), dotStyle: this.priorityDotStyle(t.priority) })),
      toggleTask: this.toggleTask,
      checkboxStyle: (d) => this.checkboxStyle(d),
      checkboxLabel: (d) => this.checkboxLabel(d),

      isParentCommunication: view === "parentCommunication",
      messageRows: PARENT_MESSAGES,

      isReports: view === "reports",
      reportRows: REPORTS,
    };
  }
}

