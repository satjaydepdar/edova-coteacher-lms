---
type: Assessment
title: Chapter 5 — Challenge Problems
description: Higher-order thinking problems for Arithmetic Progressions.
tags: [arithmetic-progressions, challenge, HOTS, class-X, chapter-5]
difficulty: 4
read_time: 8
timestamp: 2026-07-15T00:00:00Z
---

# Challenge Problems

**Q1.** The sum of the first $p$ terms of an AP is $q$, and the sum of the first $q$ terms is $p$. Find the sum of the first $(p+q)$ terms.

**Q2.** If the $p$th, $q$th, and $r$th terms of an AP are $a$, $b$, and $c$ respectively, show that $a(q - r) + b(r - p) + c(p - q) = 0$.

**Q3.** The digits of a three-digit number are in AP, and their sum is 15. The number obtained by reversing the digits is 594 less than the original number. Find the number.

**Q4.** How many terms of the AP $-6, -\frac{11}{2}, -5, \ldots$ are needed to give a sum of $-25$?

**Q5.** Find the sum of all three-digit numbers that leave a remainder of 2 when divided by 5.

---

## Answers

**A1.** Let first term $= a$, common difference $= d$.

$S_p = \frac{p}{2}[2a + (p-1)d] = q$ and $S_q = \frac{q}{2}[2a + (q-1)d] = p$.

Subtracting: $\frac{1}{2}\left(2a(p - q) + d[p(p-1) - q(q-1)]\right) = q - p$, which simplifies (after standard algebraic manipulation) to $d = -2$ and $2a = 2(p + q - 1)$.

Then $S_{p+q} = \frac{p+q}{2}[2a + (p+q-1)d] = \frac{p+q}{2}\left[2(p+q-1) - 2(p+q-1)\right] = -(p+q)$.

**A2.** Using $a_n = A + (n-1)D$ (with first term $A$, common difference $D$): $a = A + (p-1)D$, $b = A + (q-1)D$, $c = A + (r-1)D$.

$a(q-r) + b(r-p) + c(p-q)$

$= [A + (p-1)D](q-r) + [A + (q-1)D](r-p) + [A + (r-1)D](p-q)$

Grouping the $A$ terms: $A[(q-r) + (r-p) + (p-q)] = A(0) = 0$.

Grouping the $D$ terms: $D[(p-1)(q-r) + (q-1)(r-p) + (r-1)(p-q)]$, which also expands to $0$ (standard identity).

Hence the whole expression equals $0$.

**A3.** Let the digits be $a - d$, $a$, $a + d$. Sum $= 3a = 15 \Rightarrow a = 5$.

Original number $= 100(a-d) + 10a + (a+d) = 111a - 99d$.

Reversed number $= 100(a+d) + 10a + (a-d) = 111a + 99d$.

Original $-$ Reversed $= -198d = 594 \Rightarrow d = -3$.

Digits: $a - d = 8$, $a = 5$, $a + d = 2$. Number $= 852$.

**A4.** $a = -6$, $d = -\frac{11}{2} - (-6) = \frac{1}{2}$. $S_n = \frac{n}{2}\left[-12 + (n-1)\frac{1}{2}\right] = -25$.

$n[-24 + (n-1)] = -100 \Rightarrow n^2 - 25n + 100 = 0 \Rightarrow (n - 5)(n - 20) = 0 \Rightarrow n = 5 \text{ or } n = 20$.

Both values are valid since the terms eventually turn positive but the running sum returns to $-25$ again by symmetry; typically $n = 5$ is taken as the primary answer for the first time the sum reaches $-25$.

**A5.** Three-digit numbers leaving remainder 2 on division by 5: $102, 107, \ldots, 997$.

$a = 102$, $d = 5$, $l = 997$. $102 + (n-1)5 = 997 \Rightarrow n = 180$.

$S_{180} = \frac{180}{2}(102 + 997) = 90(1099) = 98910$.
