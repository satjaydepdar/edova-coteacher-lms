# Questions — Decoding River Width

Full question bank, including inline lesson interactions and two additional
standalone assessment items usable in a post-lesson quiz. Question IDs
match the `Related Question` references in `interactions.md` where
applicable.

---

## q1 — Prediction

- **Concept:** `c2`
- **Bloom Level:** Understand
- **Difficulty:** Easy
- **Question:** "You've just measured the angle between your baseline and
  your line of sight to the tree across the river. Before you can turn
  that angle into an actual distance in metres, what else do you still
  need to know?"
- **Options:** Free-response (prediction; no fixed options). Suggested
  sentence starters shown to learner: "I think I also need to know…"
- **Correct Answer:** Any response identifying that a **known length**
  (the baseline distance) is required, since an angle alone cannot produce
  a distance.
- **Explanation:** An angle describes a direction, not a size. Without at
  least one known length in the triangle, the tangent ratio has no scale to
  work from — the same angle could describe a 5 m-wide stream or a 500 m
  wide river.
- **Hint:** "Think about what 'tan(angle) = opposite / adjacent' actually
  needs on the right-hand side."
- **Estimated Time:** 20 seconds
- **Tags:** `prediction`, `trigonometry`, `angle-of-sight`, `pre-concept-check`

---

## q2 — Drag Drop

- **Concept:** `c3`
- **Bloom Level:** Understand
- **Difficulty:** Medium
- **Question:** "Drag each label onto the correct part of the triangle
  diagram: **River Width**, **Baseline**, **Angle of Sight**."
- **Options:**
  - Draggable labels: `River Width`, `Baseline`, `Angle of Sight`
  - Drop targets: side `AC` (across the river), side `AB` (along the near
    bank), angle at vertex `B`
- **Correct Answer:** `River Width → AC`, `Baseline → AB`,
  `Angle of Sight → angle B`
- **Explanation:** `AC` is the side we cannot walk, so it is the river
  width. `AB` is the distance we actually walk and measure on dry land, so
  it is the baseline. The angle at `B`, between the baseline and the new
  line of sight to the tree, is the angle of sight.
- **Hint:** "The right angle is at A — start by finding which side is
  opposite the vertex you walked to."
- **Estimated Time:** 30 seconds
- **Tags:** `drag-drop`, `diagram-labelling`, `right-triangle`, `geometry`

---

## q3 — Fill in the Blank

- **Concept:** `c4`
- **Bloom Level:** Remember
- **Difficulty:** Easy
- **Question:** "AC = AB × ______ of angle B"
- **Options:** `sine`, `cosine`, `tangent`, `secant`
- **Correct Answer:** `tangent`
- **Explanation:** Because AC is opposite angle B and AB is adjacent to
  it, the ratio connecting them is the tangent: `tan(B) = opposite/adjacent
  = AC/AB`, which rearranges to `AC = AB × tan(B)`.
- **Hint:** "Which ratio is defined as opposite over adjacent?"
- **Estimated Time:** 15 seconds
- **Tags:** `fill-blank`, `tangent-ratio`, `formula-recall`

---

## q4 — MCQ (Checkpoint)

- **Concept:** `c5`
- **Bloom Level:** Analyze
- **Difficulty:** Medium
- **Question:** "The baseline stays 40 m, but the measured angle increases
  from 30° to 60°. What happens to the calculated river width?"
- **Options:**
  - A. It stays exactly the same, because the baseline didn't change.
  - B. It gets smaller, because a bigger angle means a shorter opposite
    side.
  - C. It gets larger, because `tan(60°) > tan(30°)`, so `AB × tan(angle)`
    increases.
  - D. It becomes negative, because the angle is now more than 45°.
- **Correct Answer:** C
- **Explanation:** `tan(60°) ≈ 1.732` while `tan(30°) ≈ 0.577`. Since width
  = baseline × tan(angle), a larger tangent value with the same baseline
  produces a larger calculated width (40 × 1.732 ≈ 69.3 m vs. 40 × 0.577 ≈
  23.1 m).
- **Hint:** "Look up tan(30°) and tan(60°) — which one is bigger?"
- **Estimated Time:** 25 seconds
- **Tags:** `mcq`, `tangent-ratio`, `proportional-reasoning`, `checkpoint`

---

## q5 — Reflection

- **Concept:** `c6`
- **Bloom Level:** Evaluate
- **Difficulty:** Medium
- **Question:** "Why might measuring the angle carefully matter more than
  measuring the baseline carefully, especially when the baseline is short?"
- **Options:** Free-response (reflection; no fixed options).
- **Correct Answer:** No single correct answer; strong responses note that
  a small error in a short baseline changes the multiplied result only a
  little, whereas a small error in the angle is magnified by the tangent
  function — especially near steep angles — and can shift the calculated
  width by a much larger amount.
- **Explanation:** Because width = baseline × tan(angle), errors in the
  baseline scale the result linearly, while errors in the angle pass
  through the tangent function, which grows increasingly steeply as the
  angle approaches 90°. A 1° error at a shallow angle changes the answer
  only slightly; the same 1° error near a steep angle can change it a
  great deal.
- **Hint:** "Try the calculation with the angle off by 1° and compare it to
  the baseline off by 1 m."
- **Estimated Time:** 30 seconds
- **Tags:** `reflection`, `measurement-error`, `evaluate`, `metacognition`

---

## q6 — MCQ (Standalone Assessment)

- **Concept:** `c4`
- **Bloom Level:** Apply
- **Difficulty:** Medium
- **Question:** "A surveyor measures a baseline of 25 m and an angle of
  sight of 45°. What is the calculated width of the river?"
- **Options:**
  - A. 12.5 m
  - B. 17.7 m
  - C. 25 m
  - D. 35.4 m
- **Correct Answer:** C
- **Explanation:** `tan(45°) = 1`, so `width = 25 × 1 = 25 m`. This is a
  useful special case to remember: at exactly 45°, the width always equals
  the baseline.
- **Hint:** "What is tan(45°) exactly?"
- **Estimated Time:** 30 seconds
- **Tags:** `mcq`, `tangent-ratio`, `worked-practice`, `special-angle`

---

## q7 — MCQ (Standalone Assessment)

- **Concept:** `c6`
- **Bloom Level:** Evaluate
- **Difficulty:** Hard
- **Question:** "A first calculation gives a river width of 23.1 m from a
  40 m baseline. A second measurement, from a 60 m baseline, gives an
  angle of 25° instead of the predicted 21°. What should the surveyor do
  next?"
- **Options:**
  - A. Accept 23.1 m as final, since one measurement is always enough.
  - B. Immediately conclude the tangent ratio is wrong for this triangle.
  - C. Re-check the baseline distances and angle readings, since a 4°
    mismatch is larger than typical instrument error.
  - D. Average 21° and 25° and stop checking further.
- **Correct Answer:** C
- **Explanation:** A discrepancy of 4° is larger than the small
  measurement error expected from a well-used clinometer, so it signals a
  likely mistake in one of the readings or distances rather than a flaw in
  the method itself. Good practice is to re-measure before trusting either
  triangle.
- **Hint:** "Is a 4° gap the kind of small error you'd expect from reading
  an instrument, or something bigger?"
- **Estimated Time:** 35 seconds
- **Tags:** `mcq`, `verification`, `evaluate`, `measurement-error`

---

## q8 — Summary

- **Concept:** `c1`–`c6`
- **Bloom Level:** Understand / Create
- **Difficulty:** Medium
- **Question:** "Put these four steps of the river-width method in the
  order you would actually perform them in the field."
- **Options:**
  - Measure the angle of sight from the baseline point to the landmark.
  - Mark a baseline along the near bank and measure its length.
  - Calculate the width using `width = baseline × tan(angle)`.
  - Walk to a second baseline point and verify with a second angle.
- **Correct Answer:** Mark the baseline and measure its length → Measure
  the angle of sight → Calculate the width using the tangent ratio →
  Verify with a second baseline and angle.
- **Explanation:** The method always proceeds from setup (baseline) to
  measurement (angle) to calculation (tangent ratio) to verification
  (second triangle) — reordering these steps, such as calculating before
  measuring the angle, is not possible.
- **Hint:** "You can't calculate anything until you've measured both the
  baseline and the angle — which of those comes first in the field?"
- **Estimated Time:** 40 seconds
- **Tags:** `summary`, `sequencing`, `whole-lesson-recap`, `create`
