---
type: Concept
title: Section Formula
description: Derivation, statement, and applications of the section formula for finding the coordinates of a point dividing a line segment internally in a given ratio.
tags: [coordinate-geometry, section-formula, ratio, class-X, chapter-7]
difficulty: 2
read_time: 8
timestamp: 2025-06-15T00:00:00Z
---

## Statement

If P(x, y) divides the line segment joining A(x₁, y₁) and B(x₂, y₂) internally in the ratio m₁ : m₂, then:

**x = (m₁x₂ + m₂x₁) / (m₁ + m₂)**

**y = (m₁y₂ + m₂y₁) / (m₁ + m₂)**

### Using k : 1 notation

If the ratio is k : 1, then:

**x = (kx₂ + x₁) / (k + 1)**

**y = (ky₂ + y₁) / (k + 1)**

## Critical distinction: which coordinate gets which multiplier

**m₁ goes with x₂ and y₂ (the SECOND point's coordinates).**
**m₂ goes with x₁ and y₁ (the FIRST point's coordinates).**

Memory aid: "The first multiplier (m₁) pairs with the second point (x₂, y₂)."

This is the #1 error in this chapter. Emphasise repeatedly.

## Derivation outline

1. Draw A(x₁, y₁) and B(x₂, y₂). Mark P dividing AB in ratio m₁ : m₂
2. Drop perpendiculars AR, PS, BT to x-axis
3. Draw AQ ∥ x-axis and PC ⟂ BT
4. By AA similarity: ΔPAQ ~ ΔBPC
5. PA/BP = AQ/PC = PQ/BC = m₁/m₂
6. Substitute: AQ = x − x₁, PC = x₂ − x, PQ = y − y₁, BC = y₂ − y
7. Solve: x = (m₁x₂ + m₂x₁)/(m₁ + m₂)
8. Similarly for y

## Key applications

### Application 1: Finding the dividing point (given ratio)
Straightforward substitution. Example: P dividing (4, −3) and (8, 5) in ratio 3:1 → P(7, 3).

### Application 2: Finding the ratio (given the dividing point)
Use the k : 1 form. Set up equation from one coordinate, solve for k. Verify with the other coordinate.

### Application 3: Trisection points
First trisection point: ratio 1:2. Second trisection point: ratio 2:1.

### Application 4: Division by an axis
If a point on the y-axis divides AB, its x-coordinate is 0. Set the x-formula equal to 0 and solve for k.

### Application 5: Parallelogram diagonals
Diagonals of a parallelogram bisect each other → midpoint of AC = midpoint of BD.

### Application 6: Finding a point given a fraction of the segment
If AP = (3/7)AB, then AP : PB = 3 : 4 (not 3:7).

## Common student errors

| Error | Fix |
|-------|-----|
| Swapping m₁ and m₂ with x₁ and x₂ | Drill: "m₁ goes with x₂" |
| Wrong ratio for trisection | First point at 1:2, not 1:3 |
| Fraction to ratio error | AP = 3/7 AB → ratio 3:4 not 3:7 |
| Not verifying with both coordinates | Always check both x and y |

## CoTeacher prompt

```
Create 8 problems where students must identify the correct ratio
before applying the section formula. For each problem:
- Describe a division situation in words
- Ask "In what ratio does point P divide AB?"
- Do NOT ask to find coordinates — focus only on the ratio
Include: trisection (2), quarter points, a point 3/5 of the way
from A to B, a point 2/3 from B to A, division by x-axis,
division by y-axis, and parallelogram diagonal bisection.
```
