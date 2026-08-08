-- Seed some assignments for Student 01 to see on their My Assignments page

INSERT INTO assignments (id, classroom_id, created_by, title, description, points_possible, type, due_date, status)
VALUES 
  ('b0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000002', 'Linear Equations Worksheet', 'Solve the attached worksheet on linear equations.', 20, 'homework', NOW() + INTERVAL '3 days', 'published'),
  ('b0000000-0000-4000-b000-000000000002', 'a0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000002', 'Science Experiment Report', 'Write a report on the photosynthesis experiment.', 50, 'homework', NOW() + INTERVAL '5 days', 'published'),
  ('b0000000-0000-4000-b000-000000000003', 'a0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000002', 'History Essay', 'Write a 500-word essay on the French Revolution.', 30, 'homework', NOW() + INTERVAL '7 days', 'published')
ON CONFLICT (id) DO NOTHING;
