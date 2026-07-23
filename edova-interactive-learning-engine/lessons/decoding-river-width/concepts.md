# Concepts — Decoding River Width

Six concepts, presented in a single unbroken sequence. Timestamps refer to
`transcript.md` and `storyboard.md`.

---

## c1 — The Indirect Measurement Problem

- **ID:** `c1`
- **Title:** The Indirect Measurement Problem
- **Description:** Some real-world distances — a river's width, a canyon's
  span, a mountain's height — cannot be measured by walking the distance
  with a tape. This concept frames the problem surveyors have solved for
  centuries: reduce an unreachable distance to a side of a right triangle
  that can be calculated from a reachable baseline and a measured angle.
- **Learning Intent:** Motivate *why* trigonometry is needed before
  introducing *how* it is used, so the formula in c4 has a purpose attached
  to it.
- **Difficulty:** Foundational
- **Importance:** High — sets up the entire lesson's problem frame; without
  it, the tangent ratio in c4 appears as an arbitrary formula.
- **Bloom Level:** Understand
- **Misconceptions:**
  - "You need to cross the river to measure it." (The whole point of the
    method is that you never need to.)
  - Students often think indirect measurement requires special/expensive
    equipment, when a tape measure and an angle-measuring tool are enough.
- **Prerequisites:** None (entry point of the lesson).
- **Timestamp:** `00:20`

---

## c2 — Angle of Elevation and Line of Sight

- **ID:** `c2`
- **Title:** Angle of Elevation and Line of Sight
- **Description:** Introduces the "line of sight" (the straight line from
  observer to object) and the angle measured between two lines of sight
  using an instrument such as a clinometer or theodolite. This is the one
  physical measurement, besides the baseline, that the whole method depends
  on.
- **Learning Intent:** Give students precise vocabulary for the angle they
  will use in the tangent ratio, and connect it to a real measuring
  instrument rather than an abstract diagram.
- **Difficulty:** Foundational
- **Importance:** High — the angle is one of only two inputs to the final
  calculation.
- **Bloom Level:** Remember
- **Misconceptions:**
  - Confusing "angle of elevation" (measured upward from horizontal) with
    the horizontal sighting angle used in this lesson, which is measured
    between two horizontal lines of sight, not from the ground up to a
    height.
  - Assuming the line of sight must be perfectly horizontal to "count" —
    what matters is that it is a straight, unobstructed line to the target.
- **Prerequisites:** `c1`
- **Timestamp:** `00:55`

---

## c3 — Constructing the Right Triangle

- **ID:** `c3`
- **Title:** Constructing the Right Triangle
- **Description:** Shows how to convert the river scenario into a labelled
  right triangle: point A (observer, directly opposite a tree at C across
  the river), a right angle at A because AC is perpendicular to the bank,
  a baseline AB walked along the near bank to point B, and the measured
  angle B between the baseline and the new line of sight to C.
- **Learning Intent:** Build the skill of translating a word scenario into
  a correctly labelled geometric diagram — the step students find hardest
  in applied trigonometry problems.
- **Difficulty:** Intermediate
- **Importance:** High — an incorrectly labelled triangle produces a wrong
  answer even with correct arithmetic later.
- **Bloom Level:** Understand
- **Misconceptions:**
  - Placing the right angle at the wrong vertex (commonly at B instead of
    A).
  - Confusing which side is "opposite" vs. "adjacent" once the triangle is
    drawn, especially when the diagram is rotated from the "standard"
    orientation.
- **Prerequisites:** `c1`, `c2`
- **Timestamp:** `01:55`

---

## c4 — The Tangent Ratio

- **ID:** `c4`
- **Title:** The Tangent Ratio
- **Description:** States and applies `tan(θ) = opposite / adjacent` to the
  triangle built in c3, showing that `AC = AB × tan(angle B)`. This is the
  single equation that turns two known quantities (baseline, angle) into
  the unknown river width.
- **Learning Intent:** Show the tangent ratio not as an isolated formula to
  memorize, but as the direct algebraic consequence of the triangle
  constructed in the previous concept.
- **Difficulty:** Intermediate
- **Importance:** Critical — this is the mathematical core of the lesson.
- **Bloom Level:** Remember / Apply
- **Misconceptions:**
  - Inverting the ratio (using `adjacent / opposite`, i.e. cotangent,
    instead of `opposite / adjacent`).
  - Forgetting to rearrange the equation before substituting numbers —
    attempting to solve `tan(B) = AC / AB` for AC without isolating it
    first.
- **Prerequisites:** `c3`
- **Timestamp:** `03:10`

---

## c5 — Solving for River Width (Worked Example)

- **ID:** `c5`
- **Title:** Solving for River Width
- **Description:** A fully worked numeric example: baseline `AB = 40 m`,
  measured angle `B = 30°`. Using `AC = AB × tan(B) = 40 × tan(30°) ≈ 23.1 m`,
  the river's width is found entirely from dry-land measurements.
- **Learning Intent:** Give students a complete, correct worked example to
  model their own problem-solving on, including how to read `tan(30°)` from
  a standard ratio table and carry out the multiplication.
- **Difficulty:** Intermediate
- **Importance:** High — this is the "Apply" checkpoint of the lesson.
- **Bloom Level:** Apply
- **Misconceptions:**
  - Rounding `tan(30°)` too early or too aggressively, producing an answer
    that is off by more than reasonable measurement tolerance.
  - Mislabeling units (reporting the answer without metres, or confusing
    metres and the baseline's own units).
- **Prerequisites:** `c4`
- **Timestamp:** `04:30`

---

## c6 — Verification via a Second Baseline

- **ID:** `c6`
- **Title:** Verification via a Second Baseline
- **Description:** Demonstrates good measurement practice by walking a
  further 20 m to a third point D (total baseline `AD = 60 m`), measuring a
  new angle `ADC`, and checking that it matches the angle predicted by the
  width found in c5 (`arctan(23.1 / 60) ≈ 21°`). If the two triangles agree,
  the result is trustworthy; if not, the measurements should be redone.
- **Learning Intent:** Teach that a single trigonometric calculation is not
  automatically "true" — it should be checked against an independent
  measurement, which is standard practice in both surveying and science.
- **Difficulty:** Advanced
- **Importance:** High — turns a one-shot calculation into a verifiable
  scientific method, and is the basis of the lesson's Analyze/Evaluate
  objectives.
- **Bloom Level:** Analyze / Evaluate
- **Misconceptions:**
  - Believing that if the numbers don't match exactly, the method has
    failed (small discrepancies from measurement error are expected and
    should be reasoned about, not treated as failure).
  - Assuming a second measurement automatically "proves" the first is
    correct, rather than understanding it only increases confidence within
    the precision of the instruments used.
- **Prerequisites:** `c5`
- **Timestamp:** `05:50`
