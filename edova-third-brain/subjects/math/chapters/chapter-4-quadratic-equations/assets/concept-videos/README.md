# Concept Video Scripts

This folder contains the Manim (Python) source scripts used to generate concept videos for Chapter 4 – Quadratic Equations.

## Files

| Script | Generated Video |
|--------|-----------------|
| `quadratic_tutorial.py` | Tutorial on quadratic polynomials and their standard form |
| `root_of_equations.py` | Visual explanation of roots of quadratic equations |
| `train_quadratic.py` | Train problem modeled as a quadratic equation |

## Rendered Outputs

| File | Description |
|------|-------------|
| `quadratic_polynomial.mp4` | Rendered concept video on quadratic polynomials (2.1 MB) |

## How to render

These scripts require [Manim](https://docs.manim.community/) (Community Edition).

```bash
# Install manim if not already installed
pip install manim

# Render a scene
manim -pqh quadratic_tutorial.py QuadraticPolynomialsTutorial
```

> **Note:** The rendered `.mp4` outputs are stored in the OKF bundle at `edova-brain/OKF/math-Knowledge/chapters/quadratic-equations/videos/`.
