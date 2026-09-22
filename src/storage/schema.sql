-- ====================================================================
-- Apna Neta: PostgreSQL Schema for Supabase Free Tier
-- Designed for rapid indexing, JSONB proof storage, and full-text search.
-- ====================================================================

-- 1. Candidates Table (Longitudinal entity anchor)
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    alias TEXT,
    gender TEXT,
    state TEXT NOT NULL,
    constituency TEXT NOT NULL,
    house TEXT NOT NULL, -- Lok Sabha, Rajya Sabha, Vidhan Sabha, Vidhan Parishad
    party TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached summary metrics on candidates for high-performance dashboard rendering
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_movable_assets NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_immovable_assets NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_liabilities NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_net_worth NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS total_five_year_income NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS criminal_cases_count INT DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS serious_criminal_cases_count INT DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS protest_cases_count INT DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS has_arithmetic_discrepancy BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS delta_movable NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS delta_immovable NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS wealth_discrepancy_ratio NUMERIC(10, 2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS has_anomalous_wealth_ratio BOOLEAN DEFAULT FALSE;

-- Profile photo and statutory/creative commons licensing attribution
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_source TEXT; -- 'wikimedia', 'sansad', 'affidavit_form26'
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_attribution TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_license_url TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates (name);
CREATE INDEX IF NOT EXISTS idx_candidates_constituency ON candidates (state, constituency);
CREATE INDEX IF NOT EXISTS idx_candidates_photo ON candidates (photo_url) WHERE photo_url IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_name_house_constituency ON candidates (name, house, constituency);

-- 2. Affidavits Table (Form 26 Filings)
CREATE TABLE IF NOT EXISTS affidavits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    filing_year INT NOT NULL,
    source_url TEXT NOT NULL,
    sha256_hash CHAR(64) NOT NULL UNIQUE,
    r2_storage_key TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affidavits_candidate ON affidavits (candidate_id);
CREATE INDEX IF NOT EXISTS idx_affidavits_hash ON affidavits (sha256_hash);

-- 3. Itemized Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affidavit_id UUID REFERENCES affidavits(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- 'movable' or 'immovable'
    category TEXT NOT NULL,
    description TEXT,
    self_amount NUMERIC(15, 2) DEFAULT 0.00,
    spouse_amount NUMERIC(15, 2) DEFAULT 0.00,
    dependents_amount NUMERIC(15, 2) DEFAULT 0.00,
    proof_bbox JSONB, -- {page: 4, ymin: 120, xmin: 50, ymax: 180, xmax: 400}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_affidavit ON assets (affidavit_id);

-- 4. Criminal Cases Table
CREATE TABLE IF NOT EXISTS criminal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affidavit_id UUID REFERENCES affidavits(id) ON DELETE CASCADE,
    case_type TEXT DEFAULT 'pending', -- 'pending' or 'convicted'
    fir_or_case_number TEXT NOT NULL,
    police_station TEXT,
    court_name TEXT,
    statutory_charges TEXT[],
    charges_framed BOOLEAN DEFAULT FALSE,
    charges_framed_date DATE,
    is_serious_category BOOLEAN DEFAULT FALSE,
    category_justification TEXT,
    proof_bbox JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_affidavit ON criminal_cases (affidavit_id);
CREATE INDEX IF NOT EXISTS idx_cases_serious ON criminal_cases (is_serious_category);

-- 5. Forensic Audit & Discrepancies Table
CREATE TABLE IF NOT EXISTS audit_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affidavit_id UUID REFERENCES affidavits(id) ON DELETE CASCADE UNIQUE,
    part_a_movable_sum NUMERIC(15, 2) NOT NULL,
    part_b_movable_total NUMERIC(15, 2) NOT NULL,
    delta_movable NUMERIC(15, 2) NOT NULL,
    part_a_immovable_sum NUMERIC(15, 2) NOT NULL,
    part_b_immovable_total NUMERIC(15, 2) NOT NULL,
    delta_immovable NUMERIC(15, 2) NOT NULL,
    has_arithmetic_discrepancy BOOLEAN DEFAULT FALSE,
    total_net_worth NUMERIC(15, 2) NOT NULL,
    total_five_year_declared_income NUMERIC(15, 2) NOT NULL,
    wealth_discrepancy_ratio NUMERIC(10, 2),
    has_anomalous_wealth_ratio BOOLEAN DEFAULT FALSE,
    variance_proof_coordinates JSONB,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sansad Activity Table (Continuous Governance)
CREATE TABLE IF NOT EXISTS sansad_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    house TEXT NOT NULL, -- Lok Sabha or Rajya Sabha
    tenure_start DATE,
    tenure_end DATE,
    attendance_rate NUMERIC(5, 2), -- e.g. 85.50%
    questions_count INT DEFAULT 0,
    starred_questions_count INT,
    unstarred_questions_count INT,
    debates_count INT DEFAULT 0,
    private_member_bills INT DEFAULT 0,
    policy_topics JSONB,
    local_vs_national_ratio NUMERIC(5, 2),
    source_url TEXT,
    source_kind TEXT,
    source_retrieved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS starred_questions_count INT;
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS unstarred_questions_count INT;
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS policy_topics JSONB;
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS local_vs_national_ratio NUMERIC(5, 2);
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS source_kind TEXT;
ALTER TABLE sansad_records ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ;
ALTER TABLE sansad_records ALTER COLUMN starred_questions_count DROP DEFAULT;
ALTER TABLE sansad_records ALTER COLUMN unstarred_questions_count DROP DEFAULT;
ALTER TABLE sansad_records ALTER COLUMN policy_topics DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_sansad_candidate ON sansad_records (candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sansad_candidate_house ON sansad_records (candidate_id, house);

-- 6a. Provenance and review ledger. Every external capability must be able to
-- retain a retrievable source, its retrieval time, and the state of review.
CREATE TABLE IF NOT EXISTS source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authority TEXT NOT NULL,
    document_type TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    source_sha256 TEXT,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    r2_storage_key TEXT,
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    parser_version TEXT,
    review_status TEXT NOT NULL DEFAULT 'unreviewed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_documents_authority ON source_documents (authority, document_type);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline TEXT NOT NULL,
    source_document_id UUID REFERENCES source_documents(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    records_seen INT NOT NULL DEFAULT 0,
    records_written INT NOT NULL DEFAULT 0,
    records_rejected INT NOT NULL DEFAULT 0,
    error_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_pipeline ON ingestion_runs (pipeline, started_at DESC);

-- Candidate matches are proposals, never automatic merges. A reviewer must
-- explicitly approve one before it is used for longitudinal analysis.
CREATE TABLE IF NOT EXISTS identity_resolution_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_a_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_b_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    confidence_score NUMERIC(4, 3) NOT NULL,
    rationale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewed_at TIMESTAMPTZ,
    reviewer_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_identity_link_distinct CHECK (candidate_a_id <> candidate_b_id),
    CONSTRAINT uq_identity_link_pair UNIQUE (candidate_a_id, candidate_b_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_status ON identity_resolution_links (status, confidence_score DESC);

-- 6aa. Candidate election-expenditure compliance. These records are distinct
-- from party finance: they track a candidate's statutory Section 77/78 account.
CREATE TABLE IF NOT EXISTS election_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_code TEXT NOT NULL UNIQUE,
    election_name TEXT NOT NULL,
    house TEXT NOT NULL,
    state TEXT,
    result_declared_on DATE NOT NULL,
    source_url TEXT NOT NULL,
    source_document_id UUID REFERENCES source_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_expense_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    expenditure_ceiling NUMERIC(15, 2),
    ceiling_source_url TEXT,
    filing_due_on DATE NOT NULL,
    filed_on DATE,
    declared_expenditure NUMERIC(15, 2),
    filing_status TEXT NOT NULL DEFAULT 'unknown', -- pending, on_time, late, missing, unknown
    ceiling_status TEXT NOT NULL DEFAULT 'unknown', -- within_limit, over_limit, unknown
    source_url TEXT,
    source_document_id UUID REFERENCES source_documents(id) ON DELETE SET NULL,
    scrutiny_status TEXT NOT NULL DEFAULT 'not_available',
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_expense_election UNIQUE (candidate_id, election_id),
    CONSTRAINT ck_expense_nonnegative CHECK (declared_expenditure IS NULL OR declared_expenditure >= 0),
    CONSTRAINT ck_ceiling_nonnegative CHECK (expenditure_ceiling IS NULL OR expenditure_ceiling >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expense_reports_candidate ON candidate_expense_reports (candidate_id, filing_status);
CREATE INDEX IF NOT EXISTS idx_expense_reports_election ON candidate_expense_reports (election_id, filing_status);

-- 6b. Parliamentary Division Voting Records
CREATE TABLE IF NOT EXISTS parliamentary_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_date DATE NOT NULL,
    house TEXT NOT NULL, -- Lok Sabha or Rajya Sabha
    bill_title TEXT NOT NULL,
    division_no INT,
    ayes_count INT DEFAULT 0,
    noes_count INT DEFAULT 0,
    result TEXT, -- 'Passed', 'Negatived'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_divisions_bill ON parliamentary_divisions (bill_title);

CREATE TABLE IF NOT EXISTS candidate_division_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES parliamentary_divisions(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    vote_cast TEXT NOT NULL, -- 'AYE', 'NOE', 'ABSTAIN', 'ABSENT'
    party_whip_aligned BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_candidate_division UNIQUE (division_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_votes_candidate ON candidate_division_votes (candidate_id);

-- 7. MPLADS Development Funds Tracking (MoSPI Data)
CREATE TABLE IF NOT EXISTS mplads_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    constituency TEXT NOT NULL,
    state TEXT NOT NULL,
    term_years TEXT DEFAULT '2019-2024',
    entitled_amount NUMERIC(15, 2) DEFAULT 250000000.00,
    released_amount NUMERIC(15, 2) DEFAULT 0.00,
    expenditure_amount NUMERIC(15, 2) DEFAULT 0.00,
    unspent_balance NUMERIC(15, 2) DEFAULT 0.00,
    utilization_rate NUMERIC(5, 2) DEFAULT 0.00, -- (expenditure / released) * 100
    works_recommended INT DEFAULT 0,
    works_completed INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_mplads_candidate_term UNIQUE (candidate_id, term_years)
);

CREATE INDEX IF NOT EXISTS idx_mplads_candidate ON mplads_records (candidate_id);
CREATE INDEX IF NOT EXISTS idx_mplads_constituency ON mplads_records (state, constituency);

-- 7b. MPLADS Granular Work Sanctions & GIS Geolocation Tracking
CREATE TABLE IF NOT EXISTS mplads_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    work_id TEXT UNIQUE NOT NULL,
    work_title TEXT NOT NULL,
    sector TEXT, -- Drinking Water, Sanitation, Roads, Education, Health, Electricity
    sanctioned_amount NUMERIC(15, 2) DEFAULT 0.00,
    expenditure_amount NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Sanctioned', -- Recommended, Sanctioned, In Progress, Completed, Closed
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    sc_st_category TEXT, -- General, SC (15%), ST (7.5%)
    completion_date DATE,
    gis_verified BOOLEAN, -- Reserved for source-backed field or imagery verification
    constituency_boundary_valid BOOLEAN,
    duplicate_coordinate_flag BOOLEAN,
    ghost_project_risk TEXT, -- heuristic risk; not a finding of a ghost project
    source_url TEXT,
    source_retrieved_at TIMESTAMPTZ,
    gis_audit_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mplads_works_candidate ON mplads_works (candidate_id);
CREATE INDEX IF NOT EXISTS idx_mplads_works_coords ON mplads_works (latitude, longitude);
ALTER TABLE mplads_works ALTER COLUMN gis_verified DROP DEFAULT;
ALTER TABLE mplads_works ALTER COLUMN constituency_boundary_valid DROP DEFAULT;
ALTER TABLE mplads_works ALTER COLUMN duplicate_coordinate_flag DROP DEFAULT;
ALTER TABLE mplads_works ALTER COLUMN ghost_project_risk DROP DEFAULT;
ALTER TABLE mplads_works ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE mplads_works ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ;

-- 8. Multi-Term Historical Wealth Growth (CAGR & Longitudinal Tracking)
CREATE TABLE IF NOT EXISTS historical_wealth_cagr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    from_year INT NOT NULL,
    to_year INT NOT NULL,
    initial_assets NUMERIC(15, 2) NOT NULL,
    final_assets NUMERIC(15, 2) NOT NULL,
    absolute_increase NUMERIC(15, 2) NOT NULL,
    percentage_increase NUMERIC(10, 2) NOT NULL,
    cagr_percent NUMERIC(6, 2),
    is_rapid_accumulation BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cagr_candidate_years UNIQUE (candidate_id, from_year, to_year)
);

CREATE INDEX IF NOT EXISTS idx_cagr_candidate ON historical_wealth_cagr (candidate_id);

-- 9. Corporate Associations Table (MCA21 Registry / DIN / CIN)
CREATE TABLE IF NOT EXISTS corporate_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    din TEXT, -- Director Identification Number (8 digits)
    cin TEXT, -- Corporate Identification Number (21 alphanumeric)
    company_name TEXT NOT NULL,
    designation TEXT DEFAULT 'Director',
    appointment_date DATE,
    cessation_date DATE,
    status TEXT DEFAULT 'Active', -- 'Active', 'Disqualified', 'Resigned'
    paid_up_capital NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cand_company UNIQUE (candidate_id, company_name)
);

CREATE INDEX IF NOT EXISTS idx_corp_candidate ON corporate_associations (candidate_id);
CREATE INDEX IF NOT EXISTS idx_corp_din ON corporate_associations (din);
CREATE INDEX IF NOT EXISTS idx_corp_cin ON corporate_associations (cin);

-- 10. Central Public Procurement Portal (CPPP / eprocure.gov.in) Tenders & Contract Awards
CREATE TABLE IF NOT EXISTS procurement_tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id TEXT NOT NULL UNIQUE,
    tender_title TEXT NOT NULL,
    awarding_authority TEXT NOT NULL,
    contractor_name TEXT,
    contractor_cin_or_pan TEXT,
    contract_amount NUMERIC(15, 2),
    award_date DATE,
    execution_schedule_months INT,
    source_portal TEXT DEFAULT 'eprocure.gov.in',
    source_url TEXT,
    source_retrieved_at TIMESTAMPTZ,
    record_type TEXT NOT NULL DEFAULT 'tender_notice',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenders_contractor ON procurement_tenders (contractor_name);
CREATE INDEX IF NOT EXISTS idx_tenders_award_date ON procurement_tenders (award_date);
ALTER TABLE procurement_tenders ALTER COLUMN contractor_name DROP NOT NULL;
ALTER TABLE procurement_tenders ALTER COLUMN contract_amount DROP NOT NULL;
ALTER TABLE procurement_tenders ALTER COLUMN award_date DROP NOT NULL;
ALTER TABLE procurement_tenders ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE procurement_tenders ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ;
ALTER TABLE procurement_tenders ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'tender_notice';

-- 11. Section 9A RPA Commercial Conflict of Interest Audits
CREATE TABLE IF NOT EXISTS conflict_of_interest_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES procurement_tenders(id) ON DELETE CASCADE,
    corporate_id UUID REFERENCES corporate_associations(id) ON DELETE SET NULL,
    conflict_type TEXT NOT NULL, -- 'Directorship Active Contract', 'Family Member Award', 'Subsisting Works'
    section_9a_flag BOOLEAN, -- Set only after qualified legal determination
    disqualification_risk TEXT DEFAULT 'REVIEW', -- review priority, not a legal conclusion
    determination_status TEXT NOT NULL DEFAULT 'possible_match_requires_legal_review',
    evidence_details JSONB, -- Details of matching corporate entity, awarding agency, and amounts
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_candidate_tender_conflict UNIQUE (candidate_id, tender_id)
);

CREATE INDEX IF NOT EXISTS idx_conflict_candidate ON conflict_of_interest_audits (candidate_id);
CREATE INDEX IF NOT EXISTS idx_conflict_section_9a ON conflict_of_interest_audits (section_9a_flag);
ALTER TABLE conflict_of_interest_audits ALTER COLUMN section_9a_flag DROP DEFAULT;
ALTER TABLE conflict_of_interest_audits ADD COLUMN IF NOT EXISTS determination_status TEXT NOT NULL DEFAULT 'possible_match_requires_legal_review';

-- 12. Political Mobility and Career Defection Dynamics
CREATE TABLE IF NOT EXISTS political_mobility_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    from_party TEXT NOT NULL,
    to_party TEXT NOT NULL,
    transition_year INT NOT NULL,
    transition_date DATE,
    defection_index_score NUMERIC(5, 2) DEFAULT 1.00,
    ruling_coalition_switch BOOLEAN,
    cases_dropped_post_switch INT,
    post_switch_wealth_surge_cagr NUMERIC(6, 2),
    is_opportunistic_switch BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobility_candidate ON political_mobility_records (candidate_id);
ALTER TABLE political_mobility_records ALTER COLUMN ruling_coalition_switch DROP DEFAULT;
ALTER TABLE political_mobility_records ALTER COLUMN cases_dropped_post_switch DROP DEFAULT;
ALTER TABLE political_mobility_records ALTER COLUMN is_opportunistic_switch DROP DEFAULT;

-- 13. Campaign Finance & Corporate Political Contributions (Section 29C RPA & Trusts)
CREATE TABLE IF NOT EXISTS campaign_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    political_party TEXT NOT NULL,
    donor_name TEXT NOT NULL,
    donor_pan_masked TEXT,
    contribution_amount NUMERIC(15, 2) NOT NULL,
    financial_year TEXT NOT NULL,
    donation_mode TEXT, -- 'Cheque', 'Draft', 'Bank Transfer', 'Electoral Trust'
    electoral_trust_name TEXT,
    procurement_contract_awarded BOOLEAN DEFAULT FALSE,
    source_url TEXT,
    source_kind TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_party ON campaign_donations (political_party);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON campaign_donations (donor_name);
ALTER TABLE campaign_donations ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE campaign_donations ADD COLUMN IF NOT EXISTS source_kind TEXT;

-- 14. eCourts Case Verification Enhancements on criminal_cases
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS cnr_number TEXT;
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS ecourts_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS ecourts_stage TEXT; -- 'FIR', 'Cognizance', 'Framed Charges', 'Trial', 'Disposed'
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS ecourts_last_hearing DATE;
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS is_rpa_section_8_disqualified BOOLEAN DEFAULT FALSE;
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS ecourts_source_url TEXT;
ALTER TABLE criminal_cases ADD COLUMN IF NOT EXISTS ecourts_retrieved_at TIMESTAMPTZ;
ALTER TABLE criminal_cases ALTER COLUMN is_rpa_section_8_disqualified DROP DEFAULT;

-- 15. Security: Enable Row Level Security (RLS) & Public Read-Only Policies
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affidavits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansad_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_resolution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mplads_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_wealth_cagr ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_of_interest_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_mobility_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parliamentary_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_division_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mplads_works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON candidates;
CREATE POLICY "Public Read Access" ON candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON affidavits;
CREATE POLICY "Public Read Access" ON affidavits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON assets;
CREATE POLICY "Public Read Access" ON assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON criminal_cases;
CREATE POLICY "Public Read Access" ON criminal_cases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON audit_discrepancies;
CREATE POLICY "Public Read Access" ON audit_discrepancies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON sansad_records;
CREATE POLICY "Public Read Access" ON sansad_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Access" ON source_documents;
CREATE POLICY "Public Read Access" ON source_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Access" ON identity_resolution_links;
CREATE POLICY "Public Read Access" ON identity_resolution_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Access" ON election_events;
CREATE POLICY "Public Read Access" ON election_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Access" ON candidate_expense_reports;
CREATE POLICY "Public Read Access" ON candidate_expense_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON mplads_records;
CREATE POLICY "Public Read Access" ON mplads_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON historical_wealth_cagr;
CREATE POLICY "Public Read Access" ON historical_wealth_cagr FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON corporate_associations;
CREATE POLICY "Public Read Access" ON corporate_associations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON procurement_tenders;
CREATE POLICY "Public Read Access" ON procurement_tenders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON conflict_of_interest_audits;
CREATE POLICY "Public Read Access" ON conflict_of_interest_audits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON political_mobility_records;
CREATE POLICY "Public Read Access" ON political_mobility_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON campaign_donations;
CREATE POLICY "Public Read Access" ON campaign_donations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON parliamentary_divisions;
CREATE POLICY "Public Read Access" ON parliamentary_divisions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON candidate_division_votes;
CREATE POLICY "Public Read Access" ON candidate_division_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access" ON mplads_works;
CREATE POLICY "Public Read Access" ON mplads_works FOR SELECT USING (true);

-- 16. Principle of Least Privilege Grants & Schema Cache Reload (SEC-02 Hardening)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Revoke write/modify permissions from public anonymous role
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Anonymous public clients are strictly limited to read-only queries
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- PRIVACY HARDENING: Revoke full table SELECT on affidavits from anon and authenticated to protect raw_payload
REVOKE SELECT ON affidavits FROM anon, authenticated;

-- Grant column-level SELECT on affidavits excluding raw_payload
GRANT SELECT (id, candidate_id, filing_year, source_url, sha256_hash, r2_storage_key, created_at)
ON affidavits TO anon, authenticated;

-- Create public projection view omitting raw_payload
CREATE OR REPLACE VIEW public_affidavits AS
SELECT
    id,
    candidate_id,
    filing_year,
    source_url,
    sha256_hash,
    r2_storage_key,
    created_at
FROM affidavits;

GRANT SELECT ON public_affidavits TO anon, authenticated;

-- 17. Automatic updated_at Timestamp Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON candidates;
CREATE TRIGGER trg_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mplads_records_updated_at ON mplads_records;
CREATE TRIGGER trg_mplads_records_updated_at
BEFORE UPDATE ON mplads_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_historical_wealth_updated_at ON historical_wealth_cagr;
CREATE TRIGGER trg_historical_wealth_updated_at
BEFORE UPDATE ON historical_wealth_cagr
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_corporate_associations_updated_at ON corporate_associations;
CREATE TRIGGER trg_corporate_associations_updated_at
BEFORE UPDATE ON corporate_associations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_conflict_of_interest_updated_at ON conflict_of_interest_audits;
CREATE TRIGGER trg_conflict_of_interest_updated_at
BEFORE UPDATE ON conflict_of_interest_audits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Service role and admin maintain write and administrative authority
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

NOTIFY pgrst, 'reload schema';
