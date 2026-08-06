// The Assessment Builder's five modals, extracted from the page. All state
// stays in the page; these are controlled components.
import { useEffect, useRef } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { OKF_QUESTION_BANK } from "@/data/seed"
import type { AssessmentSection, QPair, QSub } from "@/lib/types"
import {
  SECTION_TYPE_META,
  type SectionTypeMeta,
} from "./question-gen"
import {
  ModalShell,
  editorInput,
  editorSectionLabel,
  editorTextarea,
  modalOverlay,
  secondaryBtn,
} from "./styles"

/* ------------------------------------------------------------------ */
/* Difficulty demand bar (also used inline by the page's section cards) */
/* ------------------------------------------------------------------ */
export function DemandBar({ easy, medium, hard, width, height = 6 }: { easy: number; medium: number; hard: number; width?: number | string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 999, background: "#E5E7EB", display: "flex", overflow: "hidden", width }}>
      <span style={{ height: "100%", background: "#2E9E6B", width: `${easy}%` }} />
      <span style={{ height: "100%", background: "#D48A0C", width: `${medium}%` }} />
      <span style={{ height: "100%", background: "#C0392B", width: `${hard}%` }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Editor state (managed by the page, shaped here)                     */
/* ------------------------------------------------------------------ */
export interface EditorState {
  text: string
  difficulty: string
  explanation: string
  options: { text: string; correct: boolean }[]
  pairs: QPair[]
  correctAnswer: string
  modelAnswer: string
  scenarioText: string
  subQuestions: QSub[]
}

export function emptyEditorFor(type: string | null): EditorState {
  const meta = type ? SECTION_TYPE_META[type] || {} : {}
  return {
    text: "",
    difficulty: "Easy",
    explanation: "",
    options: meta.hasOptions ? Array.from({ length: meta.defaultOptions || 4 }, (_, i) => ({ text: meta.fixed ? (i === 0 ? "True" : "False") : "", correct: false })) : [],
    pairs: meta.hasPairs ? Array.from({ length: meta.defaultPairs || 4 }, () => ({ left: "", right: "" })) : [],
    correctAnswer: "",
    modelAnswer: "",
    scenarioText: "",
    subQuestions: meta.hasSubQuestions ? Array.from({ length: 2 }, () => ({ text: "", answer: "" })) : [],
  }
}

/* ------------------------------------------------------------------ */
/* Assign-from-bank modal                                              */
/* ------------------------------------------------------------------ */
export interface AssignModalState {
  bankId: string
  classId: string
  due: string
  totalPoints: number | string
}

export function AssignModal({
  state,
  onChange,
  onConfirm,
  onClose,
  classNameById,
}: {
  state: AssignModalState
  onChange: (s: AssignModalState) => void
  onConfirm: () => void
  onClose: () => void
  classNameById: (id: string) => string
}) {
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 440, padding: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#13231F", marginBottom: 16 }}>Assign to Class</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Class &amp; Section</div>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: "#13231F", background: "#fff", border: "1px solid #DDD8CF", borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>{classNameById(state.classId)}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Due Date</div>
        <input value={state.due} onChange={(e) => onChange({ ...state, due: e.target.value })} placeholder="e.g. Jul 20" style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #DDD8CF", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 14 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Total Points</div>
        <input value={state.totalPoints} type="number" onChange={(e) => onChange({ ...state, totalPoints: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #DDD8CF", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 4 }} />
        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 18 }}>Publishes immediately to every student in this class.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
          <div onClick={onClose} style={{ fontSize: 14.5, fontWeight: 600, color: "#374151", background: "#fff", border: "1px solid #DDD8CF", padding: "9px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</div>
          <div onClick={onConfirm} style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", background: "#16332B", padding: "9px 18px", borderRadius: 8, cursor: "pointer" }}>Assign &amp; Publish</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* OKF import modal                                                    */
/* ------------------------------------------------------------------ */
export function OkfImportModal({
  okfExpanded,
  setOkfExpanded,
  okfSelected,
  setOkfSelected,
  selectedCount,
  onConfirm,
  onClose,
}: {
  okfExpanded: Record<string, boolean>
  setOkfSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setOkfExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  okfSelected: Record<string, boolean>
  selectedCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <ModalShell
      title={<>Import from OKF <span style={{ fontSize: 12, fontWeight: 700, color: "#16332B", background: "#E9F1EC", padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>CBSE · Class 10 · Mathematics</span></>}
      onClose={onClose}
      maxWidth={720}
      footer={
        <>
          <span style={{ fontSize: 14, color: "#3D5A60", fontWeight: 600 }}>{selectedCount} question(s) selected</span>
          <div style={{ display: "flex", gap: 10 }}>
            <div onClick={onClose} style={{ background: "#fff", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
            <div onClick={onConfirm} style={{ background: "#16332B", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Add to Assessment</div>
          </div>
        </>
      }
    >
      <div style={{ fontSize: 13, color: "#7A9298", marginTop: -10, marginBottom: 12 }}>Browse chapter → topic, tick questions to add as a new section.</div>
      {OKF_QUESTION_BANK.chapters.map((ch) => {
        const expanded = !!okfExpanded[ch.id]
        return (
          <div key={ch.id} style={{ background: "#fff", border: "1px solid #DDD8CF", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => setOkfExpanded((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}>
              <span style={{ color: "#9CA3AF", display: "inline-flex" }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#13231F" }}>Chapter {ch.number}: {ch.title}</div>
            </div>
            {expanded && (
              <div style={{ padding: "0 16px 14px" }}>
                {ch.topics.map((tp) => (
                  <div key={tp.id} style={{ padding: "8px 0", borderTop: "1px solid #F1F0EA" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{tp.title}</div>
                    {tp.questions.map((q) => (
                      <div key={q.id} onClick={() => setOkfSelected((prev) => ({ ...prev, [q.id]: !prev[q.id] }))} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!okfSelected[q.id]} readOnly style={{ width: 15, height: 15, marginTop: 2, accentColor: "#16332B", cursor: "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: "#111827" }}>{q.text}</div>
                          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{q.type} · {q.marks} pts · {q.okf_ref}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
export function ManageQuestionsModal({
  manageTitle,
  manageMeta,
  editor,
  setEditor,
  optionInputType,
  isSubjective,
  rubricLabel,
  section,
  editingIndex,
  onSave,
  onEdit,
  onDelete,
  onCancelEdit,
  onClose,
}: {
  manageTitle: string
  manageMeta: SectionTypeMeta
  editor: EditorState
  setEditor: (e: EditorState) => void
  optionInputType: string
  isSubjective: boolean
  rubricLabel: string
  section: AssessmentSection
  // 1-based position of the question being edited; 0 = adding a new one.
  editingIndex: number
  onSave: () => void
  onEdit: (qid: string) => void
  onDelete: (qid: string) => void
  onCancelEdit: () => void
  onClose: () => void
}) {
  // Clicking Edit on a question far down the list loads it into the editor
  // ABOVE — scroll the editor back into view so the change is visible.
  const editorTopRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (editingIndex > 0) editorTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [editingIndex])
  const textMissing = !editor.text.trim()
  return (
    <ModalShell
      title={<>Manage Questions — {manageTitle}</>}
      onClose={onClose}
      footer={<div onClick={onClose} style={{ ...secondaryBtn, padding: "8px 16px", marginLeft: "auto" }}>Close</div>}
    >
      {editingIndex > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "#FDF1D3", border: "1px solid #F0DFA8", fontSize: 14, fontWeight: 600, color: "#8A6100" }}>
          Editing question {editingIndex} — Save Question will update it.
          <span onClick={onCancelEdit} style={{ marginLeft: "auto", cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>Cancel edit</span>
        </div>
      )}
      <div style={{ marginBottom: 14 }} ref={editorTopRef}>
        <div style={editorSectionLabel}>Question Text</div>
        <textarea value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} placeholder="Enter your question here..." style={editorTextarea} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={editorSectionLabel}>Difficulty</div>
        <select value={editor.difficulty} onChange={(e) => setEditor({ ...editor, difficulty: e.target.value })} style={{ maxWidth: 180, fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit" }}>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {manageMeta.hasOptions && (
        <>
          <div style={editorSectionLabel}>Options &amp; Correct Answer</div>
          {editor.options.map((opt, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => setEditor({ ...editor, options: editor.options.map((o, oi) => (oi === i ? { ...o, text: e.target.value } : o)) })}
                placeholder="Option text"
                style={{ ...editorInput, flex: 1 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#3D5A60", cursor: "pointer", whiteSpace: "nowrap" }}>
                <input
                  type={optionInputType}
                  name="ab-editor-correct"
                  checked={opt.correct}
                  onChange={() =>
                    setEditor({
                      ...editor,
                      options: editor.options.map((o, oi) => (manageMeta.singleCorrect ? { ...o, correct: oi === i } : oi === i ? { ...o, correct: !o.correct } : o)),
                    })
                  }
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                Correct
              </label>
            </div>
          ))}
          <div onClick={() => setEditor({ ...editor, options: [...editor.options, { text: "", correct: false }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", marginTop: 6 }}>+ Add Option</div>
        </>
      )}

      {manageMeta.hasPairs && (
        <>
          <div style={editorSectionLabel}>Matching Pairs</div>
          {editor.pairs.map((pair, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <input type="text" value={pair.left} onChange={(e) => setEditor({ ...editor, pairs: editor.pairs.map((p, pi) => (pi === i ? { ...p, left: e.target.value } : p)) })} placeholder="Left item" style={{ ...editorInput, flex: 1 }} />
              <span style={{ color: "#7A9298" }}>↔</span>
              <input type="text" value={pair.right} onChange={(e) => setEditor({ ...editor, pairs: editor.pairs.map((p, pi) => (pi === i ? { ...p, right: e.target.value } : p)) })} placeholder="Right item" style={{ ...editorInput, flex: 1 }} />
            </div>
          ))}
          <div onClick={() => setEditor({ ...editor, pairs: [...editor.pairs, { left: "", right: "" }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", marginTop: 6 }}>+ Add Pair</div>
        </>
      )}

      {manageMeta.hasCorrectAnswer && (
        <>
          <div style={editorSectionLabel}>Correct Answer</div>
          <input type="text" value={editor.correctAnswer} onChange={(e) => setEditor({ ...editor, correctAnswer: e.target.value })} placeholder="Enter the correct answer" style={{ ...editorInput, width: "100%", padding: "9px 12px" }} />
        </>
      )}

      {manageMeta.hasScenarioText && (
        <>
          <div style={editorSectionLabel}>Scenario Text</div>
          <textarea value={editor.scenarioText} onChange={(e) => setEditor({ ...editor, scenarioText: e.target.value })} placeholder="Describe the scenario here..." style={{ ...editorTextarea, marginBottom: 12 }} />
          <div style={editorSectionLabel}>Model Answer</div>
          <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter expected model answer..." style={editorTextarea} />
        </>
      )}

      {manageMeta.hasSubQuestions && (
        <>
          <div style={editorSectionLabel}>Sub-questions</div>
          {editor.subQuestions.map((sq, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              <input type="text" value={sq.text} onChange={(e) => setEditor({ ...editor, subQuestions: editor.subQuestions.map((s, si) => (si === i ? { ...s, text: e.target.value } : s)) })} placeholder="Sub-question" style={editorInput} />
              <input type="text" value={sq.answer} onChange={(e) => setEditor({ ...editor, subQuestions: editor.subQuestions.map((s, si) => (si === i ? { ...s, answer: e.target.value } : s)) })} placeholder="Answer" style={editorInput} />
            </div>
          ))}
          <div onClick={() => setEditor({ ...editor, subQuestions: [...editor.subQuestions, { text: "", answer: "" }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", margin: "6px 0 12px" }}>+ Add Sub-question</div>
          <div style={editorSectionLabel}>Model Answer / Rubric</div>
          <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter model answer covering all parts..." style={editorTextarea} />
        </>
      )}

      {isSubjective && (
        <>
          <div style={editorSectionLabel}>{rubricLabel}</div>
          <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter model answer or rubric..." style={{ ...editorTextarea, minHeight: 70 }} />
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={editorSectionLabel}>Explanation (optional)</div>
        <textarea value={editor.explanation} onChange={(e) => setEditor({ ...editor, explanation: e.target.value })} placeholder="Explain why the correct answer is right..." style={{ ...editorTextarea, minHeight: 50 }} />
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #DDD8CF", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          onClick={onSave}
          style={{ background: "#D9A94E", color: "#13231F", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: textMissing ? "not-allowed" : "pointer", display: "inline-block", opacity: textMissing ? 0.5 : 1 }}
        >
          {editingIndex > 0 ? "💾 Update Question" : "💾 Save Question"}
        </div>
        {textMissing && (
          <span style={{ fontSize: 13.5, color: "#B45309", fontWeight: 600 }}>Enter the question text above first.</span>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#13231F", marginBottom: 10 }}>Questions in this Section</div>
        {section.questions.map((q, i) => (
          <div key={q.id} style={{ padding: 12, background: "#F5F1E6", border: i + 1 === editingIndex ? "2px solid #D9A94E" : "1px solid #D8E8E4", borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#13231F", flex: 1 }}>{i + 1}. {q.text}</div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", background: "#DFF5EC", color: "#2E9E6B", flexShrink: 0 }}>{q.difficulty}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <div onClick={() => onEdit(q.id)} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</div>
              <div onClick={() => onDelete(q.id)} style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,.2)", color: "#C0392B", padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/* Diagnostics modal                                                   */
/* ------------------------------------------------------------------ */
export interface DiagnosticsData {
  easyPct: number
  mediumPct: number
  hardPct: number
  typeDist: { name: string; count: number; pct: number }[]
}

export function DiagnosticsModal({
  totalItems,
  totalPoints,
  totalMinutes,
  diag,
  objectiveComplete,
  onClose,
}: {
  totalItems: number
  totalPoints: number
  totalMinutes: number
  diag: DiagnosticsData
  objectiveComplete: boolean
  onClose: () => void
}) {
  return (
    <ModalShell
      title="Assessment Overview"
      onClose={onClose}
      maxWidth={480}
      footer={<div onClick={onClose} style={{ ...secondaryBtn, padding: "8px 16px", marginLeft: "auto" }}>Close</div>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>{totalItems}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Items</div></div>
        <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>{totalPoints}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Points</div></div>
        <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>~{totalMinutes}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Minutes</div></div>
      </div>
      <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "0 0 10px", fontWeight: 700 }}>Difficulty Distribution</div>
      <DemandBar easy={diag.easyPct} medium={diag.mediumPct} hard={diag.hardPct} width="100%" height={10} />
      <div style={{ display: "flex", gap: 16, fontSize: 14, marginTop: 8 }}><span>🟢 Easy {diag.easyPct}%</span><span>🟡 Medium {diag.mediumPct}%</span><span>🔴 Hard {diag.hardPct}%</span></div>

      <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "18px 0 10px", fontWeight: 700 }}>Question Types</div>
      {diag.typeDist.length > 0 ? (
        diag.typeDist.map((td) => (
          <div key={td.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 15 }}>
            <span style={{ width: 120, flexShrink: 0, color: "#13231F" }}>{td.name}</span>
            <div style={{ flex: 1, height: 8, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 999, background: "#4A7C6F", width: `${td.pct}%` }} /></div>
            <span style={{ width: 28, textAlign: "right", fontWeight: 700, color: "#3D5A60" }}>{td.count}</span>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 15, color: "#7A9298" }}>No sections yet</div>
      )}

      <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "18px 0 10px", fontWeight: 700 }}>Alignment Coverage</div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#FFFFFF", borderRadius: 8 }}>
        <span style={{ fontSize: 15, color: "#13231F" }}>Learning Objective</span>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: objectiveComplete ? "#2E9E6B" : "#D48A0C" }} />
      </div>
    </ModalShell>
  )
}
