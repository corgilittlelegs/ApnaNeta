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
  
  // Legislative tracking
  attendance_rate?: number;
  questions_count?: number;
  debates_count?: number;
  
  // MoSPI MPLADS Fund Tracking
  mplads?: MPLADSRecord;

  // Longitudinal Historical Wealth CAGR
  historical_wealth?: HistoricalWealthRecord[];

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
