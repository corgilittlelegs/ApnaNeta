export interface BoundingBox {
  page?: number;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface MPLADSRecord {
  entitled_amount: number;
  released_amount: number;
  expenditure_amount: number;
  unspent_balance: number;
  utilization_rate: number;
  works_recommended: number;
  works_completed: number;
  term_years?: string;
}

export interface HistoricalWealthRecord {
  from_year: number;
  to_year: number;
  initial_assets: number;
  final_assets: number;
  absolute_increase: number;
  percentage_increase: number;
  cagr_percent?: number;
  is_rapid_accumulation: boolean;
}

export interface CorporateAssociation {
  id?: string;
  din?: string;
  cin?: string;
  company_name: string;
  designation?: string;
  appointment_date?: string;
  status?: string;
  paid_up_capital?: number;
}

export interface ConflictOfInterestAudit {
  id?: string;
  tender_id?: string;
  tender_title?: string;
  awarding_authority?: string;
  contractor_name?: string;
  contract_amount?: number;
  award_date?: string;
  conflict_type: string;
  section_9a_flag: boolean;
  disqualification_risk: 'HIGH' | 'MEDIUM' | 'WATCHLIST';
  evidence_details?: {
    candidate_name?: string;
    company_name?: string;
    din?: string;
    cin?: string;
    tender_title?: string;
    awarding_authority?: string;
    contract_amount?: number;
    award_date?: string;
    statutory_reference?: string;
  };
}

export interface PoliticalMobilityRecord {
  id?: string;
  from_party: string;
  to_party: string;
  transition_year: number;
  transition_date?: string;
  defection_index_score?: number;
  ruling_coalition_switch?: boolean;
  cases_dropped_post_switch?: number;
  post_switch_wealth_surge_cagr?: number;
  is_opportunistic_switch?: boolean;
  notes?: string;
}

export interface ECourtsCaseDocket {
  id?: string;
  case_type?: string;
  fir_or_case_number: string;
  police_station?: string;
  court_name?: string;
  statutory_charges?: string[];
  charges_framed?: boolean;
  charges_framed_date?: string;
  is_serious_category?: boolean;
  category_justification?: string;
  cnr_number?: string;
  ecourts_verified?: boolean;
  ecourts_stage?: string;
  is_rpa_section_8_disqualified?: boolean;
}

export interface StatutorySuballocationAudit {
  sc_compliant?: boolean | null;
  st_compliant?: boolean | null;
  sc_percentage?: number | null;
  st_percentage?: number | null;
  sc_spent?: number | null;
  st_spent?: number | null;
  has_statutory_shortfall?: boolean | null;
}

export interface ParliamentaryDivisionVote {
  division_id?: string;
  bill_title: string;
  division_date: string;
  house?: string;
  vote_cast: 'AYE' | 'NOE' | 'ABSTAIN' | 'ABSENT';
  party_whip_aligned?: boolean;
  result?: string;
}

export interface MPLADSWorkItem {
  id?: string;
  work_id: string;
  work_title: string;
  sector?: string;
  sanctioned_amount: number;
  expenditure_amount: number;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  sc_st_category?: string;
  completion_date?: string;
  gis_verified?: boolean;
  constituency_boundary_valid?: boolean;
  duplicate_coordinate_flag?: boolean;
  ghost_project_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  gis_audit_notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  alias?: string;
  constituency: string;
  state: string;
  house: 'Lok Sabha' | 'Rajya Sabha' | 'Vidhan Sabha';
  party?: string;
  filing_year: number;
  
  // Sworn Affidavit Demographics
  age?: number;
  spouse_name?: string;
  spouse_status?: 'not_applicable' | 'declared' | 'none' | string;
  spouse_pan_status?: string;
  spouse_income_status?: string;
  education?: string;
  voter_serial_no?: number | string;
  voter_part_no?: number | string;
  residence_address?: string;
  enrolled_constituency?: string;
  filing_date?: string;
  
  // Financial profile
  total_movable_assets: number;
  total_immovable_assets: number;
  total_liabilities: number;
  total_net_worth: number;
  total_five_year_income: number;
  
  // Criminal proceedings
  criminal_cases_count: number;
  serious_criminal_cases_count: number;
  protest_cases_count: number;
  dockets?: ECourtsCaseDocket[];
  is_rpa_section_8_disqualified?: boolean;
  
  // Legislative tracking & Sansad Intelligence
  attendance_rate?: number;
  questions_count?: number;
  starred_questions_count?: number;
  unstarred_questions_count?: number;
  debates_count?: number;
  private_member_bills?: number;
  policy_topics?: Record<string, number>;
  local_vs_national_ratio?: number;
  division_votes?: ParliamentaryDivisionVote[];
  
  // MoSPI MPLADS Fund Tracking & GIS Audits
  mplads?: MPLADSRecord;
  suballocation_audit?: StatutorySuballocationAudit;
  mplads_works?: MPLADSWorkItem[];
  ghost_project_alerts_count?: number;

  // Longitudinal Historical Wealth CAGR
  historical_wealth?: HistoricalWealthRecord[];

  // Commercial Conflict of Interest & MCA21 ties
  has_section_9a_conflict?: boolean;
  conflicts_of_interest?: ConflictOfInterestAudit[];
  corporate_associations?: CorporateAssociation[];

  // Political Mobility & Defections
  political_mobility?: PoliticalMobilityRecord[];
  defection_count?: number;

  // Forensic Audit Flags
  has_arithmetic_discrepancy: boolean;
  delta_movable: number;
  delta_immovable: number;
  wealth_discrepancy_ratio?: number;
  has_anomalous_wealth_ratio: boolean;
  
  // Document proofs
  pdf_source_url: string;
  r2_storage_key?: string;
  r2_url?: string;
  proof_bbox?: BoundingBox;
  variance_proof_bbox?: BoundingBox;
}

