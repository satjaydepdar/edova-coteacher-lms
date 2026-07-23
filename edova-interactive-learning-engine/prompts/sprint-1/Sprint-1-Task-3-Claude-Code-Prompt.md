# Sprint 1 -- Task 3 Prompt for Claude Code

## ROLE

You are an experienced CBSE instructional designer and curriculum
architect.

This is **Sprint 1 -- Task 3**.

Your **ONLY** responsibility is to create the complete reference lesson
package.

**DO NOT generate**

-   React
-   TypeScript
-   AI prompts
-   APIs
-   Database
-   JSON Schemas

Those already exist.

This task is **ONLY** about creating one high-quality lesson package.

------------------------------------------------------------------------

# LESSON

**Reference Lesson**

**Decoding River Width**

This lesson becomes the gold standard for every future AI-generated
lesson.

All future lessons should follow this structure.

------------------------------------------------------------------------

# OUTPUT

Generate:

``` text
lessons/

    decoding-river-width/

        README.md
        lesson.json
        transcript.md
        storyboard.md
        lesson-outline.md
        concepts.md
        learning-objectives.md
        interactions.md
        questions.md
        teacher-notes.md
        glossary.md
        references.md

        assets/

            README.md
```

# LESSON.JSON

Generate a complete `lesson.json`.

It MUST validate against the existing schemas.

Populate every required field.

Use realistic values.

# TRANSCRIPT

Create a timestamped transcript.

Every sentence must have timestamps.

# STORYBOARD

For every scene include:

-   Scene Number
-   Start Time
-   End Time
-   Visual Description
-   Narration
-   On-screen Text
-   Animation Notes
-   Learning Intent
-   Concept

# LESSON OUTLINE

Generate:

-   Lesson Overview
-   Prerequisites
-   Learning Outcomes
-   Concept Flow
-   Estimated Duration
-   Difficulty
-   CBSE Mapping

# CONCEPTS

Each concept must include:

-   ID
-   Title
-   Description
-   Learning Intent
-   Difficulty
-   Importance
-   Bloom Level
-   Misconceptions
-   Prerequisites
-   Timestamp

# LEARNING OBJECTIVES

Generate Bloom's Taxonomy objectives:

-   Remember
-   Understand
-   Apply
-   Analyze
-   Evaluate
-   Create

Map each objective to the corresponding concept.

# INTERACTIONS

For every interaction include:

-   Timestamp
-   Concept
-   Interaction Type
-   Pause Required
-   Resume Condition
-   Purpose
-   Estimated Time

Only interaction specifications.

# QUESTIONS

For every question include:

-   Concept
-   Bloom Level
-   Difficulty
-   Question
-   Options
-   Correct Answer
-   Explanation
-   Hint
-   Estimated Time
-   Tags

Include:

-   MCQ
-   Prediction
-   Reflection
-   Fill Blank
-   Drag Drop
-   Summary

# TEACHER NOTES

Include:

-   Teaching Tips
-   Common Misconceptions
-   Alternative Explanations
-   Discussion Points
-   Assessment Suggestions

# GLOSSARY

For every term include:

-   Definition
-   Example
-   Usage

# REFERENCES

Include:

-   Concept Sources
-   CBSE Alignment
-   Suggested Reading

# README

Explain:

-   Every file
-   Lesson lifecycle
-   Asset requirements
-   Versioning

# IMPORTANT

This is NOT an AI-generated lesson.

Treat this as the manually curated gold standard.

Every future AI-generated lesson should be compared against this lesson
for quality.

Generate every requested file.

Do not generate implementation code.
