# Storyboard — Decoding River Width

Total runtime: **08:00**. Timestamps match `transcript.md` and the
`timeline.scenes` array in `lesson.json`.

---

### Scene 1

- **Scene Number:** 1
- **Start Time:** `00:00`
- **End Time:** `00:20`
- **Visual Description:** Wide drone-style shot of a river cutting through
  a valley; no bridge visible. Camera slowly pushes in on the far bank.
- **Narration:** "A river cuts through a valley, wide and fast-flowing,
  with no bridge in sight. Two hundred years ago, a surveyor mapping this
  land needed to know exactly how wide it was — without ever stepping into
  the water. How do you measure something you cannot walk across, wrap a
  tape around, or touch? Today, we decode the river's width using nothing
  but angles, a measuring tape on dry land, and one powerful idea from
  trigonometry."
- **On-screen Text:** "Decoding River Width"
- **Animation Notes:** Title card fades in over the river footage at
  `00:14`; fades out by `00:19`.
- **Learning Intent:** Hook attention and establish the real-world stakes
  of the problem.
- **Concept:** (pre-concept hook)

### Scene 2

- **Scene Number:** 2
- **Start Time:** `00:20`
- **End Time:** `00:55`
- **Visual Description:** Cut to a simple animated illustration of a
  surveyor on a riverbank with a notebook and instrument; historical sketch
  style transitions into a clean geometric right-triangle outline overlaid
  on the river image.
- **Narration:** "This is the problem of indirect measurement — finding a
  distance you cannot access directly. Surveyors, cartographers, and
  engineers have faced this problem for centuries: measuring mountains,
  canyons, and rivers from a safe, reachable position. The tool that solves
  it is the same one you have already met — the right triangle, and the
  ratios hidden inside it. If we can turn the far bank of the river into
  the corner of a triangle, and the near bank into its base, the width
  becomes a side we can calculate instead of a side we have to walk. That
  is the core idea of this lesson."
- **On-screen Text:** "Indirect Measurement"
- **Animation Notes:** Triangle outline draws on-screen stroke-by-stroke as
  narration reaches "the right triangle."
- **Learning Intent:** Frame why trigonometry is the right tool before
  introducing any formula.
- **Concept:** `c1`

### Scene 3

- **Scene Number:** 3
- **Start Time:** `00:55`
- **End Time:** `01:40`
- **Visual Description:** Close-up on a hand holding a clinometer, sighting
  across the river toward a tree on the far bank. Split-screen shows the
  instrument's angle readout.
- **Narration:** "Concept two: the angle of elevation and the line of
  sight. Imagine standing on the near bank, directly facing a large tree on
  the far bank. The straight line from your eye to the base of that tree is
  called the line of sight. When you turn your line of sight to look along
  the riverbank instead — say, toward a second point you have marked — the
  angle between that new direction and your original line of sight is what
  surveyors measure with an instrument called a clinometer or theodolite.
  This measured angle is the single most important number in our entire
  calculation. Get the angle right, and the rest is just arithmetic."
- **On-screen Text:** "Line of Sight · Angle of Sight"
- **Animation Notes:** Dashed line animates from observer to tree at
  "line of sight"; protractor arc animates in at "measured angle."
- **Learning Intent:** Introduce precise vocabulary tied to a real
  instrument.
- **Concept:** `c2`

### Scene 4 — Interaction

- **Scene Number:** 4
- **Start Time:** `01:40`
- **End Time:** `01:55`
- **Visual Description:** Video pauses on the clinometer readout; UI
  overlay presents the prediction prompt with a text input field.
- **Narration:** "Before we go further, pause for a moment. If you only
  know the angle you just measured, what else would you still need to
  calculate an actual distance in metres?"
- **On-screen Text:** "PREDICT: What else do you need?"
- **Animation Notes:** Playback freezes on last frame; input card slides up
  from bottom.
- **Learning Intent:** Prime learners to anticipate the need for a known
  length before it is revealed.
- **Concept:** `c2` (interaction `int1` / question `q1`)

### Scene 5

- **Scene Number:** 5
- **Start Time:** `01:55`
- **End Time:** `02:50`
- **Visual Description:** Full triangle diagram builds on-screen: point A
  (observer) on the near bank, point C (tree) directly across, right angle
  marker appears at A, then point B appears as the camera "walks" along the
  bank with a measuring wheel animation, followed by the angle arc at B.
- **Narration:** "Concept three: setting up the right triangle. Let point A
  be where you stand on the near bank, directly opposite a tree at point C
  on the far bank. Because A is directly opposite C, the line AC — the
  river's width — meets the riverbank at a perfect right angle. Now walk
  along your own bank, in a straight line, to a second point B, and measure
  that distance carefully — this is called the baseline. From point B,
  sight the same tree at C and measure the angle between your baseline and
  that line of sight — angle B. You now have a right triangle, ABC,
  right-angled at A, with one known side — the baseline AB — and one known
  angle — angle B. Everything else in that triangle can now be found using
  trigonometry."
- **On-screen Text:** "A · B · C — Baseline AB — Right angle at A"
- **Animation Notes:** Each label (A, B, C, right-angle marker, baseline
  AB, angle B) appears in sync with its mention in narration; full triangle
  glows once complete.
- **Learning Intent:** Build the skill of translating the word scenario
  into a correctly labelled diagram.
- **Concept:** `c3`

### Scene 6 — Interaction

- **Scene Number:** 6
- **Start Time:** `02:50`
- **End Time:** `03:10`
- **Visual Description:** Completed but unlabelled triangle diagram shown
  with three draggable label chips (River Width, Baseline, Angle of Sight)
  along the bottom of the screen.
- **Narration:** "Try labelling this triangle yourself: drag the labels
  River Width, Baseline, and Angle of Sight onto the correct sides and
  angle of the diagram."
- **On-screen Text:** "DRAG & DROP: Label the triangle"
- **Animation Notes:** Correct drops snap into place with a green outline
  pulse; incorrect drops bounce back to the tray.
- **Learning Intent:** Reinforce triangle labelling immediately after
  introduction.
- **Concept:** `c3` (interaction `int2` / question `q2`)

### Scene 7

- **Scene Number:** 7
- **Start Time:** `03:10`
- **End Time:** `04:10`
- **Visual Description:** Triangle diagram remains on-screen left; formula
  `tan(θ) = opposite / adjacent` builds on-screen right, then substitutes
  into `tan(B) = AC / AB`, then rearranges to `AC = AB × tan(B)`.
- **Narration:** "Concept four: the tangent ratio. In any right triangle,
  the tangent of an angle equals the length of the side opposite that angle
  divided by the length of the side adjacent to it. In triangle ABC, the
  side opposite angle B is AC — the river width we want. The side adjacent
  to angle B is AB — our baseline, which we already measured on dry land.
  So tan of angle B equals AC divided by AB. Rearranging that single
  equation gives us AC equals AB multiplied by tan of angle B. Notice what
  just happened — an unreachable distance across a river has become a
  simple multiplication."
- **On-screen Text:** "tan(B) = AC / AB → AC = AB × tan(B)"
- **Animation Notes:** Opposite side (AC) and adjacent side (AB) highlight
  in different colours as each is named; equation rearrangement animates
  as a step-by-step algebra transition.
- **Learning Intent:** Present the tangent ratio as a direct consequence of
  the triangle, not an isolated formula.
- **Concept:** `c4`

### Scene 8 — Interaction

- **Scene Number:** 8
- **Start Time:** `04:10`
- **End Time:** `04:30`
- **Visual Description:** Equation shown with the word "tangent" removed,
  replaced by a blank; four word-chip options appear below (sine, cosine,
  tangent, secant).
- **Narration:** "Fill in the missing term: AC equals AB multiplied by
  blank of angle B."
- **On-screen Text:** "AC = AB × ___ (B)"
- **Animation Notes:** Selected chip animates into the blank; correct
  answer locks in green, incorrect shakes and returns to the tray.
- **Learning Intent:** Check immediate recall of the tangent ratio's
  structure.
- **Concept:** `c4` (interaction `int3` / question `q3`)

### Scene 9

- **Scene Number:** 9
- **Start Time:** `04:30`
- **End Time:** `05:30`
- **Visual Description:** Clean worked-example whiteboard animation:
  values `AB = 40 m` and `angle B = 30°` are written onto the triangle,
  followed by the substitution and final calculation appearing line by
  line.
- **Narration:** "Concept five: solving a real example. Suppose a surveyor
  measures a baseline AB of forty metres along the riverbank. Sighting the
  tree from point B gives an angle of thirty degrees. Using our formula, AC
  equals forty metres multiplied by tan of thirty degrees. Tan of thirty
  degrees equals one over the square root of three, which is approximately
  zero point five seven seven. Forty multiplied by zero point five seven
  seven gives approximately twenty three point one metres. That is the
  width of the river — calculated entirely from dry land, using one length
  and one angle. No boat, no rope, no risk — just geometry doing the
  crossing for us."
- **On-screen Text:** "AB = 40 m, ∠B = 30° → AC ≈ 23.1 m"
- **Animation Notes:** Final answer "23.1 m" enlarges and pulses once,
  with a measuring-tape icon animating across the river to visually
  "confirm" the calculated span.
- **Learning Intent:** Model a complete, correct worked example.
- **Concept:** `c5`

### Scene 10 — Interaction

- **Scene Number:** 10
- **Start Time:** `05:30`
- **End Time:** `05:50`
- **Visual Description:** Video pauses on the completed worked example;
  four-option MCQ card slides in over a dimmed background.
- **Narration:** "Quick check: if the baseline had been forty metres and
  the measured angle sixty degrees instead of thirty, would the calculated
  river width be larger or smaller? Choose the correct estimate."
- **On-screen Text:** "CHECK: Angle 30° → 60°. Width goes...?"
- **Animation Notes:** Selected option highlights immediately; brief
  explanation text fades in beneath it after selection.
- **Learning Intent:** Confirm reasoning about how angle affects width
  without requiring a new full calculation.
- **Concept:** `c5` (interaction `int4` / question `q4`)

### Scene 11

- **Scene Number:** 11
- **Start Time:** `05:50`
- **End Time:** `06:50`
- **Visual Description:** Camera "walks" further along the bank from B to
  a new point D; second triangle (ADC) overlays the first, sharing side AC;
  new angle arc animates at D.
- **Narration:** "Concept six: verifying the answer. Good surveyors never
  trust a single measurement — they check it. Walk twenty metres further
  along the bank to a third point, D, so the full baseline AD is now sixty
  metres. Measure the new angle of sight to the same tree — angle ADC. If
  our first answer of twenty three point one metres is correct, this new
  angle should be close to twenty one degrees, because tan inverse of
  twenty three point one over sixty is approximately twenty one degrees.
  If the measured angle matches the predicted angle, the width calculation
  is confirmed. If it does not match, it is a signal to re-check the
  baseline distance or the angle readings before trusting the result. This
  second triangle, sharing the same side AC, is what makes the method
  self-checking."
- **On-screen Text:** "AD = 60 m → predicted ∠D ≈ 21°"
- **Animation Notes:** Predicted angle (21°) and a live "measured" angle
  overlay side by side, then snap together with a checkmark when they
  match within tolerance.
- **Learning Intent:** Model verification as standard scientific/surveying
  practice, not an optional extra.
- **Concept:** `c6`

### Scene 12 — Interaction

- **Scene Number:** 12
- **Start Time:** `06:50`
- **End Time:** `07:10`
- **Visual Description:** Video pauses on the two matching angles; open
  text-response card appears.
- **Narration:** "Reflect for a moment: why might measuring the angle
  carefully matter more than measuring the baseline carefully?"
- **On-screen Text:** "REFLECT: Angle precision vs. baseline precision"
- **Animation Notes:** Text field with placeholder "Type your thinking
  here…"; no correctness indicator shown.
- **Learning Intent:** Encourage metacognition about measurement error.
- **Concept:** `c6` (interaction `int5` / question `q5`)

### Scene 13

- **Scene Number:** 13
- **Start Time:** `07:10`
- **End Time:** `07:40`
- **Visual Description:** Four-panel recap montage: (1) river with no
  bridge, (2) baseline + clinometer, (3) triangle with tangent formula,
  (4) two triangles matching at verification.
- **Narration:** "Let's recap how we decoded the river's width. We turned
  an unreachable distance into the side of a right triangle. We measured
  one baseline on dry land and one angle with an instrument. We used the
  tangent ratio to connect the angle to the unknown side. And we verified
  the result using a second baseline and a second angle. The same method
  surveyors used centuries ago is the same trigonometry you now carry in
  your own toolkit."
- **On-screen Text:** "Frame → Measure → Calculate → Verify"
- **Animation Notes:** Each of the four recap words appears beneath its
  matching panel in sync with narration.
- **Learning Intent:** Consolidate the four-step method as a single
  memorable sequence.
- **Concept:** `c1`–`c6` (recap)

### Scene 14 — Interaction / Outro

- **Scene Number:** 14
- **Start Time:** `07:40`
- **End Time:** `08:00`
- **Visual Description:** Four recap step-cards appear shuffled;
  drag-to-reorder UI overlays the paused final frame. After submission,
  video resumes for a short outro shot of a tower on a hill, teasing the
  next lesson.
- **Narration:** "Before you go, summarise the four steps of this method in
  your own words, in the order you would actually perform them in the
  field. In the next lesson, we will use this same triangle idea to measure
  the height of objects we cannot climb — starting with a tower on a
  hill."
- **On-screen Text:** "SUMMARIZE: Reorder the four steps" / "Next: Measuring Heights"
- **Animation Notes:** Cards reorder with drag animation; on correct order,
  all four glow green and video resumes automatically after 1.5 seconds.
- **Learning Intent:** Consolidate the full method and bridge to the next
  lesson in the sequence.
- **Concept:** `c1`–`c6` (interaction `int6` / question `q8`)
