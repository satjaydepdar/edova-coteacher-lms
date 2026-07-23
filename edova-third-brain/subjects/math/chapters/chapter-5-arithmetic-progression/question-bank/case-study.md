---
type: Assessment
title: Chapter 5 — Case Study Questions
description: Case study based questions for Arithmetic Progressions.
tags: [arithmetic-progressions, case-study, assessment, class-X, chapter-5]
difficulty: 3
read_time: 6
timestamp: 2026-07-15T00:00:00Z
---

# Case Study Questions

## Case Study 1: Auditorium Seating

A theatre has 20 seats in the first row, 22 seats in the second row, 24 seats in the third row, and so on, each row having 2 more seats than the previous one.

**Q1.** How many seats are there in the 15th row?

**Q2.** How many total seats are there in the first 15 rows?

**Q3.** Which row is the first to have at least 50 seats?

---

## Answers

**A1.** $a = 20$, $d = 2$. $a_{15} = 20 + 14(2) = 48$ seats.

**A2.** $S_{15} = \frac{15}{2}[40 + 14(2)] = \frac{15}{2}(68) = 510$ seats.

**A3.** $20 + (n-1)2 \geq 50 \Rightarrow (n-1) \geq 15 \Rightarrow n \geq 16$. The 16th row.

---

## Case Study 2: Stacking Logs

200 logs are stacked so that the bottom row has 20 logs, the next row has 19 logs, the row above that has 18 logs, and so on, decreasing by 1 log per row, until the stack is used up.

**Q1.** In how many rows are the 200 logs placed?

**Q2.** How many logs are in the top row?

**Q3.** Why is only one of the two mathematical solutions for the number of rows valid here?

---

## Answers

**A1.** $a = 20$, $d = -1$, $S_n = 200$. $\frac{n}{2}[40 - (n-1)] = 200 \Rightarrow n^2 - 41n + 400 = 0 \Rightarrow n = 16$ or $n = 25$. The logs are placed in **16 rows**.

**A2.** Top row (16th row): $a_{16} = 20 - 15(1) = 5$ logs.

**A3.** $n = 25$ is rejected because the number of logs per row cannot go negative — by the 21st row the count would already reach zero, so a 25-row stack is not physically possible.
