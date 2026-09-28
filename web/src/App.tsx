import React, { Suspense, lazy, useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { CandidateCard } from './components/CandidateCard';
import { ConstituencyFilter, FilterState } from './components/ConstituencyFilter';
import { Candidate, BoundingBox, MPLADSRecord, HistoricalWealthRecord, ElectionExpenseReport } from './types/candidate';
import { ViewModeProvider, useViewMode } from './context/ViewModeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import {
  Cpu,
  Database,
  SpinnerGap,
  Stack,
  X,
  ArrowRight,
  ShieldCheck,
  Scales,
  Trophy,
  SquaresFour,
  Bank,
  CheckCircle,
} from '@phosphor-icons/react';


const AffidavitProofViewer = lazy(() => import('./components/AffidavitProofViewer').then((module) => ({ default: module.AffidavitProofViewer })));
const ComparisonModal = lazy(() => import('./components/ComparisonModal').then((module) => ({ default: module.ComparisonModal })));
const ReportCardModal = lazy(() => import('./components/ReportCardModal').then((module) => ({ default: module.ReportCardModal })));
const LeaderboardsView = lazy(() => import('./components/LeaderboardsView').then((module) => ({ default: module.LeaderboardsView })));
const CivicFaqDrawer = lazy(() => import('./components/CivicFaqDrawer').then((module) => ({ default: module.CivicFaqDrawer })));

const formatINR = (val: number) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const CANDIDATE_SELECT_QUERY =
  'select=id,name,alias,state,constituency,house,party,photo_url,photo_source,photo_attribution,photo_license_url,total_movable_assets,total_immovable_assets,total_liabilities,total_net_worth,total_five_year_income,criminal_cases_count,serious_criminal_cases_count,protest_cases_count,has_arithmetic_discrepancy,delta_movable,delta_immovable,wealth_discrepancy_ratio,has_anomalous_wealth_ratio,sansad_records(attendance_rate,debates_count,questions_count),affidavits(id,filing_year,source_url,r2_storage_key,sha256_hash,audit_discrepancies(part_b_movable_total,part_b_immovable_total,total_net_worth,total_five_year_declared_income,delta_movable,delta_immovable,has_arithmetic_discrepancy,wealth_discrepancy_ratio,has_anomalous_wealth_ratio,variance_proof_coordinates),criminal_cases(id,case_type,fir_or_case_number,police_station,court_name,statutory_charges,charges_framed,charges_framed_date,is_serious_category,category_justification,cnr_number,ecourts_verified,ecourts_stage,is_rpa_section_8_disqualified)),mplads_records(entitled_amount,released_amount,expenditure_amount,unspent_balance,utilization_rate,works_recommended,works_completed,term_years),historical_wealth_cagr(from_year,to_year,initial_assets,final_assets,absolute_increase,percentage_increase,cagr_percent,is_rapid_accumulation),conflict_of_interest_audits(id,conflict_type,section_9a_flag,disqualification_risk,determination_status,evidence_details),political_mobility_records(id,from_party,to_party,transition_year),corporate_associations(id,company_name,designation,status),candidate_expense_reports(filing_due_on,filed_on,declared_expenditure,expenditure_ceiling,filing_status,ceiling_status,source_url,election_events(election_name,result_declared_on))';

function getPublicApiConfig() {
  const env = import.meta.env;
  const rawUrl = String(env.VITE_SUPABASE_URL || '').trim();
  const key = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url: rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, ''), key };
}

function searchFilter(query: string): string {
  const tokens = query.trim().split(/\s+/).map((token) => token.replace(/[(),]/g, '')).filter(Boolean);
  const clauses = tokens.map((token) => {
    const encoded = encodeURIComponent(token);
    return `or(name.ilike.*${encoded}*,alias.ilike.*${encoded}*,constituency.ilike.*${encoded}*,party.ilike.*${encoded}*)`;
  });
  return clauses.length === 1 ? clauses[0].replace(/^or/, 'or=') : `and=(${clauses.join(',')})`;
}

async function fetchSearchPage(query: string, offset: number, signal?: AbortSignal) {
  const { url, key } = getPublicApiConfig();
  if (!url || !key) throw new Error('Public database is not configured');
  const response = await fetch(
    `${url}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&${searchFilter(query)}&order=name.asc,id.asc&offset=${offset}&limit=100`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }, signal }
  );
  if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
  const rows = await response.json();
  const total = Number(response.headers.get('content-range')?.split('/')[1]);
  return { rows: Array.isArray(rows) ? rows : [], total: Number.isFinite(total) ? total : null };
}

function parseCandidateRow(row: any): Candidate {
  const sansad = Array.isArray(row.sansad_records) && row.sansad_records.length > 0 ? row.sansad_records[0] : null;
  const attendance = sansad?.attendance_rate != null ? Number(sansad.attendance_rate) : undefined;
  const debates = sansad?.debates_count != null ? Number(sansad.debates_count) : undefined;
  const questions = sansad?.questions_count != null ? Number(sansad.questions_count) : undefined;

  const aff = Array.isArray(row.affidavits) && row.affidavits.length > 0
    ? [...row.affidavits].sort((a, b) => Number(b.filing_year || 0) - Number(a.filing_year || 0))[0]
    : null;
  const audit = aff?.audit_discrepancies && Array.isArray(aff.audit_discrepancies) && aff.audit_discrepancies.length > 0
    ? aff.audit_discrepancies[0]
    : (aff?.audit_discrepancies && !Array.isArray(aff.audit_discrepancies) ? aff.audit_discrepancies : null);
  const cases = aff && Array.isArray(aff.criminal_cases) ? aff.criminal_cases : [];

  const totalMovable = Number(audit?.part_b_movable_total ?? row.total_movable_assets ?? 0.0);
  const totalImmovable = Number(audit?.part_b_immovable_total ?? row.total_immovable_assets ?? 0.0);
  const totalLiabilities = Number(row.total_liabilities ?? 0.0);
  const totalNetWorth = Number(audit?.total_net_worth ?? row.total_net_worth ?? 0.0);
  const totalIncome = Number(audit?.total_five_year_declared_income ?? row.total_five_year_income ?? 0.0);
  const deltaMovable = Number(audit?.delta_movable ?? row.delta_movable ?? 0.0);
  const deltaImmovable = Number(audit?.delta_immovable ?? row.delta_immovable ?? 0.0);
  const hasArithDiscrepancy = Boolean(audit?.has_arithmetic_discrepancy ?? row.has_arithmetic_discrepancy ?? false);
  const wdr = audit?.wealth_discrepancy_ratio != null
    ? Number(audit.wealth_discrepancy_ratio)
    : (row.wealth_discrepancy_ratio != null ? Number(row.wealth_discrepancy_ratio) : 1.0);
  const hasAnomalousWdr = Boolean(audit?.has_anomalous_wealth_ratio ?? row.has_anomalous_wealth_ratio ?? false);

  const parsedDockets = cases.map((c: any) => ({
    id: c.id,
    case_type: c.case_type,
    fir_or_case_number: c.fir_or_case_number || c.case_number || 'Case',
    police_station: c.police_station,
    court_name: c.court_name,
    statutory_charges: Array.isArray(c.statutory_charges)
      ? c.statutory_charges
      : Array.isArray(c.ipc_sections)
      ? c.ipc_sections
      : [],
    charges_framed: Boolean(c.charges_framed),
    charges_framed_date: c.charges_framed_date,
    is_serious_category: Boolean(c.is_serious_category ?? c.is_heinous),
    category_justification: c.category_justification,
    cnr_number: c.cnr_number,
    ecourts_verified: Boolean(c.ecourts_verified),
    ecourts_stage: c.ecourts_stage,
    is_rpa_section_8_disqualified: Boolean(c.is_rpa_section_8_disqualified ?? c.rpa_section_8_applicable),
  }));

  const crimCount = parsedDockets.length > 0 ? parsedDockets.length : Number(row.criminal_cases_count ?? 0);
  const seriousCount = parsedDockets.length > 0
    ? parsedDockets.filter((c: any) => c.is_serious_category).length
    : Number(row.serious_criminal_cases_count ?? 0);
  const protestCount = Number(row.protest_cases_count ?? 0);
  const isDisqualified = parsedDockets.some((d: any) => d.is_rpa_section_8_disqualified);

  const conflictList = Array.isArray(row.conflict_of_interest_audits) ? row.conflict_of_interest_audits : [];
  // Entity matches are leads for review. Only a qualified determination may
  // render as a statutory Section 9A conflict in the public profile.
  const hasConflict = conflictList.some((conflict: any) => conflict.section_9a_flag === true);

  const mobilityList = Array.isArray(row.political_mobility_records) ? row.political_mobility_records : [];
  const defectionCount = mobilityList.length;

  const corpList = Array.isArray(row.corporate_associations) ? row.corporate_associations : [];

  const expenseRaw = Array.isArray(row.candidate_expense_reports) && row.candidate_expense_reports.length > 0
    ? [...row.candidate_expense_reports].sort((a, b) => String(b.election_events?.result_declared_on || '').localeCompare(String(a.election_events?.result_declared_on || '')))[0]
    : null;
  const electionExpenseReport: ElectionExpenseReport | undefined = expenseRaw
    ? {
        election_name: expenseRaw.election_events?.election_name,
        result_declared_on: expenseRaw.election_events?.result_declared_on,
        filing_due_on: String(expenseRaw.filing_due_on),
        filed_on: expenseRaw.filed_on || undefined,
        declared_expenditure: expenseRaw.declared_expenditure != null ? Number(expenseRaw.declared_expenditure) : undefined,
        expenditure_ceiling: expenseRaw.expenditure_ceiling != null ? Number(expenseRaw.expenditure_ceiling) : undefined,
        filing_status: expenseRaw.filing_status,
        ceiling_status: expenseRaw.ceiling_status,
        source_url: expenseRaw.source_url || undefined,
      }
    : undefined;

  const pdfSourceUrl = aff?.source_url || row.pdf_source_url || '';
  const r2Key = aff?.r2_storage_key || row.r2_storage_key || '';
  const varianceBbox = Array.isArray(audit?.variance_proof_coordinates)
    ? audit.variance_proof_coordinates[0]
    : undefined;

  // Parse MPLADS Summary Record
  const mpladsRaw = Array.isArray(row.mplads_records) && row.mplads_records.length > 0
    ? [...row.mplads_records].sort((a, b) => String(b.term_years || '').localeCompare(String(a.term_years || '')))[0]
    : null;
  const mpladsRecord: MPLADSRecord | undefined = mpladsRaw
    ? {
        entitled_amount: Number(mpladsRaw.entitled_amount ?? mpladsRaw.allocated_amount ?? 0),
        released_amount: Number(mpladsRaw.released_amount ?? mpladsRaw.sanctioned_amount ?? 0.0),
        expenditure_amount: Number(mpladsRaw.expenditure_amount ?? 0.0),
        unspent_balance: Number(mpladsRaw.unspent_balance ?? 0.0),
        utilization_rate: Number(mpladsRaw.utilization_rate ?? 0.0),
        works_recommended: Number(mpladsRaw.works_recommended ?? mpladsRaw.num_recommended_works ?? 0),
        works_completed: Number(mpladsRaw.works_completed ?? mpladsRaw.num_completed_works ?? 0),
        term_years: mpladsRaw.term_years || undefined,
      }
    : undefined;

  // Parse Historical Wealth CAGR Longitudinal Records
  const cagrRawList = Array.isArray(row.historical_wealth_cagr) ? row.historical_wealth_cagr : [];
  const cagrRecords: HistoricalWealthRecord[] | undefined =
    cagrRawList.length > 0
      ? cagrRawList.map((c: any) => ({
          from_year: Number(c.from_year ?? c.filing_year_start ?? 0),
          to_year: Number(c.to_year ?? c.filing_year_end ?? 0),
          initial_assets: Number(c.initial_assets),
          final_assets: Number(c.final_assets),
          absolute_increase: Number(c.absolute_increase),
          percentage_increase: Number(c.percentage_increase),
          cagr_percent: c.cagr_percent != null ? Number(c.cagr_percent) : undefined,
          is_rapid_accumulation: Boolean(c.is_rapid_accumulation),
        }))
      : undefined;

  const resolvedParty =
    row.party && row.party !== 'Parliamentarian' && row.party !== 'None' && row.party !== 'null' && row.party !== 'Unknown'
      ? row.party
      : undefined;
  const resolvedState =
    row.state && row.state !== 'India' && row.state !== 'National'
      ? row.state
      : 'Unavailable';
  const resolvedConstituency =
    row.constituency && row.constituency !== 'Parliament of India' && row.constituency !== 'National'
      ? row.constituency
      : 'Unavailable';

  const rawHouse = row.house ? String(row.house).trim() : '';
  let resolvedHouse: Candidate['house'] = 'Unknown';
  if (rawHouse === 'Rajya Sabha') {
    resolvedHouse = 'Rajya Sabha';
  } else if (rawHouse.includes('Vidhan')) {
    resolvedHouse = 'Vidhan Sabha';
  } else if (rawHouse === 'Lok Sabha') {
    resolvedHouse = 'Lok Sabha';
  }

  // Parse MoSPI e-SAKSHI Granular Public Works if available
  const worksRawList = Array.isArray(row.mplads_works) ? row.mplads_works : [];
  const worksRecords =
    worksRawList.length > 0
      ? worksRawList.map((w: any) => ({
          work_id: String(w.work_id || w.id),
          work_title: String(w.work_title || 'Community Development Work'),
          sector: w.sector || undefined,
          sanctioned_amount: Number(w.sanctioned_amount ?? 0),
          expenditure_amount: Number(w.expenditure_amount ?? 0),
          status: String(w.status || 'Sanctioned'),
          latitude: w.latitude != null ? Number(w.latitude) : null,
          longitude: w.longitude != null ? Number(w.longitude) : null,
          sc_st_category: w.sc_st_category || undefined,
          completion_date: w.completion_date || undefined,
          gis_verified: Boolean(w.gis_verified),
          constituency_boundary_valid: w.constituency_boundary_valid != null ? Boolean(w.constituency_boundary_valid) : undefined,
          duplicate_coordinate_flag: Boolean(w.duplicate_coordinate_flag),
          ghost_project_risk: w.ghost_project_risk || 'LOW',
          gis_audit_notes: w.gis_audit_notes || undefined,
        }))
      : undefined;

  const rawName = String(row.name || '');
  const cleanName = rawName
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || rawName;

  return {
    id: String(row.id),
    name: cleanName,
    alias: row.alias || undefined,
    constituency: resolvedConstituency,
    state: resolvedState,
    house: resolvedHouse,
    party: resolvedParty,
    filing_year: Number(aff?.filing_year || 0),
    affidavit_status: audit ? 'audited' : aff ? 'source_only' : 'unavailable',
    criminal_record_status: audit || parsedDockets.length > 0 ? 'declared' : 'unavailable',
    total_movable_assets: totalMovable,
    total_immovable_assets: totalImmovable,
    total_liabilities: totalLiabilities,
    total_net_worth: totalNetWorth,
    total_five_year_income: totalIncome,
    criminal_cases_count: crimCount,
    serious_criminal_cases_count: seriousCount,
    protest_cases_count: protestCount,
    dockets: parsedDockets,
    is_rpa_section_8_disqualified: isDisqualified,
    attendance_rate: attendance,
    debates_count: debates,
    questions_count: questions,
    election_expense_report: electionExpenseReport,
    mplads: mpladsRecord,
    mplads_works: worksRecords,
    historical_wealth: cagrRecords,
    has_section_9a_conflict: hasConflict,
    conflicts_of_interest: conflictList,
    corporate_associations: corpList,
    political_mobility: mobilityList,
    defection_count: defectionCount,
    has_arithmetic_discrepancy: hasArithDiscrepancy,
    delta_movable: deltaMovable,
    delta_immovable: deltaImmovable,
    wealth_discrepancy_ratio: wdr,
    has_anomalous_wealth_ratio: hasAnomalousWdr,
    pdf_source_url: pdfSourceUrl,
    r2_storage_key: r2Key,
    affidavit_sha256: aff?.sha256_hash || undefined,
    variance_proof_bbox: varianceBbox,
    proof_bbox: varianceBbox,
    photo_url: row.photo_url || undefined,
    photo_source: row.photo_source || undefined,
    photo_attribution: row.photo_attribution || undefined,
    photo_license_url: row.photo_license_url || undefined,
  };
}

function getCandidateIdentityKey(cand: { id?: string; name: string; state?: string; constituency?: string; house: string }): string {
  if (cand.id) return cand.id;
  return `${cand.name.toLowerCase().trim()}::${(cand.state || '').toLowerCase().trim()}::${(cand.constituency || '').toLowerCase().trim()}::${cand.house.toLowerCase().trim()}`;
}

function mergeCandidatesIntoMap(map: Map<string, Candidate>, newCandidates: Candidate[]) {
  for (const cand of newCandidates) {
    const key = getCandidateIdentityKey(cand);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, cand);
    } else {
      const merged: Candidate = {
        ...existing,
        constituency:
          existing.constituency !== 'Unavailable' && existing.constituency !== 'Parliament of India' && existing.constituency !== 'National'
            ? existing.constituency
            : cand.constituency,
        state:
          existing.state !== 'Unavailable' && existing.state !== 'India' && existing.state !== 'National'
            ? existing.state
            : cand.state,
        party:
          existing.party && existing.party !== 'Independent' && existing.party !== 'Parliamentarian'
            ? existing.party
            : cand.party,
        attendance_rate: existing.attendance_rate ?? cand.attendance_rate,
        debates_count: existing.debates_count ?? cand.debates_count,
        questions_count: existing.questions_count ?? cand.questions_count,
        mplads: existing.mplads ?? cand.mplads,
        mplads_works: existing.mplads_works ?? cand.mplads_works,
        historical_wealth: existing.historical_wealth ?? cand.historical_wealth,
        photo_url: existing.photo_url ?? cand.photo_url,
        photo_source: existing.photo_source ?? cand.photo_source,
        photo_attribution: existing.photo_attribution ?? cand.photo_attribution,
        photo_license_url: existing.photo_license_url ?? cand.photo_license_url,
        total_net_worth: existing.total_net_worth > 0 ? existing.total_net_worth : cand.total_net_worth,
        total_movable_assets: existing.total_movable_assets > 0 ? existing.total_movable_assets : cand.total_movable_assets,
        total_immovable_assets: existing.total_immovable_assets > 0 ? existing.total_immovable_assets : cand.total_immovable_assets,
        criminal_cases_count: Math.max(existing.criminal_cases_count, cand.criminal_cases_count),
        dockets: existing.dockets && existing.dockets.length > 0 ? existing.dockets : cand.dockets,
      };
      map.set(key, merged);
    }
  }
}

const AppContent: React.FC = () => {
  const { isCitizenMode } = useViewMode();
  const { t, isHindi } = useLanguage();
  const [isCivicGuideOpen, setIsCivicGuideOpen] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState<number>(0);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<boolean>(false);
  const searchGeneration = useRef(0);
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [searchOffset, setSearchOffset] = useState<number>(0);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('ALL');
  const [activeView, setActiveView] = useState<'directory' | 'leaderboards' | 'verification'>('directory');
  const [selectedForComparison, setSelectedForComparison] = useState<Candidate[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [sharingCandidate, setSharingCandidate] = useState<Candidate | null>(null);

  const totalAssetsSum = useMemo(() => {
    return candidates.filter((candidate) => candidate.affidavit_status === 'audited').reduce((acc, candidate) => acc + candidate.total_net_worth, 0);
  }, [candidates]);
  const auditedProfileCount = candidates.filter((candidate) => candidate.affidavit_status === 'audited').length;
  const caseDisclosureCount = candidates.filter((candidate) => candidate.criminal_record_status === 'declared').length;

  const totalCriminalCasesSum = useMemo(() => {
    return candidates.filter((candidate) => candidate.criminal_record_status === 'declared').reduce((acc, candidate) => acc + candidate.criminal_cases_count, 0);
  }, [candidates]);

  const averageMpladsRate = useMemo(() => {
    const withMplads = candidates.filter((c) => c.mplads?.utilization_rate != null);
    if (withMplads.length === 0) return null;
    return Math.round(
      withMplads.reduce((acc, c) => acc + (c.mplads?.utilization_rate || 0), 0) / withMplads.length
    );
  }, [candidates]);

  const handleToggleComparison = (cand: Candidate) => {
    setSelectedForComparison((prev) => {
      const exists = prev.some((c) => c.id === cand.id);
      if (exists) {
        return prev.filter((c) => c.id !== cand.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), cand];
      }
      return [...prev, cand];
    });
  };

  const handleRemoveFromComparison = (id: string) => {
    setSelectedForComparison((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearComparison = () => {
    setSelectedForComparison([]);
  };

  const handleOpenShareCard = (cand: Candidate) => {
    setSharingCandidate(cand);
  };

  const handleCloseShareCard = () => {
    setSharingCandidate(null);
  };

  // Interactive filters state
  const [filterState, setFilterState] = useState<FilterState>({
    state: 'ALL',
    constituency: 'ALL',
    party: 'ALL',
    forensicFlag: 'ALL',
    wealthTier: 'ALL',
  });

  // Initial fetch: first 1,000 candidates + total record count
  useEffect(() => {
    const metaEnv = (import.meta as any).env || {};
    const rawUrl = String(metaEnv.VITE_SUPABASE_URL || '').trim();
    const rawKey = String(metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!rawUrl || !rawKey) {
      return;
    }

    const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

    const fetchLiveCandidates = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${cleanUrl}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&order=name.asc,id.asc&limit=100`,
          {
            headers: {
              apikey: rawKey,
              Authorization: `Bearer ${rawKey}`,
              Prefer: 'count=exact',
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Supabase query failed with status: ${res.status}`);
        }

        const contentRange = res.headers.get('content-range');
        if (contentRange && contentRange.includes('/')) {
          const totalCount = parseInt(contentRange.split('/')[1], 10);
          if (!isNaN(totalCount) && totalCount > 0) {
            setTotalDatabaseCount(totalCount);
          }
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          const dbCandidates: Candidate[] = data.map(parseCandidateRow);
          const candidateMap = new Map<string, Candidate>();
          mergeCandidatesIntoMap(candidateMap, dbCandidates);

          const uniqueDbCandidates = Array.from(candidateMap.values());
          setCandidates(uniqueDbCandidates);
          setDirectoryOffset(data.length);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.error('Failed to load live Supabase candidates:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCandidates();
  }, []);

  // On-demand server pagination state
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [directoryOffset, setDirectoryOffset] = useState<number>(0);

  const loadMoreCandidates = async () => {
    if (isLoadingMore || directoryOffset >= totalDatabaseCount) return;
    const metaEnv = (import.meta as any).env || {};
    const rawUrl = String(metaEnv.VITE_SUPABASE_URL || '').trim();
    const rawKey = String(metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!rawUrl || !rawKey) return;

    const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const BATCH_SIZE = 100;
    setIsLoadingMore(true);

    try {
      const res = await fetch(
        `${cleanUrl}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&order=name.asc,id.asc&offset=${directoryOffset}&limit=${BATCH_SIZE}`,
        {
          headers: {
            apikey: rawKey,
            Authorization: `Bearer ${rawKey}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const parsedBatch = data.map(parseCandidateRow);
          setCandidates((prev) => {
            const map = new Map<string, Candidate>();
            for (const c of prev) {
              map.set(getCandidateIdentityKey(c), c);
            }
            mergeCandidatesIntoMap(map, parsedBatch);
            return Array.from(map.values());
          });
          setDirectoryOffset((prev) => prev + data.length);
          setDisplayLimit((prev) => prev + BATCH_SIZE);
        } else if (Array.isArray(data) && data.length === 0) {
          setDirectoryOffset(totalDatabaseCount);
        }
      }
    } catch (err) {
      console.warn('Error loading more candidates:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Debounced Remote Search across the full database
  useEffect(() => {
    const generation = ++searchGeneration.current;
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setIsSearching(false);
      setSearchError(false);
      setSearchResults([]);
      setSearchTotal(null);
      setSearchOffset(0);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(false);
    setSearchResults([]);
    setSearchTotal(null);
    setSearchOffset(0);
    setDisplayLimit(50);
    const timer = setTimeout(async () => {
      try {
        const { rows, total } = await fetchSearchPage(q, 0, controller.signal);
        if (searchGeneration.current === generation) {
          setSearchResults(rows.map(parseCandidateRow));
          setSearchTotal(total);
          setSearchOffset(rows.length);
        }
      } catch (err) {
        if (!controller.signal.aborted && searchGeneration.current === generation) {
          console.error('Remote candidate search error:', err);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted && searchGeneration.current === generation) setIsSearching(false);
      }
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  const loadMoreSearchResults = async () => {
    if (isSearching || (searchTotal !== null && searchOffset >= searchTotal)) return;
    const generation = searchGeneration.current;
    setIsSearching(true);
    try {
      const { rows, total } = await fetchSearchPage(searchQuery.trim(), searchOffset);
      if (searchGeneration.current !== generation) return;
      setSearchResults((previous) => [...previous, ...rows.map(parseCandidateRow)]);
      setSearchOffset((previous) => previous + rows.length);
      setSearchTotal(total ?? (rows.length < 100 ? searchOffset + rows.length : null));
      setDisplayLimit((previous) => previous + 100);
    } catch (err) {
      if (searchGeneration.current === generation) {
        console.error('Could not load more search results:', err);
        setSearchError(true);
      }
    } finally {
      if (searchGeneration.current === generation) setIsSearching(false);
    }
  };

  // Proof Viewer Modal State
  const [proofModal, setProofModal] = useState<{
    isOpen: boolean;
    candidateName: string;
    fieldLabel: string;
    value: string;
    pdfUrl: string;
    bbox?: BoundingBox;
    candidate?: Candidate;
  }>({
    isOpen: false,
    candidateName: '',
    fieldLabel: '',
    value: '',
    pdfUrl: '',
  });

  const handleOpenProof = (
    candidateName: string,
    fieldLabel: string,
    value: string,
    pdfUrl: string,
    candidate?: Candidate
  ) => {
    setProofModal({
      isOpen: true,
      candidateName,
      fieldLabel,
      value,
      pdfUrl,
      bbox: candidate?.proof_bbox,
      candidate,
    });
  };

  const handleViewChange = (view: 'directory' | 'leaderboards' | 'verification') => {
    if (view === 'verification') {
      const target = proofModal.candidate || candidates[0];
      if (target) {
        handleOpenProof(
          target.name,
          'Sworn Identity & Declaration',
          target.name,
          target.pdf_source_url,
          target
        );
      }
      return;
    }
    setActiveView(view);
  };

  const isRemoteSearch = searchQuery.trim().length >= 2;
  const candidatePool = isRemoteSearch ? searchResults : candidates;
  const searchHasMore = searchTotal !== null
    ? searchOffset < searchTotal
    : searchOffset > 0 && searchOffset % 100 === 0;

  // Derive unique options from records currently available in this view.
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    candidatePool.forEach((c) => {
      if (c.state && c.state !== 'Unavailable' && c.state !== 'India' && c.state !== 'National') states.add(c.state);
    });
    return Array.from(states).sort();
  }, [candidatePool]);

  const availableConstituencies = useMemo(() => {
    const constits = new Set<string>();
    candidatePool.forEach((c) => {
      if (filterState.state === 'ALL' || c.state === filterState.state) {
        if (c.constituency && c.constituency !== 'Unavailable' && c.constituency !== 'National') constits.add(c.constituency);
      }
    });
    return Array.from(constits).sort();
  }, [candidatePool, filterState.state]);

  const availableParties = useMemo(() => {
    const parties = new Set<string>();
    candidatePool.forEach((c) => {
      if (c.party) parties.add(c.party);
    });
    return Array.from(parties).sort();
  }, [candidatePool]);

  // Comprehensive multi-factor candidate filter
  const filteredCandidates = useMemo(() => {
    return candidatePool.filter((c) => {
      // 1. Text Search Query (supports tokenized multi-word search & aliases)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean);
        const searchable = `${c.name} ${c.alias || ''} ${c.constituency} ${c.state} ${c.party || ''}`.toLowerCase();
        const matchesQuery = tokens.every((token) => searchable.includes(token));
        if (!matchesQuery) return false;
      }

      // 2. House Filter
      if (selectedHouse !== 'ALL' && c.house !== selectedHouse) {
        return false;
      }

      // 3. State Filter
      if (filterState.state !== 'ALL' && c.state !== filterState.state) {
        return false;
      }

      // 4. Constituency Filter
      if (filterState.constituency !== 'ALL' && c.constituency !== filterState.constituency) {
        return false;
      }

      // 5. Political Party Filter
      if (filterState.party !== 'ALL' && c.party !== filterState.party) {
        return false;
      }

      // 6. Forensic Audit Flag Filter
      if (filterState.forensicFlag === 'DISCREPANCY') {
        if (!c.has_arithmetic_discrepancy) return false;
      } else if (filterState.forensicFlag === 'HIGH_WDR') {
        if (!c.has_anomalous_wealth_ratio && (!c.wealth_discrepancy_ratio || c.wealth_discrepancy_ratio < 10)) {
          return false;
        }
      } else if (filterState.forensicFlag === 'CRIMINAL') {
        if (c.criminal_cases_count <= 0) return false;
      } else if (filterState.forensicFlag === 'LOW_MPLADS') {
        if (!c.mplads || c.mplads.utilization_rate >= 60) return false;
      } else if (filterState.forensicFlag === 'RAPID_WEALTH') {
        const hasSurge = c.historical_wealth?.some((h) => h.is_rapid_accumulation);
        if (!hasSurge) return false;
      }

      // 7. Wealth Tier Filter
      if (filterState.wealthTier === '100CR_PLUS') {
        if (c.total_net_worth < 1000000000) return false;
      } else if (filterState.wealthTier === '10CR_TO_100CR') {
        if (c.total_net_worth < 100000000 || c.total_net_worth >= 1000000000) return false;
      } else if (filterState.wealthTier === '1CR_TO_10CR') {
        if (c.total_net_worth < 10000000 || c.total_net_worth >= 100000000) return false;
      } else if (filterState.wealthTier === 'UNDER_1CR') {
        if (c.total_net_worth >= 10000000) return false;
      }

      return true;
    });
  }, [candidatePool, searchQuery, selectedHouse, filterState]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-sovereign-950 font-sans pb-20 md:pb-0">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearching={isSearching}
        selectedHouse={selectedHouse}
        onHouseChange={setSelectedHouse}
        activeView={activeView}
        onViewChange={handleViewChange}
        onOpenCivicGuide={() => setIsCivicGuideOpen(true)}
      />

      {/* Sovereign Sansad Pavilion Masthead / Telemetry Overview (Mockup 1) */}
      <section className="bg-[#FCFAF6] border-b border-dholpur-300/80 py-8 shadow-2xs relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase bg-harit-50 text-harit-900 border border-harit-200/90 px-2.5 py-0.5 rounded-md">
                  <ShieldCheck size={14} weight="duotone" className="text-harit-600" />
                  {isCitizenMode ? t.overviewBadgeCitizen : t.overviewBadgeForensic}
                </span>
                <span className="text-xs text-sovereign-500 font-sans hidden sm:inline">
                  • {isCitizenMode ? t.overviewGazetteCitizen : t.overviewGazetteForensic}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-sovereign-950 tracking-tight leading-tight">
                {isCitizenMode ? (
                  <>
                    <span>{t.overviewTitleCitizen}</span>
                    <span className="block text-base sm:text-lg text-kesariya-800 font-semibold mt-1">
                      {t.overviewSubtitleCitizen}
                    </span>
                  </>
                ) : (
                  t.overviewTitleForensic
                )}
              </h1>
              <p className="text-sovereign-700 text-xs sm:text-sm mt-1.5 max-w-2xl font-sans leading-relaxed">
                {isCitizenMode ? t.overviewDescCitizen : t.overviewDescForensic}
              </p>
            </div>
          </div>

          {/* Quick Telemetry Cards Matching Mockup 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6">
            
            {/* 1. Total MPs Tracked */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] text-sovereign-600 font-semibold block truncate">
                  {t.telemetryTotalMps}
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-sovereign-950 mt-1">
                  {(totalDatabaseCount || candidates.length).toLocaleString()}
                </p>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-[9.5px] text-harit-700 font-medium">
                  {isLiveConnected ? t.telemetryLiveSupabase : t.telemetryVerifiedOpenRecords}
                </span>
                {/* Mini bar chart SVG */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1.5 bg-ashoka-400 rounded-t h-2" />
                  <div className="w-1.5 bg-ashoka-600 rounded-t h-3" />
                  <div className="w-1.5 bg-ashoka-800 rounded-t h-4" />
                </div>
              </div>
            </div>

            {/* 2. Declared Assets Total */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] text-sovereign-600 font-semibold block truncate">
                  {t.telemetryAssetsTotal}
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-sovereign-950 mt-1">
                  {auditedProfileCount > 0 ? formatINR(totalAssetsSum) : 'N/A'}
                </p>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-[9.5px] text-sovereign-500">{auditedProfileCount} audited loaded profiles</span>
                {/* Mini bar chart in gold */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1.5 bg-kesariya-300 rounded-t h-1.5" />
                  <div className="w-1.5 bg-kesariya-500 rounded-t h-2.5" />
                  <div className="w-1.5 bg-kesariya-700 rounded-t h-4" />
                </div>
              </div>
            </div>

            {/* 3. Pending Criminal Cases */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] text-sovereign-600 font-semibold block truncate">
                  {t.telemetryCriminalCases}
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-terracotta-700 mt-1">
                  {caseDisclosureCount > 0 ? totalCriminalCasesSum : 'N/A'}
                </p>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-[9.5px] text-terracotta-700 font-medium">{caseDisclosureCount} reviewed loaded profiles</span>
                {/* Mini red bar chart */}
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1.5 bg-terracotta-300 rounded-t h-2" />
                  <div className="w-1.5 bg-terracotta-500 rounded-t h-3.5" />
                  <div className="w-1.5 bg-terracotta-700 rounded-t h-4" />
                </div>
              </div>
            </div>

            {/* 4. MPLADS Fund Utilization Rate */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] text-sovereign-600 font-semibold block truncate">
                  {t.telemetryMpladsRate}
                </span>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-sovereign-950 mt-1">
                  {averageMpladsRate != null ? `${averageMpladsRate}%` : 'N/A'}
                </p>
              </div>
              <div className="mt-3">
                <div className="w-full bg-dholpur-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-harit-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, averageMpladsRate || 0)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Candidate Feed / Leaderboards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'leaderboards' ? (
          <Suspense fallback={<p className="p-8 text-center">Loading rankings…</p>}><LeaderboardsView
            candidates={candidates}
            totalDatabaseCount={totalDatabaseCount}
            onVerifyProof={handleOpenProof}
            onOpenShareCard={handleOpenShareCard}
            selectedForComparison={selectedForComparison}
            onToggleComparison={handleToggleComparison}
          /></Suspense>
        ) : (
          <>
            {/* Interactive Constituency & Forensic Filter Dock */}
            <ConstituencyFilter
              filters={filterState}
              onFilterChange={setFilterState}
              availableStates={availableStates}
              availableConstituencies={availableConstituencies}
              availableParties={availableParties}
              totalMatches={filteredCandidates.length}
            />
            <p className="-mt-4 mb-6 text-xs text-sovereign-600" role="status">
              {isRemoteSearch
                ? isSearching && searchOffset === 0 ? 'Searching the database…' : searchError ? 'Database search failed. Please retry.' : `Search returned ${searchTotal ?? 'at least ' + searchOffset} database matches; filters currently cover ${searchResults.length} loaded results.`
                : `Filters currently cover ${candidates.length} loaded profiles${totalDatabaseCount ? ` of ${totalDatabaseCount} in the database` : ''}.`}
            </p>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-sovereign-950 tracking-tight">
                  {t.profilesHeading(filteredCandidates.length)}
                </h2>
                {(isLoading || isSearching) && (
                  <span className="flex items-center gap-1.5 text-xs text-ashoka-700 bg-ashoka-50 px-2.5 py-1 rounded-lg border border-ashoka-200">
                    <SpinnerGap size={14} weight="bold" className="animate-spin text-ashoka-700" />
                    {isSearching ? t.searchingDatabase : t.connecting}
                  </span>
                )}
              </div>
              <span className="text-xs text-sovereign-500 hidden sm:inline">{t.inspectHint}</span>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dholpur-300 shadow-xs">
                {isSearching ? (
                  <p className="text-sovereign-600 text-sm font-medium">Searching the database…</p>
                ) : searchError ? (
                  <p className="text-sovereign-600 text-sm font-medium">Database search failed. Please retry.</p>
                ) : !isLiveConnected && !isLoading ? (
                  <div className="space-y-2 max-w-md mx-auto">
                    <p className="text-sovereign-800 text-sm font-bold">{t.dbNotConnectedTitle}</p>
                    <p className="text-sovereign-500 text-xs leading-relaxed">
                      {t.dbNotConnectedDesc}
                    </p>
                  </div>
                ) : (
                  <p className="text-sovereign-600 text-sm font-medium">{t.noParliamentariansFound}</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCandidates.slice(0, displayLimit).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onVerifyProof={handleOpenProof}
                      isSelectedForComparison={selectedForComparison.some((c) => c.id === candidate.id)}
                      onToggleComparison={handleToggleComparison}
                      onOpenShareCard={handleOpenShareCard}
                    />
                  ))}
                </div>

                {(filteredCandidates.length > displayLimit || (isRemoteSearch ? searchHasMore : directoryOffset < totalDatabaseCount)) && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => {
                        if (filteredCandidates.length > displayLimit) {
                          setDisplayLimit((prev) => prev + 50);
                        } else {
                          if (isRemoteSearch) loadMoreSearchResults();
                          else loadMoreCandidates();
                        }
                      }}
                      disabled={isLoadingMore || isSearching}
                      className="px-8 py-3.5 bg-white hover:bg-dholpur-50 border border-dholpur-300 hover:border-dholpur-400 text-sovereign-800 text-sm font-semibold rounded-2xl shadow-xs hover:shadow transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isLoadingMore || isSearching ? (
                        <span className="flex items-center gap-2 justify-center">
                          <SpinnerGap size={16} className="animate-spin text-ashoka-600" />
                          {t.loadingMore}
                        </span>
                      ) : filteredCandidates.length > displayLimit ? (
                        t.loadMoreRemaining(filteredCandidates.length - displayLimit)
                      ) : (
                        isRemoteSearch ? `Load more database matches (${searchOffset}${searchTotal === null ? '+' : ` of ${searchTotal}`})` : t.loadMoreTotal(candidates.length, totalDatabaseCount)
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Comparison Drawer */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-[4.75rem] md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0A192F] text-white rounded-2xl shadow-2xl px-3 sm:px-5 py-2.5 sm:py-3 border border-kesariya-500/40 flex items-center justify-between gap-2 sm:gap-4 animate-in slide-in-from-bottom-6 w-[calc(100%-1.25rem)] max-w-xl">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Stack size={18} weight="duotone" className="text-kesariya-400 flex-shrink-0" />
            <span className="text-xs font-semibold hidden md:inline">{t.compareDrawerLabel}</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[130px] sm:max-w-xs md:max-w-md">
              {selectedForComparison.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1 bg-sovereign-800 text-xs px-2 py-1 rounded-lg border border-sovereign-700 whitespace-nowrap flex-shrink-0"
                >
                  <span className="truncate max-w-[70px] sm:max-w-[90px] font-medium text-[11px] sm:text-xs">
                    {c.name.split(' ')[0]}
                  </span>
                  <button
                    onClick={() => handleRemoveFromComparison(c.id)}
                    className="text-dholpur-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Remove"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setIsComparisonOpen(true)}
              className="px-3 py-1.5 bg-kesariya-600 hover:bg-kesariya-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span className="hidden sm:inline">{t.compareSideBySide}</span>
              <span className="sm:hidden">{t.compareBtn}</span>
              <span>({selectedForComparison.length})</span>
              <ArrowRight size={13} weight="bold" />
            </button>
            <button
              onClick={handleClearComparison}
              className="text-dholpur-400 hover:text-dholpur-200 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
            >
              {t.compareClear}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A192F]/95 backdrop-blur-md border-t border-sovereign-800 flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom,0px)] text-white shadow-lg">
        <button
          onClick={() => setActiveView('directory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            activeView === 'directory' ? 'text-kesariya-400 font-bold' : 'text-dholpur-400 hover:text-dholpur-200'
          }`}
        >
          <SquaresFour size={20} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">{t.mobileTabDirectory}</span>
        </button>

        <button
          onClick={() => setActiveView('leaderboards')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            activeView === 'leaderboards' ? 'text-kesariya-400 font-bold' : 'text-dholpur-400 hover:text-dholpur-200'
          }`}
        >
          <Trophy size={20} weight={activeView === 'leaderboards' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">{t.mobileTabLeaderboards}</span>
        </button>

        <button
          onClick={() => {
            if (selectedForComparison.length > 0) {
              setIsComparisonOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] text-dholpur-400 hover:text-dholpur-200 relative"
        >
          <Scales size={20} weight="duotone" />
          <span className="text-[10px] mt-0.5 font-sans">{t.compareBtn}</span>
          {selectedForComparison.length > 0 && (
            <span className="absolute top-1 right-1/4 sm:right-6 w-4 h-4 bg-kesariya-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
              {selectedForComparison.length}
            </span>
          )}
        </button>
      </nav>

      {/* Comparison Modal */}
      <Suspense fallback={null}><ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        candidates={selectedForComparison}
        onRemoveCandidate={handleRemoveFromComparison}
        onVerifyProof={handleOpenProof}
        onOpenShareCard={handleOpenShareCard}
      /></Suspense>

      {/* Social Report Card Graphic Modal */}
      <Suspense fallback={null}><ReportCardModal
        isOpen={!!sharingCandidate}
        onClose={() => setSharingCandidate(null)}
        candidate={sharingCandidate}
      /></Suspense>

      {/* Affidavit Proof Viewer Modal */}
      <Suspense fallback={null}><AffidavitProofViewer
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal((prev) => ({ ...prev, isOpen: false }))}
        candidateName={proofModal.candidateName}
        pdfUrl={proofModal.pdfUrl}
        fieldLabel={proofModal.fieldLabel}
        claimedValue={proofModal.value}
        bbox={proofModal.bbox}
        candidate={proofModal.candidate}
      /></Suspense>

      {/* Civic Guide FAQ Drawer */}
      <Suspense fallback={null}><CivicFaqDrawer
        isOpen={isCivicGuideOpen}
        onClose={() => setIsCivicGuideOpen(false)}
      /></Suspense>

      {/* Footer */}
      <footer className="bg-[#FCFAF6] border-t border-dholpur-300/80 py-6 text-center text-xs text-sovereign-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-medium text-sovereign-800">
            {isHindi
              ? 'अपना नेता — भारत का संप्रभु नागरिक प्रौद्योगिकी बहीखाता'
              : 'Apna Neta — The Sovereign Civic Technology Ledger of Bharat'}
          </p>
          <p className="text-[11px] text-sovereign-500">
            {isHindi
              ? 'रिकॉर्ड की उपलब्धता और जांच की स्थिति हर प्रोफ़ाइल में दी गई है। मूल स्रोत को देखें।'
              : 'Source availability and audit status are shown per profile. Inspect the original record before relying on a figure.'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <LanguageProvider>
    <ViewModeProvider>
      <AppContent />
    </ViewModeProvider>
  </LanguageProvider>
);

export default App;
