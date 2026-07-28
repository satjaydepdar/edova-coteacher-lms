# Master Prompt for Claude Code

## Role

You are an expert software architect, senior React developer, Remotion expert, Framer Motion animation designer, UX designer, instructional designer, and CBSE curriculum specialist.

Your task is to build a **production-ready Interactive Educational Video Engine**.

The objective is **NOT** to create one video.

The objective is to build an engine capable of converting textbook pages into high-quality interactive educational motion graphics with interactive assessments.

---

# Primary Objective

Given a textbook page image, create an animated educational lesson consisting of:

- Motion graphics
- Animated diagrams
- Animated tables
- Animated infographics
- Interactive overlays
- MCQs
- Drag-and-drop activities
- Sequencing questions
- Match-the-following
- Hotspot interactions
- Reflection questions
- AI explanations
- Immediate feedback

The lesson should feel similar to **Duolingo**, **Khan Academy**, or **Brilliant.org**, not PowerPoint slides.

---

# Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Remotion
- Framer Motion
- Motion One
- DND Kit
- React Hook Form
- Zod
- React Query
- Zustand
- React Router
- Lucide Icons
- Lottie
- Howler.js

---

# Architecture

Use:

- Feature-Sliced Design
- Clean Architecture
- SOLID Principles
- Reusable Components
- JSON-driven rendering
- Configurable animations

---

# Folder Structure

```text
src/
  assets/
  animations/
  components/
  hooks/
  engine/
  renderer/
  parser/
  scenes/
  interactions/
  timeline/
  motion/
  audio/
  layouts/
  widgets/
  overlays/
  education/
  assessment/
  feedback/
  state/
  types/
  utils/
  constants/
  styles/
  data/
public/
docs/
tests/
```

---

# Scene Engine

Represent every scene using JSON.

Example

```json
{
  "id": "scene_01",
  "type": "diagram",
  "duration": 18,
  "animation": "hierarchy",
  "voiceover": null,
  "interactions": []
}
```

Scenes should render dynamically.

---

# Parser

Design a parser that converts textbook pages into structured JSON.

Supported elements:

- Heading
- Paragraph
- Diagram
- Table
- Image
- MCQ
- Assertion & Reason
- Case Study
- Flowchart
- Mind Map
- Timeline
- Formula
- Activity
- Learning Objectives
- Summary
- Key Terms

Do **not** tightly couple the parser to OCR. Keep OCR as a pluggable adapter.

---

# Renderer

The renderer should automatically create:

- Animated titles
- Animated diagrams
- Animated tables
- Animated cards
- Animated infographics
- Interactive overlays
- Assessment widgets

---

# Animation Principles

- Purposeful
- Educational
- Minimal
- Readable
- 60 FPS
- GPU Accelerated
- Motion reinforces learning

---

# Reusable Components

Create reusable components such as:

- AnimatedCard
- AnimatedTable
- AnimatedHeading
- AnimatedParagraph
- DiagramRenderer
- HierarchyRenderer
- TimelineRenderer
- MindMapRenderer
- ImageReveal
- SVGAnimator
- StepIndicator
- ProgressBar
- Timer
- HintBox
- FeedbackPopup
- ScoreBoard

---

# Interaction Library

Implement:

- MCQ
- MultiSelect
- True/False
- Drag & Drop
- Match Pairs
- Hotspots
- Fill in the Blank
- Arrange Sequence
- Click to Reveal
- Sort Items
- Flash Cards
- Reflection Questions

---

# Feedback System

Each interaction must return:

- Correct / Incorrect
- Explanation
- Hint
- Related Concept
- Confidence Level
- Retry Support

---

# Assessment Metadata

Every question must include:

- Chapter
- Topic
- Subtopic
- Bloom's Taxonomy Level
- Competency
- Learning Outcome
- Difficulty
- Estimated Thinking Time
- Partial Marks
- Common Misconceptions
- Real-life Example

---

# Diagram Types

Support:

- Hierarchy
- Cycle
- Process
- Timeline
- Decision Tree
- Flowchart
- Concept Map
- Network
- Pyramid
- Tree
- Stack

---

# Table Animations

- Animate rows
- Animate columns
- Highlight cells
- Zoom selected row
- Filter
- Sort

---

# AI Teaching Assistant

For every question provide:

- Why the correct answer is correct
- Why incorrect answers are incorrect
- Common misconceptions
- Real-life examples
- Memory tricks

---

# Remotion

Create reusable compositions for:

- Intro
- Concept
- Diagram
- Table
- Assessment
- Summary
- Reflection
- Outro

---

# Performance

- Lazy loading
- Code splitting
- Memoization
- Minimal rerenders
- Virtual rendering where appropriate

---

# Testing

- Vitest
- React Testing Library
- Storybook

---

# Deliverables

Generate:

- Complete production-ready project
- Folder structure
- Reusable engine
- Developer documentation
- Architecture documentation
- Animation guidelines
- Coding standards
- README

No placeholder code.

No TODO comments.

No pseudo code.

Everything should compile successfully.

---

# Working Rules

- Implement incrementally.
- Build one module at a time.
- Wait for approval before the next module.
- Every module must be production-ready.
- Do not simplify because of response length.
- Build an enterprise-grade framework suitable for commercial educational platforms.

---

# Target Architecture

```text
Textbook Page
      │
      ▼
Structured JSON
      │
      ▼
Learning Scene Graph
      │
      ▼
Timeline Engine
      ├── Animation Layer
      ├── Audio Layer
      ├── Interaction Layer
      ├── Assessment Layer
      ├── Analytics Layer
      └── AI Tutor Layer
```
