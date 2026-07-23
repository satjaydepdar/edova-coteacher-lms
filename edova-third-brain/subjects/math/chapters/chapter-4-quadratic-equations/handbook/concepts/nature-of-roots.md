---
type: Concept
title: Chapter 4 — Nature of Roots
description: Using the discriminant to determine the nature of roots, as in NCERT Section 4.4.
tags: [quadratic-equations, discriminant, nature-of-roots, class-X, chapter-4]
difficulty: 3
read_time: 5
timestamp: 2025-06-15T00:00:00Z
---

# Nature of Roots

## Discriminant

The expression $b^2 - 4ac$ is called the **discriminant** of the quadratic equation $ax^2 + bx + c = 0$.

It determines whether the quadratic equation has real roots or not.

## The Quadratic Formula

The roots of $ax^2 + bx + c = 0$ are given by

$$x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

## Three Cases

### Case 1: $b^2 - 4ac > 0$

We get two distinct real roots:

$$x = \dfrac{-b + \sqrt{b^2 - 4ac}}{2a} \quad \text{and} \quad x = \dfrac{-b - \sqrt{b^2 - 4ac}}{2a}$$

### Case 2: $b^2 - 4ac = 0$

Then $x = \dfrac{-b}{2a}$, i.e., the equation has two equal real roots (coincident roots).

### Case 3: $b^2 - 4ac < 0$

There is no real number whose square is $b^2 - 4ac$. Therefore, the equation has **no real roots**.

## Summary Table

| Discriminant | Nature of Roots |
|---|---|
| $b^2 - 4ac > 0$ | Two distinct real roots |
| $b^2 - 4ac = 0$ | Two equal real roots |
| $b^2 - 4ac < 0$ | No real roots |

## Example 7 from NCERT

Find the discriminant of $2x^2 - 4x + 3 = 0$ and hence find the nature of its roots.

Here, $a = 2$, $b = -4$, $c = 3$.

$$b^2 - 4ac = (-4)^2 - 4(2)(3) = 16 - 24 = -8 < 0$$

So, the equation has no real roots.

## Example 8 from NCERT: Pole in a Circular Park

A pole has to be erected on the boundary of a circular park of diameter 13 m such that the difference of its distances from two diametrically opposite gates A and B is 7 m.

Let distance from gate B = $x$ m.
Then distance from gate A = $(x + 7)$ m.

Since AB is a diameter, $\angle APB = 90°$.

By Pythagoras theorem:

$$(x + 7)^2 + x^2 = 13^2$$

$$x^2 + 14x + 49 + x^2 = 169$$

$$2x^2 + 14x - 120 = 0$$

$$x^2 + 7x - 60 = 0$$

Discriminant:

$$b^2 - 4ac = 7^2 - 4(1)(-60) = 49 + 240 = 289 > 0$$

So, real roots exist. It is possible to erect the pole.

Using the quadratic formula:

$$x = \dfrac{-7 \pm \sqrt{289}}{2} = \dfrac{-7 \pm 17}{2}$$

So, $x = 5$ or $x = -12$.

Since distance cannot be negative, $x = 5$ m.

Thus, the pole should be 5 m from gate B and 12 m from gate A.

## Example 9 from NCERT

Find the discriminant of $3x^2 - 2x + \dfrac{1}{3} = 0$ and hence find the nature of its roots.

Here, $a = 3$, $b = -2$, $c = \dfrac{1}{3}$.

$$b^2 - 4ac = (-2)^2 - 4(3)\left(\dfrac{1}{3}\right) = 4 - 4 = 0$$

So, the equation has two equal real roots.

The roots are:

$$x = \dfrac{-b}{2a} = \dfrac{2}{6} = \dfrac{1}{3}$$

## Master Check

- [ ] I can calculate $b^2 - 4ac$.
- [ ] I can state the nature of roots from the discriminant.
- [ ] I can solve for unknown coefficients when the nature of roots is given.
