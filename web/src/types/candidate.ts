export interface BoundingBox {
  page?: number;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
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
