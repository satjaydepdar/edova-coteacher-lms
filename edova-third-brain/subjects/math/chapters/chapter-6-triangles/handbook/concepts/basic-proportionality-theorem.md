---
type: Concept
title: Chapter 6 — Basic Proportionality Theorem
description: Theorem 6.1, its converse Theorem 6.2, and proof outlines from NCERT Section 6.3.
tags: [triangles, similarity, bpt, thales-theorem, class-X, chapter-6]
difficulty: 3
read_time: 6
timestamp: 2025-06-15T00:00:00Z
---

# Basic Proportionality Theorem

## Theorem 6.1 (Basic Proportionality Theorem / Thales Theorem)

> If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio.

### Statement with Diagram

In $\Delta ABC$, let $DE \parallel BC$ with $D$ on $AB$ and $E$ on $AC$. Then

$$\frac{AD}{DB} = \frac{AE}{EC}$$

### Proof Outline

1. Join $BE$ and $CD$.
2. Draw $DM \perp AC$ and $EN \perp AB$.
3. Using area formulas:
   - $\text{ar}(ADE) = \dfrac{1}{2} AD \cdot EN$
   - $\text{ar}(BDE) = \dfrac{1}{2} DB \cdot EN$
   - Therefore, $\dfrac{\text{ar}(ADE)}{\text{ar}(BDE)} = \dfrac{AD}{DB}$ \quad ...(1)
   - Similarly, $\dfrac{\text{ar}(ADE)}{\text{ar}(DEC)} = \dfrac{AE}{EC}$ \quad ...(2)
4. Since $\Delta BDE$ and $\Delta DEC$ are on the same base $DE$ and between the same parallels $BC$ and $DE$, their areas are equal:
   $$\text{ar}(BDE) = \text{ar}(DEC)$$
5. From (1), (2), and (3), we get:
   $$\frac{AD}{DB} = \frac{AE}{EC}$$

## Theorem 6.2 (Converse of Basic Proportionality Theorem)

> If a line divides any two sides of a triangle in the same ratio, then the line is parallel to the third side.

### Statement with Diagram

In $\Delta ABC$, if $D$ is on $AB$ and $E$ is on $AC$ such that

$$\frac{AD}{DB} = \frac{AE}{EC}$$

then $DE \parallel BC$.

### Proof Outline

Assume $DE$ is not parallel to $BC$. Then draw $DE' \parallel BC$ meeting $AC$ at $E'$.

By Theorem 6.1:

$$\frac{AD}{DB} = \frac{AE'}{E'C}$$

But it is given that:

$$\frac{AD}{DB} = \frac{AE}{EC}$$

Therefore:

$$\frac{AE}{EC} = \frac{AE'}{E'C}$$

Adding 1 to both sides shows that $E$ and $E'$ must coincide. Hence $DE \parallel BC$.

## Useful Corollary

If $DE \parallel BC$, then using componendo:

$$\frac{AD}{AB} = \frac{AE}{AC}$$

## Master Check

- [ ] I can state Theorem 6.1 and Theorem 6.2 exactly.
- [ ] I can outline the proof of BPT using equal areas.
- [ ] I can apply the converse to test whether a line is parallel to the third side.
