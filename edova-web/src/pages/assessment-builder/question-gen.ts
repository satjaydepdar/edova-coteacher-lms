/**
 * Question-generation engine for the Assessment Builder — extracted from the
 * page. ONE registry per section type carries its palette presentation
 * (icon/title/colors) and its answer-shape metadata (which fields the editor
 * shows and how saveQuestion packs the payload). Question CONTENT comes from
 * the AI blueprint generator or manual authoring — the old static bank and
 * placeholder generators were removed as dummy data.
 */
import type { BuiltQuestion } from "@/lib/types"

export interface SectionTypeMeta {
  hasOptions?: boolean
  singleCorrect?: boolean
  defaultOptions?: number
  fixed?: boolean
  hasPairs?: boolean
  defaultPairs?: number
  hasCorrectAnswer?: boolean
  hasModelAnswer?: boolean
  hasScenarioText?: boolean
  hasSubQuestions?: boolean
  hasRubric?: boolean
}

export interface SectionRegistryEntry extends SectionTypeMeta {
  icon: string
  title: string
  bg: string
  iconColor: string
}

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  multiple_choice: { icon: "☰", title: "Multiple Choice", bg: "#E0F2FE", iconColor: "#0369A1", hasOptions: true, singleCorrect: true, defaultOptions: 4 },
  multi_select: { icon: "☑", title: "Multi-Select", bg: "#F3E8FF", iconColor: "#7C3AED", hasOptions: true, singleCorrect: false, defaultOptions: 4 },
  true_false: { icon: "⊘", title: "True/False", bg: "#DCFCE7", iconColor: "#15803D", hasOptions: true, singleCorrect: true, defaultOptions: 2, fixed: true },
  matching: { icon: "🔗", title: "Matching", bg: "#FFEDD5", iconColor: "#C2410C", hasPairs: true, defaultPairs: 4 },
  fill_blank: { icon: "✎", title: "Fill in the Blank", bg: "#FEF9C3", iconColor: "#A16207", hasCorrectAnswer: true },
  short_answer: { icon: "🔍", title: "Short Answer", bg: "#E0E7FF", iconColor: "#4338CA", hasModelAnswer: true },
  scenario: { icon: "📄", title: "Scenario-Based", bg: "#FCE7F3", iconColor: "#BE185D", hasScenarioText: true, hasModelAnswer: true },
  multi_part: { icon: "🧩", title: "Multi-Part", bg: "#ECFDF5", iconColor: "#047857", hasSubQuestions: true, hasModelAnswer: true },
  essay: { icon: "💬", title: "Essay", bg: "#F5F3FF", iconColor: "#6D28D9", hasRubric: true },
  okf_import: { icon: "🔗", title: "OKF Import", bg: "#E9F1EC", iconColor: "#16332B" },
}

/** Derived views kept for the page's existing consumption sites. */
const derive = <V,>(pick: (e: SectionRegistryEntry) => V) =>
  Object.fromEntries(Object.entries(SECTION_REGISTRY).map(([k, e]) => [k, pick(e)]))

export const SECTION_TEMPLATES = derive(({ icon, title, bg, iconColor }) => ({ icon, title, bg, iconColor }))
export const SECTION_TYPE_META: Record<string, SectionTypeMeta> = derive((e) => e)

export type RawQuestion = Omit<
  BuiltQuestion,
  "hasOptions" | "hasPairs" | "hasAnswer" | "hasRubric" | "hasModel" | "hasSubQ" | "hasScenario" | "hasVideo"
>

export function normalizeQuestion(raw: RawQuestion): BuiltQuestion {
  return {
    ...raw,
    hasOptions: !!(raw.options && raw.options.length),
    hasPairs: !!(raw.pairs && raw.pairs.length),
    hasAnswer: raw.correctAnswer !== undefined && raw.correctAnswer !== null,
    hasRubric: !!raw.rubric,
    hasModel: !!raw.modelAnswer && !raw.rubric && !(raw.subQuestions && raw.subQuestions.length),
    hasSubQ: !!(raw.subQuestions && raw.subQuestions.length),
    hasScenario: !!raw.scenarioText,
    hasVideo: !!raw.videoThumbnail,
  }
}

export function nextSectionLabel(count: number) {
  return String.fromCharCode(65 + count)
}

export const SECTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

let qSeq = 0
export function nextId(prefix: string) {
  qSeq += 1
  return prefix + "_" + Date.now() + "_" + qSeq
}
