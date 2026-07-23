---
type: Concept
title: Chapter 5 — Sum of First n Terms of an AP
description: Derivation and applications of the sum formula from NCERT Section 5.4.
tags: [arithmetic-progressions, ap, sum-of-n-terms, class-X, chapter-5]
difficulty: 3
read_time: 6
timestamp: 2025-06-15T00:00:00Z
---

# Sum of First $n$ Terms of an AP

## Derivation of the Formula

Let $S_n$ denote the sum of the first $n$ terms of an AP with first term $a$ and common difference $d$. Then:

$$S_n = a + (a + d) + (a + 2d) + \ldots + [a + (n - 1)d] \quad \text{...(1)}$$

Writing the terms in reverse order:

$$S_n = [a + (n - 1)d] + [a + (n - 2)d] + \ldots + (a + d) + a \quad \text{...(2)}$$

Adding equations (1) and (2) term by term:

$$2S_n = [2a + (n - 1)d] + [2a + (n - 1)d] + \ldots + [2a + (n - 1)d]$$

There are $n$ such terms, so:

$$2S_n = n[2a + (n - 1)d]$$

Therefore:

$$S_n = \frac{n}{2}[2a + (n - 1)d]$$

## Alternative Form Using Last Term

If $l$ is the last term of the AP, then $l = a + (n - 1)d$. Substituting:

$$S_n = \frac{n}{2}(a + l)$$

This form is useful when the first and last terms are known.

## Finding the $n$th Term from the Sum

The $n$th term of an AP can also be found using:

$$a_n = S_n - S_{n-1}$$

## Master Check

- [ ] I can derive the sum formula by pairing terms.
- [ ] I can use both forms of the sum formula.
- [ ] I can find the number of terms when the sum is given.
- [ ] I can solve real-life problems involving the sum of an AP.
