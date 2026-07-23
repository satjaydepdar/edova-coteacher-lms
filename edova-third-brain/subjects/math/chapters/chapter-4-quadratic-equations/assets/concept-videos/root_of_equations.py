from manim import *


class RootsOfQuadraticEquation(Scene):
    def construct(self):

        # ==================== FRAME 1: TITLE ====================
        title = Text(
            "Roots of a Quadratic Equation",
            font_size=44, weight=BOLD,
        )
        subtitle = MathTex("ax^2 + bx + c = 0", font_size=52)
        frame1 = VGroup(title, subtitle).arrange(DOWN, buff=0.7)

        self.play(Write(title), run_time=1.5)
        self.play(Write(subtitle), run_time=1.2)
        self.wait(1.5)
        self.play(FadeOut(frame1), run_time=0.6)

        # ==================== FRAME 2: WHAT IS A ROOT? ====================
        f2_title = Text(
            "What is a Root?", font_size=40, weight=BOLD, color=YELLOW,
        )

        f2_line1 = VGroup(
            Text("A ", font_size=30),
            Text("root", font_size=30, color=GREEN, weight=BOLD),
            Text(" is a value of ", font_size=30),
            Text("x", font_size=30, color=BLUE, weight=BOLD),
            Text(" such that:", font_size=30),
        ).arrange(RIGHT)

        f2_eq = MathTex("ax^2 + bx + c = 0", font_size=50)

        f2_note = Text(
            "Substituting this value of x makes the left side equal to zero.",
            font_size=26, color=GREY_B,
        )

        frame2 = VGroup(
            f2_title, f2_line1, f2_eq, f2_note,
        ).arrange(DOWN, buff=0.8)

        self.play(Write(f2_title), run_time=1)
        self.play(FadeIn(f2_line1, shift=DOWN), run_time=1)
        self.play(Write(f2_eq), run_time=1)
        self.play(FadeIn(f2_note, shift=UP * 0.2), run_time=0.8)
        self.wait(2)
        self.play(FadeOut(frame2), run_time=0.6)

        # ==================== FRAME 3: ROOTS = ZEROES ====================
        f3_title = Text(
            "Roots  =  Zeroes of the Polynomial",
            font_size=36, weight=BOLD, color=YELLOW,
        )

        f3_poly = MathTex("p(x) = ax^2 + bx + c", font_size=46)
        f3_set = MathTex("p(x) = 0", font_size=46, color=GREEN)
        f3_arrow = MathTex("\\Downarrow", font_size=40, color=GREY_A)
        f3_eq = MathTex("ax^2 + bx + c = 0", font_size=46)

        f3_conclusion = VGroup(
            Text("The ", font_size=30),
            Text("roots", font_size=30, color=GREEN, weight=BOLD),
            Text(" of the equation  =  the ", font_size=30),
            Text("zeroes", font_size=30, color=BLUE, weight=BOLD),
            Text(" of the polynomial", font_size=30),
        ).arrange(RIGHT)

        frame3 = VGroup(
            f3_title, f3_poly, f3_set, f3_arrow, f3_eq, f3_conclusion,
        ).arrange(DOWN, buff=0.5)

        self.play(Write(f3_title), run_time=1)
        self.play(Write(f3_poly), run_time=0.8)
        self.play(Write(f3_set), run_time=0.8)
        self.play(Write(f3_arrow), run_time=0.4)
        self.play(Write(f3_eq), run_time=0.8)
        self.play(FadeIn(f3_conclusion, shift=DOWN * 0.3), run_time=1)

        f3_box = SurroundingRectangle(
            f3_conclusion, color=YELLOW, buff=0.25, stroke_width=2.5,
        )
        self.play(Create(f3_box), run_time=0.8)
        self.wait(3)
        self.play(FadeOut(frame3), FadeOut(f3_box), run_time=0.6)

        # ==================== FRAME 4: WORKED EXAMPLE ====================
        f4_title = Text(
            "Worked Example", font_size=38, weight=BOLD, color=YELLOW,
        )

        s1 = VGroup(
            Text("Step 1 :  Write the equation", font_size=24, color=GREY_B),
            MathTex("x^2 - 5x + 6 = 0", font_size=38),
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT)

        s2 = VGroup(
            Text("Step 2 :  Factorise", font_size=24, color=GREY_B),
            MathTex("x^2 - 5x + 6 = (x - 2)(x - 3)", font_size=38),
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT)

        s3 = VGroup(
            Text("Step 3 :  Zero-product property", font_size=24, color=GREY_B),
            MathTex("(x - 2)(x - 3) = 0", font_size=38),
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT)

        s4 = VGroup(
            Text("Step 4 :  Roots", font_size=24, color=GREY_B),
            MathTex(
                "x = 2 \\quad \\text{or} \\quad x = 3",
                font_size=38, color=GREEN,
            ),
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT)

        # ---------- FIXED VERIFY SECTION ----------
        # Each verification on its OWN LINE, full substitution shown,
        # left-aligned so numbers are clearly separated.

        f4_verify_label = Text(
            "Verify :  substitute each root back into p(x) = x^2 - 5x + 6",
            font_size=22, color=GREY_B,
        )

        f4_v1 = MathTex(
            "p(2) = (2)^2 - 5(2) + 6 = 4 - 10 + 6 = 0 \\;\\checkmark",
            font_size=28, color=GREEN,
        )

        f4_v2 = MathTex(
            "p(3) = (3)^2 - 5(3) + 6 = 9 - 15 + 6 = 0 \\;\\checkmark",
            font_size=28, color=GREEN,
        )

        f4_verify = VGroup(
            f4_verify_label, f4_v1, f4_v2,
        ).arrange(DOWN, buff=0.12, aligned_edge=LEFT)
        # ------------------------------------------

        steps = VGroup(s1, s2, s3, s4).arrange(
            DOWN, buff=0.25, aligned_edge=LEFT,
        )

        frame4 = VGroup(f4_title, steps, f4_verify).arrange(
            DOWN, buff=0.35, aligned_edge=LEFT,
        )

        self.play(Write(f4_title), run_time=1)
        for step in [s1, s2, s3, s4]:
            self.play(FadeIn(step, shift=DOWN * 0.15), run_time=0.6)
        self.play(FadeIn(f4_verify, shift=UP * 0.15), run_time=0.8)
        self.wait(3)
        self.play(FadeOut(frame4), run_time=0.6)

        # ==================== FRAME 5: SUMMARY ====================
        f5_title = Text(
            "Summary — Points to Remember",
            font_size=38, weight=BOLD, color=YELLOW,
        )

        p1 = VGroup(
            Text("1.  ", font_size=26, color=YELLOW, weight=BOLD),
            Text("Quadratic equation :  ", font_size=26, color=GREY_B),
            MathTex("ax^2+bx+c=0", font_size=32),
        ).arrange(RIGHT, buff=0.1)

        p2 = VGroup(
            Text("2.  ", font_size=26, color=YELLOW, weight=BOLD),
            Text("A ", font_size=26, color=GREY_B),
            Text("root", font_size=26, color=GREEN, weight=BOLD),
            Text(" makes the equation ", font_size=26, color=GREY_B),
            Text("equal to zero", font_size=26, color=GREEN, weight=BOLD),
        ).arrange(RIGHT, buff=0.05)

        p3 = VGroup(
            Text("3.  ", font_size=26, color=YELLOW, weight=BOLD),
            Text("Roots of the equation  =  ", font_size=26, color=GREY_B),
            Text("Zeroes", font_size=26, color=BLUE, weight=BOLD),
            Text(" of the polynomial", font_size=26, color=GREY_B),
        ).arrange(RIGHT, buff=0.05)

        p4 = VGroup(
            Text("4.  ", font_size=26, color=YELLOW, weight=BOLD),
            Text('The terms ', font_size=26, color=GREY_B),
            Text('"root"', font_size=26, color=GREEN, weight=BOLD),
            Text(" and ", font_size=26, color=GREY_B),
            Text('"zero"', font_size=26, color=BLUE, weight=BOLD),
            Text(" are interchangeable", font_size=26, color=GREY_B),
        ).arrange(RIGHT, buff=0.05)

        p5 = VGroup(
            Text("5.  ", font_size=26, color=YELLOW, weight=BOLD),
            Text("A quadratic has ", font_size=26, color=GREY_B),
            Text("at most two real roots", font_size=26, color=ORANGE, weight=BOLD),
        ).arrange(RIGHT, buff=0.05)

        summary_points = VGroup(p1, p2, p3, p4, p5).arrange(
            DOWN, buff=0.4, aligned_edge=LEFT,
        )

        f5 = VGroup(f5_title, summary_points).arrange(DOWN, buff=0.7)

        f5_bg = SurroundingRectangle(
            f5, color=YELLOW, buff=0.5,
            fill_color=BLACK, fill_opacity=0.7,
            stroke_width=2.5,
        )

        self.play(FadeIn(f5_bg), run_time=0.5)
        self.play(Write(f5_title), run_time=1)
        for item in [p1, p2, p3, p4, p5]:
            self.play(FadeIn(item, shift=DOWN * 0.15), run_time=0.6)
        self.wait(5)