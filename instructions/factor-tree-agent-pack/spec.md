# Factor Tree Simulation Spec

Source Image: factor_tree.png (original exhibition model)
Visual Style: dark board, yellow sticky for x, pink squares for 2783 and 253, orange stars for 5, 11, z

Solved Values (Ground Truth - DO NOT CHANGE):
- x = 5 * 2783 = 13915
- 2783 = y * 253 => y = 2783 / 253 = 11
- 253 = 11 * z => z = 23

Tree Structure:
- Level 1: x (unknown, yellow)
- Level 2: 5 (prime, orange star) and 2783 (composite, pink)
- Level 3: y (unknown, should be 11) and 253 (composite, pink)
- Level 4: 11 (prime, orange star) and z (unknown, should be 23)

Rules: Parent = Left Child * Right Child
Use division to find child, multiplication to find parent.
