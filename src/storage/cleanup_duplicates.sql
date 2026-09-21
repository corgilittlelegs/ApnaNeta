-- ====================================================================
-- Apna Neta: PostgreSQL Deduplication and Uniqueness Migration
-- Safely merges duplicate candidates, ranks and collapses child
-- records (sansad_records, mplads, cagr, etc.) to prevent collisions,
-- and enforces strict UNIQUE constraints.
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
        ) AS primary_id
    FROM candidates
)
SELECT id AS duplicate_id, primary_id
FROM ranked_candidates
WHERE id <> primary_id;

-- 2. Deduplicate sansad_records across both primary and duplicate candidates
-- Keeps the single richest record (highest attendance / latest update) per (target_candidate, house)
WITH ranked_sansad AS (
    SELECT 
        s.id,
        COALESCE(m.primary_id, s.candidate_id) AS target_candidate_id,
        s.house,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, s.candidate_id), s.house
            ORDER BY s.updated_at DESC NULLS LAST, s.attendance_rate DESC NULLS LAST, s.id ASC
        ) AS rn
    FROM sansad_records s
    LEFT JOIN candidate_dedup_mapping m ON s.candidate_id = m.duplicate_id
)
DELETE FROM sansad_records
WHERE id IN (
    SELECT id FROM ranked_sansad WHERE rn > 1
);

-- Re-point surviving sansad_records to primary candidates
UPDATE sansad_records s
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE s.candidate_id = m.duplicate_id;

-- 3. Deduplicate and re-point mplads_records (unique on candidate_id, term_years)
WITH ranked_mplads AS (
    SELECT 
        r.id,
        COALESCE(m.primary_id, r.candidate_id) AS target_candidate_id,
        r.term_years,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, r.candidate_id), r.term_years
            ORDER BY r.expenditure_amount DESC NULLS LAST, r.id ASC
        ) AS rn
    FROM mplads_records r
    LEFT JOIN candidate_dedup_mapping m ON r.candidate_id = m.duplicate_id
)
DELETE FROM mplads_records
WHERE id IN (
    SELECT id FROM ranked_mplads WHERE rn > 1
);

UPDATE mplads_records r
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE r.candidate_id = m.duplicate_id;

-- 4. Deduplicate and re-point historical_wealth_cagr (unique on candidate_id, from_year, to_year)
WITH ranked_cagr AS (
    SELECT 
        h.id,
        COALESCE(m.primary_id, h.candidate_id) AS target_candidate_id,
        h.from_year,
        h.to_year,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, h.candidate_id), h.from_year, h.to_year
            ORDER BY h.updated_at DESC NULLS LAST, h.id ASC
        ) AS rn
    FROM historical_wealth_cagr h
    LEFT JOIN candidate_dedup_mapping m ON h.candidate_id = m.duplicate_id
)
DELETE FROM historical_wealth_cagr
WHERE id IN (
    SELECT id FROM ranked_cagr WHERE rn > 1
);

UPDATE historical_wealth_cagr h
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE h.candidate_id = m.duplicate_id;

-- 5. Deduplicate and re-point corporate_associations (unique on candidate_id, company_name)
WITH ranked_corp AS (
    SELECT 
        c.id,
        COALESCE(m.primary_id, c.candidate_id) AS target_candidate_id,
        c.company_name,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, c.candidate_id), c.company_name
            ORDER BY c.updated_at DESC NULLS LAST, c.id ASC
        ) AS rn
    FROM corporate_associations c
    LEFT JOIN candidate_dedup_mapping m ON c.candidate_id = m.duplicate_id
)
DELETE FROM corporate_associations
WHERE id IN (
    SELECT id FROM ranked_corp WHERE rn > 1
);

UPDATE corporate_associations c
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE c.candidate_id = m.duplicate_id;

-- 6. Deduplicate and re-point conflict_of_interest_audits (unique on candidate_id, tender_id)
WITH ranked_conflicts AS (
    SELECT 
        co.id,
        COALESCE(m.primary_id, co.candidate_id) AS target_candidate_id,
        co.tender_id,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, co.candidate_id), co.tender_id
            ORDER BY co.verified_at DESC NULLS LAST, co.id ASC
        ) AS rn
    FROM conflict_of_interest_audits co
    LEFT JOIN candidate_dedup_mapping m ON co.candidate_id = m.duplicate_id
)
DELETE FROM conflict_of_interest_audits
WHERE id IN (
    SELECT id FROM ranked_conflicts WHERE rn > 1
);

UPDATE conflict_of_interest_audits co
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE co.candidate_id = m.duplicate_id;

-- 7. Deduplicate and re-point candidate_division_votes (unique on division_id, candidate_id)
WITH ranked_votes AS (
    SELECT 
        v.id,
        COALESCE(m.primary_id, v.candidate_id) AS target_candidate_id,
        v.division_id,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(m.primary_id, v.candidate_id), v.division_id
            ORDER BY v.created_at DESC NULLS LAST, v.id ASC
        ) AS rn
    FROM candidate_division_votes v
    LEFT JOIN candidate_dedup_mapping m ON v.candidate_id = m.duplicate_id
)
DELETE FROM candidate_division_votes
WHERE id IN (
    SELECT id FROM ranked_votes WHERE rn > 1
);

UPDATE candidate_division_votes v
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE v.candidate_id = m.duplicate_id;

-- 8. Re-point child tables without unique constraints
UPDATE affidavits a
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE a.candidate_id = m.duplicate_id;

UPDATE political_mobility_records p
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE p.candidate_id = m.duplicate_id;

UPDATE mplads_works w
SET candidate_id = m.primary_id
FROM candidate_dedup_mapping m
WHERE w.candidate_id = m.duplicate_id;

-- 9. Delete the redundant duplicate candidates
DELETE FROM candidates c
USING candidate_dedup_mapping m
WHERE c.id = m.duplicate_id;

-- 10. Clean up temporary table
DROP TABLE candidate_dedup_mapping;

-- 11. Final safety sweep: purge any lingering duplicate sansad_records by (candidate_id, house)
DELETE FROM sansad_records a
USING sansad_records b
WHERE a.id > b.id
  AND a.candidate_id = b.candidate_id
  AND a.house = b.house;

-- Final safety sweep: purge any lingering duplicate candidates by (name, house, constituency)
DELETE FROM candidates a
USING candidates b
WHERE a.id > b.id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
  AND a.house = b.house
  AND LOWER(TRIM(a.constituency)) = LOWER(TRIM(b.constituency));

-- 12. Enforce strict uniqueness constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_name_house_constituency 
ON candidates (name, house, constituency);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sansad_candidate_house 
ON sansad_records (candidate_id, house);

COMMIT;

NOTIFY pgrst, 'reload schema';
