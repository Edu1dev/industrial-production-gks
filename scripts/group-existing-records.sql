-- Migration: Group existing records for C121314 and C506215
-- Torno operation becomes the main card (sequence 1), keeps charged_value
-- Other operations get sequence 2,3,... and charged_value = 0
--
-- Run via API: POST /api/migrate/group-records
-- Or run this SQL directly in the Neon console.

-- ==================== C121314 ====================

-- Step 1: Create group
INSERT INTO production_groups (part_code, part_description, quantity, company_id)
SELECT p.code, p.description, pr.quantity, p.company_id
FROM production_records pr
JOIN parts p ON pr.part_id = p.id
WHERE p.code = 'C121314' AND pr.group_id IS NULL
ORDER BY pr.start_time ASC
LIMIT 1;

-- Step 2: Assign group_id + sequences (Torno=1, rest by start_time)
-- Also: only sequence 1 keeps charged_value, rest set to 0
WITH latest_group AS (
  SELECT id FROM production_groups WHERE part_code = 'C121314' ORDER BY id DESC LIMIT 1
),
sequenced AS (
  SELECT pr.id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN o.name ILIKE '%torno%' THEN 0 ELSE 1 END,
        pr.start_time ASC
    ) as seq
  FROM production_records pr
  JOIN operations o ON pr.operation_id = o.id
  JOIN parts p ON pr.part_id = p.id
  WHERE p.code = 'C121314' AND pr.group_id IS NULL
)
UPDATE production_records
SET group_id = (SELECT id FROM latest_group),
    operation_sequence = sequenced.seq,
    charged_value = CASE WHEN sequenced.seq = 1 THEN production_records.charged_value ELSE 0 END
FROM sequenced
WHERE production_records.id = sequenced.id;


-- ==================== C506215 ====================

-- Step 1: Create group
INSERT INTO production_groups (part_code, part_description, quantity, company_id)
SELECT p.code, p.description, pr.quantity, p.company_id
FROM production_records pr
JOIN parts p ON pr.part_id = p.id
WHERE p.code = 'C506215' AND pr.group_id IS NULL
ORDER BY pr.start_time ASC
LIMIT 1;

-- Step 2: Assign group_id + sequences
WITH latest_group AS (
  SELECT id FROM production_groups WHERE part_code = 'C506215' ORDER BY id DESC LIMIT 1
),
sequenced AS (
  SELECT pr.id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN o.name ILIKE '%torno%' THEN 0 ELSE 1 END,
        pr.start_time ASC
    ) as seq
  FROM production_records pr
  JOIN operations o ON pr.operation_id = o.id
  JOIN parts p ON pr.part_id = p.id
  WHERE p.code = 'C506215' AND pr.group_id IS NULL
)
UPDATE production_records
SET group_id = (SELECT id FROM latest_group),
    operation_sequence = sequenced.seq,
    charged_value = CASE WHEN sequenced.seq = 1 THEN production_records.charged_value ELSE 0 END
FROM sequenced
WHERE production_records.id = sequenced.id;
