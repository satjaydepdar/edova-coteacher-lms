-- Seed some assignments for Student 01 to see on their My Assignments page

INSERT INTO assignments (id, classroom_id, title, description, points_possible, submission_type, due_date, status, topic_label)
VALUES 
  ('b0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-a000-000000000003', 'Linear Equations Worksheet', 'Solve the attached worksheet on linear equations.', 20, 'written', NOW() + INTERVAL '3 days', 'active', 'Mathematics'),
  ('b0000000-0000-4000-b000-000000000002', 'a0000000-0000-4000-a000-000000000003', 'Science Experiment Report', 'Write a report on the photosynthesis experiment.', 50, 'written', NOW() + INTERVAL '5 days', 'active', 'Science'),
  ('b0000000-0000-4000-b000-000000000003', 'a0000000-0000-4000-a000-000000000003', 'History Essay', 'Write a 500-word essay on the French Revolution.', 30, 'written', NOW() + INTERVAL '7 days', 'active', 'Social Science')
ON CONFLICT (id) DO NOTHING;
