---
type: Examples
title: Chapter 7 — Higher Order Thinking Skills
description: HOTS problems that go beyond standard application.
tags: [coordinate-geometry, examples, HOTS, class-X, chapter-7]
difficulty: 3
read_time: 5
timestamp: 2025-06-15T00:00:00Z
---

## HOTS 1 — Two possible answers

If A(2, −1), B(4, 3) and C(1, 2) are three vertices of a parallelogram, find the fourth vertex.

**Solution:**
In a parallelogram, diagonals bisect each other. But which points are opposite?
Case 1: AC is a diagonal. Let D be the fourth vertex.
Midpoint of AC = ((2+1)/2, (−1+2)/2) = (1.5, 0.5)
Midpoint of BD = ((4+x)/2, (3+y)/2)
Equating: (4+x)/2 = 1.5 → x = −1; (3+y)/2 = 0.5 → y = −2
D = (−1, −2)

Case 2: AB is a diagonal. Let D be the fourth vertex.
Midpoint of AB = (3, 1)
Midpoint of CD = ((1+x)/2, (2+y)/2)
Equating: (1+x)/2 = 3 → x = 5; (2+y)/2 = 1 → y = 0
D = (5, 0)

**Key insight:** The problem doesn't specify which pair is opposite, so there are TWO possible answers.

## HOTS 2 — Find y for given distance

Find the values of y for which the distance between P(2, −3) and Q(10, y) is 10 units.

**Solution:**
PQ² = 100
(10 − 2)² + (y + 3)² = 100
64 + (y + 3)² = 100
(y + 3)² = 36
y + 3 = ±6
y = 3 or y = −9

**Key insight:** There are TWO possible values of y — the point Q can be above or below.

## HOTS 3 — Prove without calculating all distances

If (a, 0), (0, b) and (1, 1) are collinear, show that 1/a + 1/b = 1.

**Solution:**
Using collinearity: AB + BC = AC (assuming appropriate ordering)
AB = √[a² + b²], BC = √[1 + (b−1)²], AC = √[(a−1)² + 1]

Alternative approach using area = 0:
½|a(b − 1) + 0(1 − 0) + 1(0 − b)| = 0
|ab − a − b| = 0
ab − a − b = 0
ab = a + b
1/a + 1/b = 1

**Key insight:** Use the area condition rather than computing three distances.

## HOTS 4 — Rhombus area

Find the area of a rhombus with vertices (3, 0), (4, 5), (−1, 4) and (−2, −1).

**Solution:**
Diagonal AC: A(3,0) to C(−1,4). AC = √[16 + 16] = √32 = 4√2
Diagonal BD: B(4,5) to D(−2,−1). BD = √[36 + 36] = √72 = 6√2
Area = ½ × 4√2 × 6√2 = ½ × 48 = 24 sq. units
