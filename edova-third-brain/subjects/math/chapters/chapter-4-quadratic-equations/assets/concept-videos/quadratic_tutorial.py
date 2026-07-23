from manim import *

# ── Colour palette ──────────────────────────────────────────────
C_QUAD   = "#FF4444"
C_LINEAR = "#4499FF"
C_CONST  = "#44CC44"
C_FULL   = "#FFCC00"
C_CURVE  = "#00CCAA"
C_ACCENT = "#FF8800"


class QuadraticPolynomialsTutorial(Scene):

    # ────────────────────────────────────────────────────────────
    # 1. TITLE
    # ────────────────────────────────────────────────────────────
    def section_title(self):
        title = Text("Quadratic Polynomials", font_size=52, weight=BOLD)
        formula = MathTex("f(x) = ax^2 + bx + c", font_size=56, color=C_FULL)
        VGroup(title, formula).arrange(DOWN, buff=0.7).move_to(ORIGIN)
        self.play(Write(title), run_time=1.2)
        self.play(Write(formula), run_time=1.5)
        self.wait(2)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 2. WHAT IS QUADRATIC?
    # ────────────────────────────────────────────────────────────
    def section_what_is_quadratic(self):
        heading = Text("What makes a polynomial 'quadratic'?",
                       font_size=32, weight=BOLD)
        heading.to_edge(UP, buff=0.6)
        self.play(Write(heading), run_time=0.8)

        row1 = VGroup(
            Text("Linear:", font_size=24, color=GREY),
            MathTex("3x + 5", font_size=30, color=GREY)
        ).arrange(RIGHT, buff=0.4)

        row2 = VGroup(
            Text("Quadratic:", font_size=24, color=C_FULL),
            MathTex("x^2 - 4", font_size=30, color=C_FULL)
        ).arrange(RIGHT, buff=0.4)

        row3 = VGroup(
            Text("Cubic:", font_size=24, color=GREY),
            MathTex("2x^3 + x - 1", font_size=30, color=GREY)
        ).arrange(RIGHT, buff=0.4)

        row4 = VGroup(
            Text("Quadratic:", font_size=24, color=C_FULL),
            MathTex("-3x^2 + 7x", font_size=30, color=C_FULL)
        ).arrange(RIGHT, buff=0.4)

        row5 = VGroup(
            Text("Quadratic:", font_size=24, color=C_FULL),
            MathTex("5x^2", font_size=30, color=C_FULL)
        ).arrange(RIGHT, buff=0.4)

        col1 = VGroup(row1, row3, row5).arrange(DOWN, buff=0.7, aligned_edge=LEFT)
        col2 = VGroup(row2, row4).arrange(DOWN, buff=0.7, aligned_edge=LEFT)
        cols = VGroup(col1, col2).arrange(RIGHT, buff=3.0, aligned_edge=UP)
        cols.next_to(heading, DOWN, buff=0.8)

        for row in [row1, row2, row3, row4, row5]:
            self.play(FadeIn(row, shift=RIGHT * 0.3), run_time=0.4)

        insight = VGroup(
            Text("Key Insight:", font_size=26, weight=BOLD, color=C_ACCENT),
            Text("The highest power of x is 2.", font_size=26),
        ).arrange(DOWN, buff=0.15, aligned_edge=LEFT)
        box = SurroundingRectangle(insight, color=C_ACCENT,
                                   buff=0.3, corner_radius=0.1)
        VGroup(insight, box).next_to(cols, DOWN, buff=0.8)
        self.play(FadeIn(VGroup(insight, box), shift=UP * 0.3), run_time=0.8)
        self.wait(2.5)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 3. ANATOMY  (COMPLETELY REDESIGNED — NO OVERLAP)
    # ────────────────────────────────────────────────────────────
    def section_anatomy(self):
        heading = Text("Anatomy of  ax\u00B2 + bx + c",
                       font_size=34, weight=BOLD)
        heading.to_edge(UP, buff=0.6)
        self.play(Write(heading), run_time=0.8)

        # --- Formula on top, big and clear ---
        a_part  = MathTex("ax^2",  font_size=64, color=C_QUAD)
        plus1   = MathTex("+",     font_size=64, color=WHITE)
        b_part  = MathTex("bx",    font_size=64, color=C_LINEAR)
        plus2   = MathTex("+",     font_size=64, color=WHITE)
        c_part  = MathTex("c",     font_size=64, color=C_CONST)
        formula = VGroup(a_part, plus1, b_part, plus2, c_part
                         ).arrange(RIGHT, buff=0.35)
        formula.next_to(heading, DOWN, buff=0.8)

        self.play(Write(a_part), run_time=0.4)
        self.play(Write(plus1), run_time=0.2)
        self.play(Write(b_part), run_time=0.4)
        self.play(Write(plus2), run_time=0.2)
        self.play(Write(c_part), run_time=0.4)

        # --- Colored underlines under each term ---
        ul_a = Underline(a_part, color=C_QUAD,   stroke_width=4)
        ul_b = Underline(b_part, color=C_LINEAR, stroke_width=4)
        ul_c = Underline(c_part, color=C_CONST,  stroke_width=4)
        self.play(Create(ul_a), Create(ul_b), Create(ul_c), run_time=0.5)

        # --- Legend list BELOW the formula, well-spaced ---
        # Each item: colored bullet + term + description
        item_a = VGroup(
            Dot(radius=0.1, color=C_QUAD),
            MathTex("ax^2", font_size=32, color=C_QUAD),
            Text("Quadratic term  —  Controls curve shape",
                 font_size=24, color=WHITE)
        ).arrange(RIGHT, buff=0.35)

        item_b = VGroup(
            Dot(radius=0.1, color=C_LINEAR),
            MathTex("bx", font_size=32, color=C_LINEAR),
            Text("Linear term  —  Shifts the vertex",
                 font_size=24, color=WHITE)
        ).arrange(RIGHT, buff=0.35)

        item_c = VGroup(
            Dot(radius=0.1, color=C_CONST),
            MathTex("c", font_size=32, color=C_CONST),
            Text("Constant term  —  Y-intercept",
                 font_size=24, color=WHITE)
        ).arrange(RIGHT, buff=0.35)

        legend = VGroup(item_a, item_b, item_c).arrange(
            DOWN, buff=0.6, aligned_edge=LEFT
        )
        legend.next_to(formula, DOWN, buff=1.0)

        # Animate legend items one by one
        self.play(FadeIn(item_a, shift=LEFT * 0.3), run_time=0.5)
        self.play(FadeIn(item_b, shift=LEFT * 0.3), run_time=0.5)
        self.play(FadeIn(item_c, shift=LEFT * 0.3), run_time=0.5)

        # --- Condition at the bottom ---
        cond = VGroup(
            MathTex("a \\neq 0", font_size=30, color=C_QUAD),
            Text("(otherwise it's not quadratic!)",
                 font_size=20, color=GREY_B)
        ).arrange(RIGHT, buff=0.3)
        cond.next_to(legend, DOWN, buff=0.9)
        self.play(FadeIn(cond, shift=UP * 0.2), run_time=0.5)

        self.wait(3)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 4. THE PARABOLA
    # ────────────────────────────────────────────────────────────
    def section_parabola_intro(self):
        heading = Text("The Graph Is Always a Parabola",
                       font_size=34, weight=BOLD)
        heading.to_edge(UP, buff=0.6)
        self.play(Write(heading), run_time=0.8)

        ax = Axes(x_range=[-3.5, 3.5, 1], y_range=[-1, 10, 1],
                  x_length=6, y_length=5,
                  axis_config={"include_numbers": True, "font_size": 20}
                  ).shift(DOWN * 0.3 + RIGHT * 0.5)

        curve = ax.plot(lambda x: x ** 2, color=C_CURVE, stroke_width=3)
        clbl  = MathTex("y = x^2", font_size=28, color=C_CURVE)
        clbl.next_to(curve, RIGHT, buff=0.3).shift(UP * 0.5)

        self.play(Create(ax), run_time=1)
        self.play(Create(curve), run_time=1.8)
        self.play(Write(clbl), run_time=0.4)

        vd = Dot(ax.c2p(0, 0), color=YELLOW, radius=0.08)
        vl = MathTex("(0,\\,0)", font_size=22, color=YELLOW)
        vl.next_to(vd, LEFT + DOWN, buff=0.15)
        yl = Text("Y-intercept", font_size=18, color=C_CONST)
        yl.next_to(vd, LEFT + UP, buff=0.2)

        sym = DashedLine(ax.c2p(0, -0.5), ax.c2p(0, 9.5),
                         color=GREY, stroke_width=1.4, dash_length=0.1)
        sl  = Text("Axis of\nsymmetry", font_size=15, color=GREY)
        sl.next_to(sym, LEFT, buff=0.15)

        self.play(FadeIn(vd, scale=1.5), run_time=0.4)
        self.play(Write(vl), Write(yl), run_time=0.4)
        self.play(Create(sym), Write(sl), run_time=0.7)

        arr = Arrow(ax.c2p(0.6, 3), ax.c2p(0.6, 7), color=C_CURVE,
                    stroke_width=2, max_tip_length_to_length_ratio=0.15)
        ol  = Text("Opens upward (a > 0)", font_size=18, color=C_CURVE)
        ol.next_to(arr, RIGHT, buff=0.2)
        self.play(GrowArrow(arr), Write(ol), run_time=0.7)
        self.wait(3)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 5. EFFECT OF 'a'
    # ────────────────────────────────────────────────────────────
    def section_effect_of_a(self):
        h = Text("What does 'a' do?", font_size=34,
                 weight=BOLD, color=C_QUAD)
        h.to_edge(UP, buff=0.6)
        self.play(Write(h), run_time=0.8)

        ax = Axes(x_range=[-3.5, 3.5, 1], y_range=[-1, 10, 2],
                  x_length=6, y_length=5.5,
                  axis_config={"include_numbers": True, "font_size": 18}
                  ).shift(DOWN * 0.2 + LEFT * 0.3)
        self.play(Create(ax), run_time=0.7)

        specs = [
            (0.5, "#88CCFF", "a = 1/2  ->  wide"),
            (1.0, C_CURVE,  "a = 1    ->  standard"),
            (2.0, "#FF8844", "a = 2    ->  narrow"),
            (4.0, "#FF4444", "a = 4    ->  very narrow"),
        ]
        labels = VGroup()
        for a_val, col, txt in specs:
            c = ax.plot(lambda x, a=a_val: a * x ** 2,
                        color=col, stroke_width=2.5)
            l = Text(txt, font_size=18, color=col)
            labels.add(l)
            self.play(Create(c), run_time=0.7)
            self.wait(0.3)
        labels.arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        labels.to_edge(RIGHT, buff=0.5).shift(UP * 0.5)
        self.play(FadeIn(labels, shift=LEFT * 0.3), run_time=0.6)
        self.wait(1.5)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

        # a < 0
        h2 = Text("When a < 0 the parabola flips!",
                  font_size=28, color=C_QUAD)
        h2.to_edge(UP, buff=0.6)
        ax2 = Axes(x_range=[-3.5, 3.5, 1], y_range=[-10, 5, 2],
                   x_length=6, y_length=5.5,
                   axis_config={"include_numbers": True, "font_size": 18}
                   ).shift(DOWN * 0.2 + LEFT * 0.3)
        c_up   = ax2.plot(lambda x: x ** 2,  color=C_CURVE,
                          stroke_width=2, stroke_opacity=0.35)
        c_down = ax2.plot(lambda x: -x ** 2, color="#FF4444",
                          stroke_width=3)
        l_up   = Text("a = 1  (opens up)",   font_size=20, color=C_CURVE
                       ).shift(RIGHT * 3.5 + UP * 0.8)
        l_dn   = Text("a = -1 (opens down)", font_size=20, color="#FF4444"
                       ).shift(RIGHT * 3.5 + DOWN * 0.3)
        od     = Text("Opens downward", font_size=22,
                      color="#FF4444", weight=BOLD)
        od.next_to(c_down, RIGHT, buff=0.5).shift(DOWN * 1.2)

        self.play(Write(h2), Create(ax2), run_time=0.8)
        self.play(Create(c_up),  Write(l_up), run_time=0.6)
        self.play(Create(c_down), Write(l_dn), run_time=0.7)
        self.play(Write(od), run_time=0.4)
        self.wait(2.5)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 6. EFFECT OF 'c'
    # ────────────────────────────────────────────────────────────
    def section_effect_of_c(self):
        h = Text("What does 'c' do?", font_size=34,
                 weight=BOLD, color=C_CONST)
        h.to_edge(UP, buff=0.6)
        sub = Text("It's the y-intercept!", font_size=24, color=GREY)
        sub.next_to(h, DOWN, buff=0.25)
        self.play(Write(h), Write(sub), run_time=0.7)

        ax = Axes(x_range=[-3, 3, 1], y_range=[-2, 13, 2],
                  x_length=6, y_length=5.5,
                  axis_config={"include_numbers": True, "font_size": 18}
                  ).shift(DOWN * 0.2 + LEFT * 0.3)
        self.play(Create(ax), run_time=0.7)

        specs = [
            (0,  C_CURVE,  "c = 0"),
            (2,  C_CONST,  "c = 2"),
            (5,  "#CCAA00", "c = 5"),
            (-1, "#CC44CC", "c = -1"),
        ]
        labels = VGroup()
        for c_val, col, txt in specs:
            curve = ax.plot(lambda x, c=c_val: x ** 2 + c,
                            color=col, stroke_width=2.5)
            dot   = Dot(ax.c2p(0, c_val), color=col, radius=0.07)
            l     = Text(txt, font_size=18, color=col)
            labels.add(l)
            self.play(Create(curve), run_time=0.6)
            self.play(FadeIn(dot, scale=1.5), run_time=0.3)
            self.wait(0.25)
        labels.arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        labels.to_edge(RIGHT, buff=0.5).shift(UP * 0.5)
        self.play(FadeIn(labels, shift=LEFT * 0.3), run_time=0.5)

        note = Text("Up c  moves graph UP     Down c  moves graph DOWN",
                    font_size=21)
        note.to_edge(DOWN, buff=0.5)
        self.play(Write(note), run_time=0.7)
        self.wait(2.5)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 7. EFFECT OF 'b'
    # ────────────────────────────────────────────────────────────
    def section_effect_of_b(self):
        h = Text("What does 'b' do?", font_size=34,
                 weight=BOLD, color=C_LINEAR)
        h.to_edge(UP, buff=0.6)
        sub = Text("It shifts the vertex left or right!",
                   font_size=24, color=GREY)
        sub.next_to(h, DOWN, buff=0.25)
        self.play(Write(h), Write(sub), run_time=0.7)

        ax = Axes(x_range=[-4, 5, 1], y_range=[-2, 10, 2],
                  x_length=7, y_length=5,
                  axis_config={"include_numbers": True, "font_size": 18}
                  ).shift(DOWN * 0.3)
        self.play(Create(ax), run_time=0.7)

        specs = [
            ( 0, C_CURVE,  "b =  0  ->  vertex at x = 0"),
            ( 2, "#4499FF", "b =  2  ->  vertex at x = -1"),
            (-2, "#8844FF", "b = -2  ->  vertex at x =  1"),
            ( 4, "#FF8844", "b =  4  ->  vertex at x = -2"),
        ]
        labels = VGroup()
        for b_val, col, txt in specs:
            h_val = -b_val / 2.0
            k_val = h_val ** 2 + b_val * h_val
            curve = ax.plot(lambda x, b=b_val: x ** 2 + b * x,
                            color=col, stroke_width=2.5)
            dot   = Dot(ax.c2p(h_val, k_val), color=YELLOW, radius=0.07)
            l     = Text(txt, font_size=17, color=col)
            labels.add(l)
            self.play(Create(curve), run_time=0.6)
            self.play(FadeIn(dot, scale=1.5), run_time=0.25)
            self.wait(0.2)
        labels.arrange(DOWN, buff=0.4, aligned_edge=LEFT)
        labels.to_edge(RIGHT, buff=0.4).shift(UP * 0.3)
        self.play(FadeIn(labels, shift=LEFT * 0.3), run_time=0.5)

        vf  = MathTex("x_{\\text{vertex}} = \\frac{-b}{2a}",
                       font_size=32, color=YELLOW)
        vf.to_edge(DOWN, buff=0.5)
        box = SurroundingRectangle(vf, color=YELLOW, buff=0.2,
                                   corner_radius=0.1)
        self.play(Write(vf), Create(box), run_time=0.9)
        self.wait(3)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 8. FULL EXAMPLE
    # ────────────────────────────────────────────────────────────
    def section_full_example(self):
        h = Text("Putting It All Together", font_size=34, weight=BOLD)
        h.to_edge(UP, buff=0.6)
        self.play(Write(h), run_time=0.8)

        eq = MathTex("f(x) = x^2 - 4x + 3", font_size=38, color=C_FULL)
        eq.next_to(h, DOWN, buff=0.45)

        bd = VGroup(
            MathTex("a=", "1",  font_size=28).set_color_by_tex("1",  C_QUAD),
            MathTex("b=", "-4", font_size=28).set_color_by_tex("-4", C_LINEAR),
            MathTex("c=", "3",  font_size=28).set_color_by_tex("3",  C_CONST),
        ).arrange(RIGHT, buff=1.2)
        bd.next_to(eq, DOWN, buff=0.35)

        self.play(Write(eq), FadeIn(bd), run_time=0.8)

        ax = Axes(x_range=[-1, 5, 1], y_range=[-2, 8, 1],
                  x_length=5.5, y_length=4.5,
                  axis_config={"include_numbers": True, "font_size": 17}
                  ).shift(DOWN * 0.6 + RIGHT * 2.8)
        curve = ax.plot(lambda x: x ** 2 - 4 * x + 3,
                        color=C_CURVE, stroke_width=3)
        sym = DashedLine(ax.c2p(2, -1.5), ax.c2p(2, 7.5),
                         color=GREY, stroke_width=1, dash_length=0.08)

        self.play(Create(ax), Create(curve), Create(sym), run_time=1.2)

        vd  = Dot(ax.c2p(2, -1), color=YELLOW, radius=0.08)
        vdl = MathTex("(2,\\,-1)", font_size=19, color=YELLOW)
        vdl.next_to(vd, RIGHT, buff=0.12)

        r1d = Dot(ax.c2p(1, 0), color=RED, radius=0.08)
        r1l = MathTex("(1,\\,0)", font_size=19, color=RED)
        r1l.next_to(r1d, DOWN + LEFT, buff=0.08)

        r2d = Dot(ax.c2p(3, 0), color=RED, radius=0.08)
        r2l = MathTex("(3,\\,0)", font_size=19, color=RED)
        r2l.next_to(r2d, DOWN + RIGHT, buff=0.08)

        yd  = Dot(ax.c2p(0, 3), color=C_CONST, radius=0.08)
        yl  = MathTex("(0,\\,3)", font_size=19, color=C_CONST)
        yl.next_to(yd, LEFT, buff=0.12)

        props = VGroup(
            Text("* Vertex: (2, -1)",          font_size=19, color=YELLOW),
            Text("* Roots: x = 1,  x = 3",     font_size=19, color=RED),
            Text("* Y-intercept: (0, 3)",       font_size=19, color=C_CONST),
            Text("* Opens: upward  (a > 0)",    font_size=19, color=C_CURVE),
            Text("* Axis of symmetry: x = 2",   font_size=19, color=GREY),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        props.next_to(bd, DOWN, buff=0.45).shift(LEFT * 0.4)

        self.play(FadeIn(vd, scale=1.5), Write(vdl), run_time=0.35)
        self.play(Write(props[0]), run_time=0.25)
        self.play(FadeIn(r1d, scale=1.5), Write(r1l), run_time=0.3)
        self.play(FadeIn(r2d, scale=1.5), Write(r2l), run_time=0.3)
        self.play(Write(props[1]), run_time=0.25)
        self.play(FadeIn(yd, scale=1.5), Write(yl), run_time=0.3)
        self.play(Write(props[2]), run_time=0.25)
        self.play(Write(props[3]), Write(props[4]), run_time=0.35)
        self.wait(3)
        self.play(FadeOut(*self.mobjects), run_time=0.5)

    # ────────────────────────────────────────────────────────────
    # 9. SUMMARY
    # ────────────────────────────────────────────────────────────
    def section_summary(self):
        t = Text("Summary", font_size=40, weight=BOLD, color=C_FULL)
        t.to_edge(UP, buff=0.8)
        self.play(Write(t), run_time=0.7)

        items = VGroup(
            VGroup(MathTex("ax^2", font_size=28, color=C_QUAD),
                   Text("-> Shape: wider / narrower, up / down",
                        font_size=21)).arrange(RIGHT, buff=0.4),
            VGroup(MathTex("bx", font_size=28, color=C_LINEAR),
                   Text("-> Shifts vertex horizontally",
                        font_size=21)).arrange(RIGHT, buff=0.4),
            VGroup(MathTex("c", font_size=28, color=C_CONST),
                   Text("-> Y-intercept  (vertical shift)",
                        font_size=21)).arrange(RIGHT, buff=0.4),
            VGroup(Text("Graph is always a ", font_size=21),
                   Text("parabola", font_size=21,
                        color=C_CURVE, weight=BOLD)
                   ).arrange(RIGHT, buff=0.15),
            VGroup(Text("Vertex x-coordinate:  ", font_size=21),
                   MathTex("\\dfrac{-b}{2a}", font_size=26, color=YELLOW)
                   ).arrange(RIGHT, buff=0.15),
        ).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        items.next_to(t, DOWN, buff=0.7)

        for item in items:
            self.play(FadeIn(item, shift=LEFT * 0.3), run_time=0.55)
            self.wait(0.25)

        self.wait(1)

        final = MathTex("f(x) = ax^2 + bx + c", font_size=50, color=C_FULL)
        final.next_to(items, DOWN, buff=0.9)
        self.play(Write(final), run_time=1)
        self.wait(2.5)
        self.play(FadeOut(*self.mobjects), run_time=1)

    # ────────────────────────────────────────────────────────────
    # MAIN
    # ────────────────────────────────────────────────────────────
    def construct(self):
        self.section_title()
        self.section_what_is_quadratic()
        self.section_anatomy()
        self.section_parabola_intro()
        self.section_effect_of_a()
        self.section_effect_of_c()
        self.section_effect_of_b()
        self.section_full_example()
        self.section_summary()