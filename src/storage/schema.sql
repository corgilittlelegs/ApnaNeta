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

CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates (name);
CREATE INDEX IF NOT EXISTS idx_candidates_constituency ON candidates (state, constituency);

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
    debates_count INT DEFAULT 0,
    private_member_bills INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sansad_candidate ON sansad_records (candidate_id);

-- 7. Security: Enable Row Level Security (RLS) & Public Read-Only Policies
-- Anyone on the web can view/query the data, but only the backend service_role key can insert/modify.
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affidavits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansad_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access" ON candidates FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON affidavits FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON assets FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON criminal_cases FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON audit_discrepancies FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON sansad_records FOR SELECT USING (true);

-- 8. Grants & Schema Cache Reload
-- Grants access to Supabase client roles and notifies PostgREST to reload its schema cache
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

