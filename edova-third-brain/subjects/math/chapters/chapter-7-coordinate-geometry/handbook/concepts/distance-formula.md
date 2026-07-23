---
type: Concept
title: Distance Formula
description: Derivation, statement, and applications of the distance formula for finding the distance between two points in the coordinate plane.
tags: [coordinate-geometry, distance-formula, pythagoras, class-X, chapter-7]
difficulty: 2
read_time: 8
timestamp: 2025-06-15T00:00:00Z
---

## Statement

The distance between points P(x₁, y₁) and Q(x₂, y₂) is:

**PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]**

Equivalently: **PQ = √[(x₁ − x₂)² + (y₁ − y₂)²]** (order does not matter since we square the differences)

## Special case — distance from origin

The distance of P(x, y) from the origin O(0, 0) is:

**OP = √(x² + y²)**

## Derivation — step by step

### Step 1: Set up the diagram
Draw points P(x₁, y₁) and Q(x₂, y₂). Drop perpendiculars PR and QS to the x-axis. Draw PT perpendicular to QS.

### Step 2: Express the sides of right triangle PTQ
- PT = RS = x₂ − x₁ (horizontal distance)
- QT = QS − TS = y₂ − y₁ (vertical distance)

### Step 3: Apply Pythagoras' theorem
In right triangle PTQ:
PQ² = PT² + QT² = (x₂ − x₁)² + (y₂ − y₁)²

### Step 4: Take square root
PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]

**Teaching note:** Emphasise that we are literally constructing a right triangle and applying Class IX Pythagoras. The formula is not new — it's Pythagoras in coordinate clothing.

## Building up from simple cases

Teach in this sequence (as the textbook does):

1. **Both points on x-axis:** A(4, 0), B(6, 0) → AB = |6 − 4| = 2
2. **Both points on y-axis:** C(0, 3), D(0, 8) → CD = |8 − 3| = 5
3. **One on each axis:** A(4, 0), C(0, 3) → AC = √(4² + 3²) = 5
4. **Same quadrant:** P(4, 6), Q(6, 8) → PQ = √(2² + 2²) = 2√2
5. **Different quadrants:** P(6, 4), Q(−5, −3) → PQ = √(11² + 7²) = √170
6. **General formula:** P(x₁, y₁), Q(x₂, y₂) → full formula

## Key applications

### Application 1: Checking collinearity
Three points A, B, C are collinear if AB + BC = AC (the largest distance equals the sum of the other two).

### Application 2: Identifying geometric figures
Calculate all sides (and diagonals if needed), then check defining properties.

### Application 3: Finding equidistant points
Set distances equal, expand, simplify to get a relation between x and y.

### Application 4: Finding points on axes
Point on x-axis has form (a, 0). Point on y-axis has form (0, b). Substitute and solve.

## Common student errors

| Error | Example | Fix |
|-------|---------|-----|
| Forgetting to square the differences | √[(4−2) + (6−3)] instead of √[(4−2)² + (6−3)²] | Write the formula at the start of every problem |
| Sign errors in subtraction | (−2 − 4)² = (−2)² − 4² = −12 | Compute the difference FIRST, then square |
| Not using absolute value on axes | Distance between (−3, 0) and (5, 0) = 5 − (−3) = 8, not 2 | For points on the same axis: subtract and take absolute value |
| Confusing which distance is largest | Checking AB + BC = AC but BC is actually the largest | Always identify the largest side first |

## CoTeacher prompt

```
Create a scaffolded worksheet for Class X where students derive
the distance formula themselves. Structure:
- Part A: 4 warm-up questions applying Pythagoras to right
  triangles with known legs
- Part B: Given P(x1,y1) and Q(x2,y2) with a diagram showing
  perpendiculars, fill in 6 blanks to complete the derivation
- Part C: Write the full derivation independently
- Part D: Self-check — verify the formula works for P(0,0), Q(3,4)
Provide answers for Parts A and B.
```
