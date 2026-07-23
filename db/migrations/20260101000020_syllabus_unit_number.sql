-- Up Migration

-- Settings > Master Data > Add Unit gained a "Unit Number" field (mirrors
-- syllabus_chapters.number) so a unit can be numbered independently of its
-- display-order s_no and without folding a roman numeral into the name.
ALTER TABLE syllabus_units ADD COLUMN number INT;

-- Down Migration

ALTER TABLE syllabus_units DROP COLUMN number;
