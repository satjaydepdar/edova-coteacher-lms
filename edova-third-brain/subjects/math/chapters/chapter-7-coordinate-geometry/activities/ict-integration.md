# ICT Integration

Technology-integrated activities and tools for Chapter 7: Coordinate Geometry.

---

## Activity 1: GeoGebra — Distance Formula Exploration

**Time:** 35 minutes | **Setting:** Computer Lab | **Tool:** GeoGebra Classic (free at geogebra.org)

### Objective
Use GeoGebra to dynamically explore the distance formula and verify it visually by dragging points in real time.

### Procedure
1. Open GeoGebra Classic. Turn on the grid and axes from the View menu.
2. **Step 1:** Use the Point tool to place two points A and B anywhere in the plane.
3. **Step 2:** Use the Segment tool to draw segment AB.
4. **Step 3:** Open View → Algebra View. GeoGebra displays the coordinates of A and B and the length of segment AB automatically.
5. **Step 4:** Manually calculate the distance using the formula: √[(x₂ − x₁)² + (y₂ − y₁)²]. Compare your answer with GeoGebra's value.
6. **Step 5:** Drag point A to a new position. Recalculate manually. Verify again.
7. **Step 6:** Place A and B both on the x-axis (y = 0). Observe that the distance simplifies to |x₂ − x₁|. Confirm with GeoGebra.
8. **Step 7:** Place one point at the origin O(0, 0). Verify that distance = √(x² + y²). This connects to Remark 1 in Section 7.2.
9. **Step 8:** Place three points and check collinearity by drawing a Line through two of them and checking if the third lies on it. This mirrors Example 3.

### Worksheet — Record Your Findings

| A | B | Your Calculation | GeoGebra Value | Match? |
|---|---|---|---|---|
| (3, 2) | (−2, −3) | | | |
| (1, 7) | (4, 2) | | | |
| (6, 4) | (−5, −3) | | | |
| (4, 0) | (6, 0) | | | |
| (0, 0) | (36, 15) | | | |

### Extension
- Create a right triangle by placing three points. Use GeoGebra to measure all three sides. Verify the Pythagorean relationship. This connects to Example 1 where PQ² + PR² = QR² confirmed a right angle.

### Learning Outcome
Dynamic manipulation reinforces that the distance formula works universally, not just for the specific numbers in textbook examples.

---

## Activity 2: Spreadsheet Distance Calculator

**Time:** 30 minutes | **Setting:** Computer Lab | **Tool:** Microsoft Excel or Google Sheets

### Objective
Build a spreadsheet that automatically calculates distances, checks collinearity, and identifies triangle types.

### Procedure
1. Set up column headers in Row 1:
   - A: "x₁", B: "y₁", C: "x₂", D: "y₂", E: "x₃", F: "y₃", G: "AB", H: "BC", I: "AC", J: "Collinear?", K: "Triangle Type"
2. In cell G2, enter the distance formula for AB:
   `=SQRT((C2-A2)^2 + (D2-B2)^2)`
3. In H2, enter for BC:
   `=SQRT((E2-C2)^2 + (F2-D2)^2)`
4. In I2, enter for AC:
   `=SQRT((E2-A2)^2 + (F2-B2)^2)`
5. In J2, enter the collinearity check:
   `=IF(OR(ABS(G2+H2-I2)<0.001, ABS(G2+I2-H2)<0.001, ABS(H2+I2-G2)<0.001), "Yes", "No")`
6. In K2, enter the triangle type detector:
   `=IF(J2="Yes","Collinear",IF(ABS(G2^2+H2^2-I2^2)<0.01,"Right at B",IF(ABS(G2^2+I2^2-H2^2)<0.01,"Right at A",IF(ABS(H2^2+I2^2-G2^2)<0.01,"Right at C",IF(ABS(G2-H2)<0.01,"Isosceles",IF(ABS(G2-I2)<0.01,"Isosceles",IF(ABS(H2-I2)<0.01,"Isosceles","Scalene")))))))`

7. Test with textbook examples:

| x₁ | y₁ | x₂ | y₂ | x₃ | y₃ | AB | BC | AC | Collinear? | Triangle Type |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 2 | −2 | −3 | 2 | 3 | | | | | |
| 1 | 5 | 2 | 3 | −2 | −11 | | | | | |
| 5 | −2 | 6 | 4 | 7 | −2 | | | | | |
| 3 | 1 | 6 | 4 | 8 | 6 | | | | | |

### Expected Results
- Row 1: AB ≈ 7.07, BC ≈ 7.21, AC ≈ 1.41, Not Collinear, **Right at A** (Example 1)
- Row 2: AB ≈ 2.83, BC ≈ 14.14, AC ≈ 16.97, **Collinear** (Exercise 7.1 Q3)
- Row 3: AB ≈ 6.08, BC ≈ 6.08, AC = 2, Not Collinear, **Isosceles** (Exercise 7.1 Q4)
- Row 4: AB ≈ 4.24, BC ≈ 2.83, AC ≈ 7.07, **Collinear** (Example 3)

### Extension
- Add conditional formatting: make "Collinear" cells turn green and "Right" cells turn amber.
- Add a column for the area of the triangle using Heron's formula.

### Learning Outcome
Students learn to automate mathematical calculations, building practical digital skills while reinforcing formula accuracy.

---

## Activity 3: Desmos Graphing Calculator — Locus Visualisation

**Time:** 30 minutes | **Setting:** Computer Lab or Smartphone | **Tool:** Desmos (free at desmos.com)

### Objective
Visualise the locus of points equidistant from two given points, connecting Example 4 and Example 5 from the textbook to an interactive graph.

### Procedure
1. Open desmos.com in a browser.
2. **Step 1:** Plot two points by typing in the expression list:
   `(7, 1)`
   `(3, 5)`
3. **Step 2:** In a new expression line, type the equidistance condition:
   `(x-7)^2 + (y-1)^2 = (x-3)^2 + (y-5)^2`
4. Observe: Desmos draws a straight line. This is the **perpendicular bisector** of the segment joining (7, 1) and (3, 5).
5. **Step 3:** Simplify algebraically on paper:
   - x² − 14x + 49 + y² − 2y + 1 = x² − 6x + 9 + y² − 10y + 25
   - −8x + 8y + 16 = 0
   - **x − y = 2**
6. **Step 4:** Type `x - y = 2` in Desmos. Confirm it matches the line from Step 2.
7. **Step 5:** Click any point on this line. Desmos shows its coordinates. Manually verify that its distances to (7, 1) and (3, 5) are equal.
8. **Step 6:** Plot the point (0, 9). Verify it lies on the line AND is equidistant from both points — this is the answer to Example 5.
9. **Extension:** Replace the points with A(6, 5) and B(−4, 3). Find the new perpendicular bisector and where it crosses the y-axis.

### Exploration Questions
- What happens if both points have the same y-coordinate? What does the perpendicular bisector look like?
- What happens if both points are the same? Why does Desmos show the entire plane shaded?
- Drag one point toward the other. What happens to the perpendicular bisector as the points converge?

### Learning Outcome
Students see algebraic conditions instantly visualised as geometric objects, deepening the algebra-geometry connection.

---

## Activity 4: Python Programming — Coordinate Geometry Toolkit

**Time:** 45 minutes | **Setting:** Computer Lab | **Tool:** Python (IDLE, Replit, or any online compiler)

### Objective
Write Python functions for the distance formula, section formula, and midpoint formula, then use them to solve textbook examples programmatically.

### Complete Code

```python
import math

# Distance Formula: PQ = sqrt[(x2-x1)^2 + (y2-y1)^2]
def distance(x1, y1, x2, y2):
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

# Midpoint Formula: ((x1+x2)/2, (y1+y2)/2)
def midpoint(x1, y1, x2, y2):
    return ((x1 + x2) / 2, (y1 + y2) / 2)

# Section Formula (internal division)
def section_point(x1, y1, x2, y2, m1, m2):
    x = (m1 * x2 + m2 * x1) / (m1 + m2)
    y = (m1 * y2 + m2 * y1) / (m1 + m2)
    return (x, y)

# Collinearity Check: AB + BC = AC?
def is_collinear(x1, y1, x2, y2, x3, y3):
    ab = distance(x1, y1, x2, y2)
    bc = distance(x2, y2, x3, y3)
    ac = distance(x1, y1, x3, y3)
    t = 0.001
    return (abs(ab+bc-ac)<t or abs(ab+ac-bc)<t or abs(ac+bc-ab)<t)

# Triangle Type (converse of Pythagoras, as in Example 1)
def triangle_type(x1, y1, x2, y2, x3, y3):
    a = distance(x2, y2, x3, y3)
    b = distance(x1, y1, x3, y3)
    c = distance(x1, y1, x2, y2)
    sides = sorted([a, b, c])
    is_right = abs(sides[0]**2 + sides[1]**2 - sides[2]**2) < 0.01
    is_iso = abs(sides[0]-sides[1])<0.01 or abs(sides[1]-sides[2])<0.01
    is_eq = abs(sides[0]-sides[1])<0.01 and abs(sides[1]-sides[2])<0.01
    if is_eq: return "Equilateral"
    if is_right and is_iso: return "Right Isosceles"
    if is_right: return "Right"
    if is_iso: return "Isosceles"
    return "Scalene"

print("=" * 50)
print("CHAPTER 7 COORDINATE GEOMETRY TOOLKIT")
print("=" * 50)

# Example 1: P(3,2), Q(-2,-3), R(2,3)
print("\n--- Example 1: Triangle Type ---")
print(f"AB = {distance(3,2,-2,-3):.4f}")
print(f"QR = {distance(-2,-3,2,3):.4f}")
print(f"PR = {distance(3,2,2,3):.4f}")
print(f"Type: {triangle_type(3,2,-2,-3,2,3)}")
print(f"Collinear? {is_collinear(3,2,-2,-3,2,3)}")

# Example 2: Square check A(1,7), B(4,2), C(-1,-1), D(-4,4)
print("\n--- Example 2: Square Verification ---")
ab = distance(1,7,4,2)
bc = distance(4,2,-1,-1)
cd = distance(-1,-1,-4,4)
da = distance(-4,4,1,7)
ac = distance(1,7,-1,-1)
bd = distance(4,2,-4,4)
print(f"AB={ab:.2f} BC={bc:.2f} CD={cd:.2f} DA={da:.2f}")
print(f"AC={ac:.2f} BD={bd:.2f}")
print(f"All sides equal? {abs(ab-bc)<.01 and abs(bc-cd)<.01 and abs(cd-da)<.01}")
print(f"Diagonals equal? {abs(ac-bd)<.01}")

# Example 3: Collinearity A(3,1), B(6,4), C(8,6)
print("\n--- Example 3: Collinearity ---")
print(f"AB={distance(3,1,6,4):.4f} BC={distance(6,4,8,6):.4f} AC={distance(3,1,8,6):.4f}")
print(f"AB+BC={distance(3,1,6,4)+distance(6,4,8,6):.4f}")
print(f"Collinear? {is_collinear(3,1,6,4,8,6)}")

# Example 6: Section formula (4,-3) to (8,5) in ratio 3:1
print("\n--- Example 6: Section Formula ---")
print(f"Point: {section_point(4,-3,8,5,3,1)}")

# Example 8: Trisection of (2,-2) to (-7,4)
print("\n--- Example 8: Trisection ---")
print(f"First point (1:2): {section_point(2,-2,-7,4,1,2)}")
print(f"Second point (2:1): {section_point(2,-2,-7,4,2,1)}")

# Exercise 7.1 Q7: Point on x-axis equidistant from (2,-5) and (-2,9)
print("\n--- Exercise Q7: Equidistant on x-axis ---")
for x in range(-20, 21):
    d1 = distance(x, 0, 2, -5)
    d2 = distance(x, 0, -2, 9)
    if abs(d1 - d2) < 0.01:
        print(f"Point: ({x}, 0), distances: {d1:.2f} and {d2:.2f}")

# Exercise 7.1 Q8: y values for P(2,-3) and Q(10,y) at distance 10
print("\n--- Exercise Q8: Find y ---")
for y in range(-20, 21):
    if abs(distance(2, -3, 10, y) - 10) < 0.01:
        print(f"y = {y}, distance = {distance(2,-3,10,y):.4f}")
```

### Challenges
1. Modify the program to accept user input for any two points and output the distance.
2. Write a function `quadrilateral_type(list_of_8_coords)` that takes 4 points (8 numbers) and identifies whether the quadrilateral is a square, rectangle, rhombus, or parallelogram (as in Exercise 7.1 Q6).
3. Write a function that finds the ratio in which a given point divides a line segment (reverse of the section formula, as in Example 7).

### Learning Outcome
Students translate mathematical formulas into code, reinforcing understanding through a different modality. The precision required in programming mirrors the precision in coordinate geometry.

---

## Activity 5: Google Maps — Real-World Distance Comparison

**Time:** 25 minutes | **Setting:** Computer Lab or Smartphone | **Tool:** Google Maps

### Objective
Compare straight-line (Euclidean) distance calculated by the distance formula with actual road distance from Google Maps. This connects to the town A and B scenario from Section 7.2.

### Procedure
1. Choose your school as point A. Right-click on Google Maps to find its coordinates.
2. Choose 5 nearby landmarks as points B. Note each landmark's coordinates.
3. **Calculate Euclidean distance:** Use the distance formula. Note: Google Maps coordinates are in degrees. To get an approximate distance in km, multiply the raw formula result by 111 km (approximate length of 1 degree of latitude near the equator).
4. **Get road distance:** Use Google Maps Directions to find the walking distance from A to each B.
5. **Compare and record:**

| Landmark | Coordinates | Euclidean (km) | Road Distance (km) | Ratio (Road/Euclidean) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

6. **Analyse:** Why is the road distance always greater than or equal to the straight-line distance?

### Connection to the Textbook
In Section 7.2, town B is 36 km east and 15 km north of town A. The Euclidean distance is √(36² + 15²) = 39 km. In reality, no road follows a perfectly straight diagonal — the actual driving distance would be longer. This activity makes that limitation tangible.

### Discussion Questions
- What is the average ratio of road distance to Euclidean distance in your data?
- Does the ratio change for longer vs shorter distances? Why?
- What factors (rivers, hills, one-way streets) make the road distance much larger than the Euclidean distance?
- The distance formula assumes a flat plane. For very long distances (e.g., cities in different countries), why does this formula become inaccurate? (Answer: Earth's curvature — you need the Haversine formula instead.)

### Learning Outcome
Students see the distance formula as a simplified model of real-world distance and understand its limitations regarding terrain, roads, and Earth's curvature.

---

## Activity 6: Interactive Quiz — Kahoot / Quizizz

**Time:** 15 minutes | **Setting:** Classroom with projector and student devices | **Tool:** Kahoot (kahoot.com) or Quizizz (quizizz.com)

### Objective
Gamified assessment covering every key concept from Chapter 7.

### Quiz Questions (pre-load into Kahoot)

**Q1.** What is the distance between (2, 3) and (4, 1)?
- a) 2√2  ✅  b) 4  c) 2  d) 8

**Q2.** The distance of point (5, 12) from the origin is:
- a) 17  ✅  b) 13  c) 7  d) 12

**Q3.** The midpoint of (2, −2) and (−7, 4) is:
- a) (−2.5, 1)  ✅  b) (−5, 2)  c) (−4.5, 1)  d) (−2, 1)

**Q4.** If AP : PB = 1 : 2 and A is (0, 0), B is (36, 15), then P is:
- a) (12, 5)  ✅  b) (24, 10)  c) (18, 7.5)  d) (9, 3.75)

**Q5.** Points (1, 5), (2, 3), (−2, −11) are:
- a) Collinear  ✅  b) Vertices of a right triangle  c) Vertices of a square  d) Not collinear

**Q6.** The point on the y-axis equidistant from (6, 5) and (−4, 3) is:
- a) (0, 9)  ✅  b) (0, 5)  c) (0, 7)  d) (0, −9)

**Q7.** The perpendicular bisector of the segment joining (7, 1) and (3, 5) has the equation:
- a) x − y = 2  ✅  b) x + y = 2  c) x − y = −2  d) 2x − y = 5

**Q8.** The points of trisection of the segment joining (4, −1) and (−2, −3) are:
- a) (2, −5/3) and (0, −7/3)  ✅  b) (1, −2) and (−1, −2)  c) (3, −1) and (1, −2)  d) (2, −1) and (0, −2)

**Q9.** If (1, 7), (4, 2), (−1, −1), (−4, 4) are vertices of a quadrilateral, it is a:
- a) Square  ✅  b) Rectangle  c) Rhombus  d) Parallelogram

**Q10.** How many points of trisection does a line segment have?
- a) 2  ✅  b) 3  c) 1  d) Infinite

### Learning Outcome
Gamified assessment reinforces recall speed and identifies common misconceptions in a low-stakes, engaging format.

---

## Activity 7: Pixel Art in a Spreadsheet

**Time:** 35 minutes | **Setting:** Computer Lab | **Tool:** Microsoft Excel or Google Sheets

### Objective
Use spreadsheet cells as pixels and coordinate references to create pixel art, reinforcing the connection between (row, column) and (x, y).

### Procedure
1. Open a new spreadsheet. Select a range (e.g., A1:Z26).
2. Resize all cells to small squares (approximately 20 × 20 pixels). In Excel: select columns A–Z, right-click → Column Width → 2.5. Select rows 1–26, right-click → Row Height → 18.
3. **Understanding the grid:** In a spreadsheet, columns are like the x-axis (A=1, B=2, ...) and rows are like the y-axis but inverted (Row 1 is at the top). Set up a mapping: **x = column number**, **y = 27 − row number** (so Row 26 = y=1, Row 1 = y=26).

4. **Create the textbook figure:** Plot the coordinate art from the textbook's opening exercise:

| Point | Column | Row (27−y) | Colour |
|---|---|---|---|
| A(4, 8) | D | 19 | Blue |
| B(3, 9) | C | 18 | Blue |
| C(3, 8) | C | 19 | Blue |
| D(1, 6) | A | 21 | Blue |
| E(1, 5) | A | 22 | Blue |
| F(3, 3) | C | 24 | Blue |
| G(6, 3) | F | 24 | Blue |
| H(8, 5) | H | 22 | Blue |
| I(8, 6) | H | 21 | Blue |
| J(6, 8) | F | 19 | Blue |
| K(6, 9) | F | 18 | Blue |
| L(5, 8) | E | 19 | Blue |

5. Colour each cell using the Fill Colour tool.
6. **Verification:** In an adjacent column, use the distance formula to verify distances between key points. For example, in cell AA2: `=SQRT((3-4)^2 + (9-8)^2)` should give √2 ≈ 1.41.
7. **Extension:** Create your own pixel art character with at least 20 coordinate points. List all coordinates on a separate sheet. Swap with a partner — can they recreate your art from the coordinates alone?

### Learning Outcome
Students practice coordinate plotting in a digital medium, understanding that spreadsheet cells are essentially a coordinate grid used daily in data work.

---

## Activity 8: Online Simulation — PhET Interactive Geometry

**Time:** 20 minutes | **Setting:** Computer Lab | **Tool:** PhET Interactive Simulations (phet.colorado.edu)

### Objective
Explore coordinate positions and distances interactively using PhET's simulation tools.

### Procedure
1. Navigate to phet.colorado.edu. Search for "Coordinate Plane" in the simulation library.
2. **Free Exploration (8 minutes):**
   - Plot points by clicking on the grid.
   - Observe how the coordinates change as you drag points.
   - Measure distances between plotted points if the tool provides this feature.
   - Explore what happens when you move points to different quadrants.
3. **Guided Task (10 minutes):** Recreate the textbook's Example 1 on the simulation:
   - Plot P(3, 2), Q(−2, −3), and R(2, 3).
   - If the simulation shows distances, verify: PQ ≈ 7.07, QR ≈ 7.21, PR ≈ 1.41.
   - Check: does PQ² + PR² = QR²? (7.07² + 1.41² ≈ 50 + 2 = 52 ≈ 7.21² ≈ 52)
   - This confirms the right angle at P.
4. **Additional Task:** Plot the four vertices of the square from Example 2: (1, 7), (4, 2), (−1, −1), (−4, 4). Visually verify they form a square.

### Discussion
- How does the simulation help you understand the relationship between coordinates and position?
- What advantages does a digital simulation have over paper graph work?
- What are the limitations of the simulation compared to doing the calculations yourself?

### Learning Outcome
Interactive simulations provide immediate visual feedback, helping students build intuition about coordinates and distances before or alongside formal calculation.

---

## Activity 9: Digital Presentation — Formula Derivation

**Time:** 40 minutes (can be assigned as homework) | **Setting:** Computer Lab or Home | **Tool:** Google Slides, PowerPoint, or Canva

### Objective
Create a 5-slide digital presentation explaining the derivation of the distance formula or section formula, combining mathematical rigour with visual design.

### Slide Requirements

**Slide 1 — Title Slide**
- Title: "Derivation of the Distance Formula" (or Section Formula)
- Subtitle: Chapter 7 — Coordinate Geometry
- Your name and class

**Slide 2 — Geometric Setup**
- Diagram showing two points P(x₁, y₁) and Q(x₂, y₂) on a coordinate plane
- Perpendiculars PR and QS drawn to the x-axis
- PT drawn perpendicular to QS, forming right triangle PTQ
- All lengths labelled: PT = |x₂ − x₁|, QT = |y₂ − y₁|
- Use the drawing tools or insert a neatly made image

**Slide 3 — Pythagoras Connection**
- Show right triangle PTQ
- State: "In right triangle PTQ, by Pythagoras Theorem:"
- PQ² = PT² + QT²
- Substitute: PQ² = (x₂ − x₁)² + (y₂ − y₁)²

**Slide 4 — Final Formula**
- Take square root: PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]
- Note: "Since distance is always non-negative, we take only the positive square root."
- Special case: distance from origin = √(x² + y²)

**Slide 5 — Worked Example**
- Solve one textbook example completely, showing every step.
- Recommended: Example 1 (find triangle type for P(3,2), Q(−2,−3), R(2,3)) or Example 2 (verify square for four given points).
- Show all distance calculations and the conclusion.

### Assessment Criteria

| Criterion | Excellent (3) | Satisfactory (2) | Needs Work (1) |
|---|---|---|---|
| Mathematical accuracy | All steps correct | Minor errors | Major errors |
| Diagram quality | Clear, labelled, accurate | Mostly clear | Unclear or missing |
| Visual design | Readable, good contrast, uncluttered | Adequate | Hard to read |
| Notation | Correct subscripts, superscripts, √ symbols | Mostly correct | Missing or wrong |
| Completeness | All 5 slides present | 4 slides | 3 or fewer slides |

### Learning Outcome
Explaining a derivation requires deeper understanding than simply applying it. This activity also builds digital communication skills — the ability to present mathematical reasoning clearly is essential in STEM fields.
