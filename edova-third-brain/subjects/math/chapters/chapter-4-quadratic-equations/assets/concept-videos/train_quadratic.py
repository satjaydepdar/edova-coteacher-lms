from manim import *

# Color scheme for consistency
DIST_COLOR = BLUE
SPEED_COLOR = GREEN
TIME_COLOR = ORANGE
EQ_COLOR = YELLOW
HIGHLIGHT_COLOR = RED

class TrainQuadraticRevision(Scene):
    def construct(self):
        # 1. Intro Scene
        self.intro_scene()
        
        # 2. Problem Statement Scene
        self.problem_scene()
        
        # 3. Variables Setup Scene
        self.variables_scene()
        
        # 4. Quadratic Formation Scene
        self.derivation_scene()
        
        # 5. Solving the Quadratic Scene
        self.solution_scene()
        
        # 6. Recap Scene
        self.recap_scene()

    def create_train(self):
        """Creates a simple train icon using VGroup"""
        body = Rectangle(width=1.6, height=0.7, color=SPEED_COLOR, fill_opacity=0.9)
        cabin = Rectangle(width=0.5, height=0.5, color=SPEED_COLOR, fill_opacity=0.9).next_to(body, RIGHT, buff=0).shift(UP*0.1)
        chimney = Rectangle(width=0.15, height=0.3, color=GREY, fill_opacity=0.8).next_to(body, LEFT, buff=-0.3).shift(UP*0.5)
        
        wheel1 = Circle(radius=0.12, color=BLACK, fill_opacity=1).move_to(body.get_bottom() + DOWN*0.12 + LEFT*0.4)
        wheel2 = Circle(radius=0.12, color=BLACK, fill_opacity=1).move_to(body.get_bottom() + DOWN*0.12 + RIGHT*0.4)
        
        train = VGroup(body, cabin, chimney, wheel1, wheel2)
        return train

    def intro_scene(self):
        title = Text("Train Speed Word Problem", font_size=42, weight=BOLD)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP).scale(0.8))

        # Draw Track
        track = Line(LEFT * 5, RIGHT * 5, color=GREY, stroke_width=3)
        track_label = Text("Fixed Distance", font_size=24, color=DIST_COLOR).next_to(track, DOWN, buff=0.4)
        self.play(Create(track))
        
        # Animate Train
        train = self.create_train()
        train.move_to(LEFT * 5.5 + UP * 0.5)
        self.play(FadeIn(train))
        
        # Distance arrow
        dist_arrow = DoubleArrow(LEFT * 4.5, RIGHT * 4.5, color=DIST_COLOR, buff=0.2, stroke_width=2)
        self.play(GrowArrow(dist_arrow), Write(track_label))
        
        # Move train
        self.play(train.animate.shift(RIGHT * 8.5), run_time=3, rate_func=smooth)
        self.wait(0.5)

        # Formula - FIXED: Use plain LaTeX and Manim's set_color_by_tex
        formula = MathTex(
            r"D = S \times T",
            font_size=40,
            substrings_to_isolate=["D", "S", "T"]
        ).to_edge(DOWN, buff=1.2)
        
        # Apply colors the Manim way
        formula.set_color_by_tex("D", DIST_COLOR)
        formula.set_color_by_tex("S", SPEED_COLOR)
        formula.set_color_by_tex("T", TIME_COLOR)
        
        self.play(Write(formula))
        self.wait(2)
        
        # Clear for next scene
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def problem_scene(self):
        title = Text("The Problem", font_size=36, color=EQ_COLOR, weight=BOLD).to_edge(UP)
        self.play(Write(title))
        
        # FIXED: Use Tex with substrings_to_isolate instead of raw hex LaTeX
        problem = Tex(
            "A train travels a fixed distance of ",
            "280 km", 
            ".",
            font_size=30,
            substrings_to_isolate=["280 km"]
        ).next_to(title, DOWN, buff=0.8).shift(UP*0.5)
        problem.set_color_by_tex("280 km", DIST_COLOR)
        
        condition = Tex(
            "If its speed is increased by ",
            "5 km/h", 
            ",",
            font_size=30,
            substrings_to_isolate=["5 km/h"]
        ).next_to(problem, DOWN, buff=0.5, aligned_edge=LEFT)
        condition.set_color_by_tex("5 km/h", SPEED_COLOR)
        
        result = Tex(
            "it takes ",
            "1 hour less", 
            " to cover the same distance.",
            font_size=30,
            substrings_to_isolate=["1 hour less"]
        ).next_to(condition, DOWN, buff=0.5, aligned_edge=LEFT)
        result.set_color_by_tex("1 hour less", TIME_COLOR)
        
        question = Text("Find the original speed of the train.", font_size=30, slant=ITALIC).next_to(result, DOWN, buff=0.8)
        
        # Group for alignment
        problem_group = VGroup(problem, condition, result, question)
        problem_group.move_to(ORIGIN)
        
        self.play(Write(problem))
        self.wait(0.5)
        self.play(Write(condition))
        self.wait(0.5)
        self.play(Write(result))
        self.wait(0.5)
        self.play(Write(question))
        self.wait(2)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def variables_scene(self):
        title = Text("Setting Up Variables", font_size=36, color=EQ_COLOR, weight=BOLD).to_edge(UP)
        self.play(Write(title))
        
        # Original Speed
        s1_title = Text("Let original speed be", font_size=28, color=GREY).shift(UP*1.5 + LEFT*2)
        s1_math = MathTex(r"v \text{ km/h}", font_size=36, color=SPEED_COLOR).next_to(s1_title, RIGHT)
        self.play(Write(s1_title), Write(s1_math))
        
        # Original Time
        s2_title = Text("Original time taken", font_size=28, color=GREY).shift(UP*0.3 + LEFT*2)
        s2_math = MathTex(r"T_1 = \frac{280}{v} \text{ hours}", font_size=36, color=TIME_COLOR).next_to(s2_title, RIGHT)
        self.play(Write(s2_title), Write(s2_math))
        
        # New Speed
        s3_title = Text("New speed (+5 km/h)", font_size=28, color=GREY).shift(DOWN*0.9 + LEFT*2)
        s3_math = MathTex(r"v + 5 \text{ km/h}", font_size=36, color=SPEED_COLOR).next_to(s3_title, RIGHT)
        self.play(Write(s3_title), Write(s3_math))
        
        # New Time
        s4_title = Text("New time taken", font_size=28, color=GREY).shift(DOWN*2.1 + LEFT*2)
        s4_math = MathTex(r"T_2 = \frac{280}{v+5} \text{ hours}", font_size=36, color=TIME_COLOR).next_to(s4_title, RIGHT)
        self.play(Write(s4_title), Write(s4_math))
        
        self.wait(3)
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def derivation_scene(self):
        title = Text("Forming the Quadratic Equation", font_size=36, color=EQ_COLOR, weight=BOLD).to_edge(UP)
        self.play(Write(title))
        
        # Position for equations
        eq_pos = UP * 0.5
        
        # Step 1: Condition
        eq1 = MathTex(r"T_1 - T_2 = 1", font_size=40).move_to(eq_pos)
        step1_label = Text("Condition", font_size=24, color=GREY).next_to(eq1, LEFT, buff=1)
        self.play(Write(step1_label), Write(eq1))
        self.wait(1)
        
        # Step 2: Substitute
        eq2 = MathTex(
            r"\frac{280}{v} - \frac{280}{v+5} = 1", 
            font_size=40
        ).move_to(eq_pos)
        self.play(TransformMatchingTex(eq1, eq2), FadeOut(step1_label))
        self.wait(1)
        
        # Step 3: Cross multiply / Multiply by v(v+5)
        eq3 = MathTex(
            r"280(v+5) - 280v = v(v+5)", 
            font_size=38
        ).move_to(eq_pos)
        self.play(TransformMatchingTex(eq2, eq3))
        self.wait(1)
        
        # Step 4: Expand
        eq4 = MathTex(
            r"280v + 1400 - 280v = v^2 + 5v", 
            font_size=38
        ).move_to(eq_pos)
        self.play(TransformMatchingTex(eq3, eq4))
        self.wait(1)
        
        # Step 5: Simplify LHS
        eq5 = MathTex(
            r"1400 = v^2 + 5v", 
            font_size=40
        ).move_to(eq_pos)
        self.play(TransformMatchingTex(eq4, eq5))
        self.wait(1)
        
        # Step 6: Standard form (Highlight Yellow) - FIXED: Removed raw LaTeX colors
        eq6 = MathTex(
            r"v^2 + 5v - 1400 = 0", 
            font_size=42
        ).move_to(eq_pos)
        eq6.set_color(EQ_COLOR) # Apply yellow color the Manim way
        
        # Add a background box for emphasis
        bg_box = SurroundingRectangle(eq6, color=EQ_COLOR, fill_opacity=0.2, buff=0.3)
        
        self.play(TransformMatchingTex(eq5, eq6), Create(bg_box))
        self.wait(3)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def solution_scene(self):
        title = Text("Solving the Quadratic", font_size=36, color=EQ_COLOR, weight=BOLD).to_edge(UP)
        self.play(Write(title))
        
        eq_pos = UP * 0.8
        
        # Show equation
        eq_start = MathTex(r"v^2 + 5v - 1400 = 0", font_size=40).move_to(eq_pos)
        self.play(Write(eq_start))
        self.wait(1)
        
        # Factoring explanation
        fact_text = Text("Find two numbers: product = -1400, sum = 5", font_size=26, color=GREY).next_to(eq_start, DOWN, buff=0.8)
        self.play(Write(fact_text))
        self.wait(1)
        
        # Factored form
        eq_factored = MathTex(r"(v + 40)(v - 35) = 0", font_size=40).move_to(eq_pos)
        self.play(TransformMatchingTex(eq_start, eq_factored))
        self.wait(1)
        
        # Solutions - FIXED: Removed raw LaTeX hex colors
        eq_sol = MathTex(
            r"v = -40 \quad \text{or} \quad v = 35"
        ).move_to(eq_pos)
        eq_sol.set_color_by_tex("-40", HIGHLIGHT_COLOR)
        eq_sol.set_color_by_tex("35", SPEED_COLOR)
        
        self.play(TransformMatchingTex(eq_factored, eq_sol))
        self.wait(1)
        
        # Reject -40
        reject_text = Text("Speed cannot be negative! Reject v = -40", font_size=28, color=HIGHLIGHT_COLOR, weight=BOLD).next_to(eq_sol, DOWN, buff=1.2)
        self.play(Write(reject_text))
        self.wait(1)
        
        # Final Answer Box - FIXED
        final_answer = Tex(r"Original Speed = 35 km/h", font_size=42)
        final_answer.set_color_by_tex("35 km/h", SPEED_COLOR)
        
        final_box = SurroundingRectangle(final_answer, color=SPEED_COLOR, fill_opacity=0.2, buff=0.3)
        
        # Verification text
        verify_text = Text("Verify: 280/35 - 280/40 = 8 - 7 = 1 hour", font_size=24, color=GREY).next_to(final_answer, DOWN, buff=0.6)
        
        final_group = VGroup(final_answer, final_box, verify_text).shift(DOWN*1.2)
        
        self.play(Write(final_answer), Create(final_box))
        self.play(Write(verify_text))
        self.wait(4)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def recap_scene(self):
        title = Text("Method Recap", font_size=36, color=EQ_COLOR, weight=BOLD).to_edge(UP)
        self.play(Write(title))
        
        recaps = [
            "1. Identify the unknown and define a variable (v).",
            "2. Express all quantities using that variable.",
            "3. Use the given condition to write an equation.",
            "4. Simplify to standard quadratic form and solve.",
        ]
        
        recap_mobs = VGroup()
        for i, text in enumerate(recaps):
            t = Text(text, font_size=30).shift(UP*(1.2 - i*0.8))
            recap_mobs.add(t)
            
        for t in recap_mobs:
            self.play(Write(t), run_time=0.8)
            self.wait(0.3)
            
        self.wait(0.5)
        
        # Final takeaway
        takeaway = Text(
            "Translate words into equations, simplify, and solve the quadratic.",
            font_size=28, 
            color=EQ_COLOR, 
            slant=ITALIC,
            weight=BOLD
        ).shift(DOWN*2.5)
        
        take_box = SurroundingRectangle(takeaway, color=EQ_COLOR, buff=0.4, stroke_width=2)
        
        self.play(Write(takeaway), Create(take_box))
        self.wait(4)