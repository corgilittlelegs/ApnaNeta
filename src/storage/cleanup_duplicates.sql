-- ====================================================================
-- Apna Neta: PostgreSQL Deduplication and Uniqueness Migration
-- Safely merges duplicate candidates, updates child references, and
-- enforces strict UNIQUE constraints to prevent future duplicates.
-- Run this in the Supabase SQL Editor.
-- ====================================================================

BEGIN;

-- 1. Create a temporary mapping table of duplicate candidates to their primary candidate ID
-- Primary candidate is chosen as the one with the earliest created_at (or lowest UUID)
CREATE TEMP TABLE candidate_dedup_mapping AS
WITH ranked_candidates AS (
    SELECT 
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY LOWER(TRIM(name)), house
            ORDER BY created_at ASC, id ASC
        ) AS primary_id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)), house
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM candidates
)
SELECT id AS duplicate_id, primary_id
FROM ranked_candidates
WHERE id <> primary_id;

-- 2. Deduplicate sansad_records before updating candidate_id (to avoid child collisions)
DELETE FROM sansad_records a
USING sansad_records b
WHERE a.id > b.id
  AND a.candidate_id = b.candidate_id
  AND a.house = b.house;

-- Deduplicate sansad_records that would collide when candidate_id is re-pointed
DELETE FROM sansad_records s
WHERE s.candidate_id IN (SELECT duplicate_id FROM candidate_dedup_mapping)
  AND EXISTS (
      SELECT 1 FROM sansad_records existing
      JOIN candidate_dedup_mapping m ON m.primary_id = existing.candidate_id
      WHERE m.duplicate_id = s.candidate_id AND existing.house = s.house
  );

-- 3. Re-point child table foreign keys to primary candidate IDs
UPDATE affidavits a
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE a.candidate_id = m.duplicate_id;

UPDATE sansad_records s
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE s.candidate_id = m.duplicate_id;

UPDATE mplads_records r
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE r.candidate_id = m.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM mplads_records existing 
      WHERE existing.candidate_id = m.primary_id AND existing.term_years = r.term_years
  );

-- Delete any orphaned mplads records that couldn't be merged due to duplicate term_years
DELETE FROM mplads_records r
USING candidate_dedup_mapping m
WHERE r.candidate_id = m.duplicate_id;

UPDATE mplads_works w
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE w.candidate_id = m.duplicate_id;

UPDATE historical_wealth_cagr h
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE h.candidate_id = m.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM historical_wealth_cagr existing
      WHERE existing.candidate_id = m.primary_id 
        AND existing.from_year = h.from_year 
        AND existing.to_year = h.to_year
  );

DELETE FROM historical_wealth_cagr h
USING candidate_dedup_mapping m
WHERE h.candidate_id = m.duplicate_id;

UPDATE corporate_associations c
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE c.candidate_id = m.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM corporate_associations existing
      WHERE existing.candidate_id = m.primary_id AND existing.company_name = c.company_name
  );

DELETE FROM corporate_associations c
USING candidate_dedup_mapping m
WHERE c.candidate_id = m.duplicate_id;

UPDATE conflict_of_interest_audits co
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE co.candidate_id = m.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM conflict_of_interest_audits existing
      WHERE existing.candidate_id = m.primary_id AND existing.tender_id = co.tender_id
  );

DELETE FROM conflict_of_interest_audits co
USING candidate_dedup_mapping m
WHERE co.candidate_id = m.duplicate_id;

UPDATE candidate_division_votes v
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE v.candidate_id = m.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM candidate_division_votes existing
      WHERE existing.candidate_id = m.primary_id AND existing.division_id = v.division_id
  );

DELETE FROM candidate_division_votes v
USING candidate_dedup_mapping m
WHERE v.candidate_id = m.duplicate_id;

UPDATE political_mobility_records p
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE p.candidate_id = m.duplicate_id;

-- 4. Delete the redundant duplicate candidates
DELETE FROM candidates c
USING candidate_dedup_mapping m
WHERE c.id = m.duplicate_id;

-- 5. Clean up temporary table
DROP TABLE candidate_dedup_mapping;

-- 6. Enforce strict uniqueness constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_name_house_constituency 
ON candidates (name, house, constituency);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sansad_candidate_house 
ON sansad_records (candidate_id, house);

COMMIT;

NOTIFY pgrst, 'reload schema';
