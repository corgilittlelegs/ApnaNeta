import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CandidateCard } from './components/CandidateCard';
import { AffidavitProofViewer } from './components/AffidavitProofViewer';
import { ConstituencyFilter, FilterState } from './components/ConstituencyFilter';
import { ComparisonModal } from './components/ComparisonModal';
import { ReportCardModal } from './components/ReportCardModal';
import { LeaderboardsView } from './components/LeaderboardsView';
import { Candidate, BoundingBox, MPLADSRecord, HistoricalWealthRecord } from './types/candidate';
import { ViewModeProvider, useViewMode } from './context/ViewModeContext';
import { CivicFaqDrawer } from './components/CivicFaqDrawer';
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

import { PROMINENT_PARTY_MAP } from './data/politicianLookup';
import { CIVIC_IMPACT_BENCHMARKS } from './utils/civicConstants';

const CANDIDATE_SELECT_QUERY =
  'select=*,sansad_records(attendance_rate,debates_count,questions_count),affidavits(id,filing_year,source_url,r2_storage_key,audit_discrepancies(*),criminal_cases(*)),mplads_records(*),historical_wealth_cagr(*),conflict_of_interest_audits(*),political_mobility_records(*),corporate_associations(*)';

function parseCandidateRow(row: any): Candidate {
  const sansad = Array.isArray(row.sansad_records) && row.sansad_records.length > 0 ? row.sansad_records[0] : null;
  const attendance = sansad?.attendance_rate != null ? Number(sansad.attendance_rate) : undefined;
  const debates = sansad?.debates_count != null ? Number(sansad.debates_count) : undefined;
  const questions = sansad?.questions_count != null ? Number(sansad.questions_count) : undefined;

  const aff = Array.isArray(row.affidavits) && row.affidavits.length > 0 ? row.affidavits[0] : null;
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

  const pdfSourceUrl = aff?.source_url || row.pdf_source_url || '';
  const r2Key = aff?.r2_storage_key || row.r2_storage_key || '';

  // Parse MPLADS Summary Record
  const mpladsRaw = Array.isArray(row.mplads_records) && row.mplads_records.length > 0 ? row.mplads_records[0] : null;
  const mpladsRecord: MPLADSRecord | undefined = mpladsRaw
    ? {
        entitled_amount: Number(mpladsRaw.entitled_amount ?? mpladsRaw.allocated_amount ?? CIVIC_IMPACT_BENCHMARKS.DEFAULT_5YR_MPLADS_ENTITLEMENT),
        released_amount: Number(mpladsRaw.released_amount ?? mpladsRaw.sanctioned_amount ?? 0.0),
        expenditure_amount: Number(mpladsRaw.expenditure_amount ?? 0.0),
        unspent_balance: Number(mpladsRaw.unspent_balance ?? 0.0),
        utilization_rate: Number(mpladsRaw.utilization_rate ?? 0.0),
        works_recommended: Number(mpladsRaw.works_recommended ?? mpladsRaw.num_recommended_works ?? 0),
        works_completed: Number(mpladsRaw.works_completed ?? mpladsRaw.num_completed_works ?? 0),
        term_years: mpladsRaw.term_years || '2019-2024',
      }
    : undefined;

  // Parse Historical Wealth CAGR Longitudinal Records
  const cagrRawList = Array.isArray(row.historical_wealth_cagr) ? row.historical_wealth_cagr : [];
  const cagrRecords: HistoricalWealthRecord[] | undefined =
    cagrRawList.length > 0
      ? cagrRawList.map((c: any) => ({
          from_year: Number(c.from_year ?? c.filing_year_start ?? 2019),
          to_year: Number(c.to_year ?? c.filing_year_end ?? 2024),
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
      : 'Independent';
  const resolvedState =
    row.state && row.state !== 'India' && row.state !== 'National'
      ? row.state
      : (row.state || 'India');
  const resolvedConstituency =
    row.constituency && row.constituency !== 'Parliament of India' && row.constituency !== 'National'
      ? row.constituency
      : (row.constituency || 'National');

  const rawHouse = row.house ? String(row.house).trim() : '';
  let resolvedHouse: 'Lok Sabha' | 'Rajya Sabha' | 'Vidhan Sabha' = 'Lok Sabha';
  if (rawHouse === 'Rajya Sabha') {
    resolvedHouse = 'Rajya Sabha';
  } else if (rawHouse.includes('Vidhan')) {
    resolvedHouse = 'Vidhan Sabha';
  } else {
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

  return {
    id: String(row.id),
    name: row.name,
    alias: row.alias || undefined,
    constituency: resolvedConstituency,
    state: resolvedState,
    house: resolvedHouse,
    party: resolvedParty,
    filing_year: aff?.filing_year || 2024,
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
          existing.constituency !== 'Parliament of India' && existing.constituency !== 'National'
            ? existing.constituency
            : cand.constituency,
        state:
          existing.state !== 'India' && existing.state !== 'National'
            ? existing.state
            : cand.state,
        party:
          existing.party !== 'Independent' && existing.party !== 'Parliamentarian'
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
  const [isCivicGuideOpen, setIsCivicGuideOpen] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState<number>(0);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('ALL');
  const [activeView, setActiveView] = useState<'directory' | 'leaderboards'>('directory');
  const [selectedForComparison, setSelectedForComparison] = useState<Candidate[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [sharingCandidate, setSharingCandidate] = useState<Candidate | null>(null);

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
          `${cleanUrl}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&order=name.asc&limit=100`,
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
        if (Array.isArray(data) && data.length > 0) {
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
        `${cleanUrl}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&order=name.asc&offset=${directoryOffset}&limit=${BATCH_SIZE}`,
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
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setIsSearching(false);
      return;
    }

    const metaEnv = (import.meta as any).env || {};
    const rawUrl = String(metaEnv.VITE_SUPABASE_URL || '').trim();
    const rawKey = String(metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!rawUrl || !rawKey) return;

    const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const tokens = q
          .split(/\s+/)
          .map((t) => t.trim().replace(/[(),]/g, ''))
          .filter(Boolean);

        if (tokens.length === 0) {
          setIsSearching(false);
          return;
        }

        let filterParam = '';
        if (tokens.length === 1) {
          const enc = encodeURIComponent(tokens[0]);
          filterParam = `or=(name.ilike.*${enc}*,alias.ilike.*${enc}*,constituency.ilike.*${enc}*,party.ilike.*${enc}*)`;
        } else {
          const tokenClauses = tokens.map((t) => {
            const enc = encodeURIComponent(t);
            return `or(name.ilike.*${enc}*,alias.ilike.*${enc}*,constituency.ilike.*${enc}*,party.ilike.*${enc}*)`;
          });
          filterParam = `and=(${tokenClauses.join(',')})`;
        }

        const searchUrl = `${cleanUrl}/rest/v1/candidates?${CANDIDATE_SELECT_QUERY}&${filterParam}&limit=100`;

        const res = await fetch(searchUrl, {
          headers: {
            apikey: rawKey,
            Authorization: `Bearer ${rawKey}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const newCands = data.map(parseCandidateRow);
            setCandidates((prev) => {
              const map = new Map<string, Candidate>();
              for (const c of prev) {
                map.set(getCandidateIdentityKey(c), c);
              }
              mergeCandidatesIntoMap(map, newCands);
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.error('Remote candidate search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleOpenProof = async (
    candidateName: string,
    fieldLabel: string,
    value: string,
    pdfUrl: string,
    candidate?: Candidate
  ) => {
    let activeCand = candidate;
    if (candidate?.id && candidate.mplads_works === undefined) {
      try {
        const metaEnv = (import.meta as any).env || {};
        const rawUrl = String(metaEnv.VITE_SUPABASE_URL || '').trim();
        const rawKey = String(metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();
        if (rawUrl && rawKey) {
          const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
          const res = await fetch(
            `${cleanUrl}/rest/v1/candidates?id=eq.${candidate.id}&select=*,mplads_works(*)`,
            {
              headers: {
                apikey: rawKey,
                Authorization: `Bearer ${rawKey}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].mplads_works)) {
              const fullWorks = data[0].mplads_works.map((w: any) => ({
                work_id: String(w.work_id || w.id),
                work_title: String(w.work_title || 'Community Development Work'),
                sector: w.sector || undefined,
                cost_inr: Number(w.cost_inr || w.sanctioned_amount || 0),
                status: w.status || 'Completed',
                latitude: w.latitude != null ? Number(w.latitude) : undefined,
                longitude: w.longitude != null ? Number(w.longitude) : undefined,
                contractor_name: w.contractor_name || undefined,
                gis_audit_notes: w.gis_audit_notes || undefined,
              }));
              activeCand = {
                ...candidate,
                mplads_works: fullWorks,
              };
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch on-demand candidate dossier:', e);
      }
    }

    setProofModal({
      isOpen: true,
      candidateName,
      fieldLabel,
      value,
      pdfUrl,
      bbox: activeCand?.proof_bbox,
      candidate: activeCand,
    });
  };

  // Derive unique options for filters
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    candidates.forEach((c) => {
      if (c.state && c.state !== 'India' && c.state !== 'National') states.add(c.state);
    });
    return Array.from(states).sort();
  }, [candidates]);

  const availableConstituencies = useMemo(() => {
    const constits = new Set<string>();
    candidates.forEach((c) => {
      if (filterState.state === 'ALL' || c.state === filterState.state) {
        if (c.constituency && c.constituency !== 'National') constits.add(c.constituency);
      }
    });
    return Array.from(constits).sort();
  }, [candidates, filterState.state]);

  const availableParties = useMemo(() => {
    const parties = new Set<string>();
    candidates.forEach((c) => {
      if (c.party) parties.add(c.party);
    });
    return Array.from(parties).sort();
  }, [candidates]);

  // Comprehensive multi-factor candidate filter
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Text Search Query (supports tokenized multi-word search & aliases)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean);
        const knownAliases = PROMINENT_PARTY_MAP[c.name.toLowerCase().trim()];
        const aliasString = knownAliases ? `${knownAliases.party} ${knownAliases.constituency || ''} ${knownAliases.state || ''}` : '';
        const searchable = `${c.name} ${c.alias || ''} ${aliasString} ${c.constituency} ${c.state} ${c.party || ''}`.toLowerCase();
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
  }, [candidates, searchQuery, selectedHouse, filterState]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-slate-900 font-sans pb-20 md:pb-0">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearching={isSearching}
        selectedHouse={selectedHouse}
        onHouseChange={setSelectedHouse}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenCivicGuide={() => setIsCivicGuideOpen(true)}
      />

      {/* Sovereign Sansad Pavilion Masthead / Telemetry Overview */}
      <section className="bg-[#FCFAF6] border-b border-dholpur-300/80 py-8 shadow-2xs relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase bg-harit-50 text-harit-900 border border-harit-200/90 px-2.5 py-0.5 rounded-md">
                  <ShieldCheck size={14} weight="duotone" className="text-harit-600" />
                  {isCitizenMode
                    ? 'संप्रभु नागरिक पारदर्शिता • Sovereign Citizen Transparency'
                    : 'Section 79 Evidentiary Safe Harbor'}
                </span>
                <span className="text-xs text-slate-500 font-sans hidden sm:inline">
                  {isCitizenMode
                    ? '• Official Government Gazettes (भारतीय राजपत्र)'
                    : '• ECI Form 26 Sworn Disclosures'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                {isCitizenMode ? (
                  <>
                    <span>Apna Neta: Transparent Civic Records for Every Citizen</span>
                    <span className="block text-lg sm:text-xl font-devanagari text-kesariya-800 font-semibold mt-1">
                      अपना नेता: हर नागरिक के लिए स्वतंत्र व निष्पक्ष बहीखाता
                    </span>
                  </>
                ) : (
                  'Empirical Political Accountability & Forensic Audits'
                )}
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 max-w-2xl font-sans leading-relaxed">
                {isCitizenMode
                  ? 'अपने सांसद (MP) का विवरण देखें: उनके स्थानीय क्षेत्र विकास कोष (सांसद निधि) का उपयोग, घोषित संपत्ति की वृद्धि दर, और संसद में उपस्थिति व प्रश्न। हर तथ्य आधिकारिक शपथपत्रों से सत्यापित है।'
                  : 'Automated civic intelligence cross-referencing ECI affidavits, Sansad parliamentary participation, and MoSPI public fund flows. Every metric is bound to cryptographic PDF coordinates.'}
              </p>
            </div>
          </div>

          {/* Quick Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6">
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block truncate">
                सांसद व उम्मीदवार • MPs
              </span>
              <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 sm:mt-1">
                {(totalDatabaseCount || candidates.length).toLocaleString()}
              </p>
              <span className="text-[9.5px] sm:text-[10px] text-harit-700 font-medium block truncate">
                {isLiveConnected ? 'Live from Supabase' : 'Verified Open Records'}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block truncate">
                द्वि-प्रविष्टि ऑडिट • Double-Entry
              </span>
              <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 sm:mt-1">100%</p>
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 block truncate">Automated checks</span>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block truncate">
                सांसद निधि प्रवाह • MPLADS
              </span>
              <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 sm:mt-1">10-Yr Flow</p>
              <span className="text-[9.5px] sm:text-[10px] text-ashoka-700 font-medium block truncate">MoSPI e-SAKSHI</span>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:border-dholpur-400 transition-all">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block truncate">
                लागत • Operating Cost
              </span>
              <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-harit-700 mt-0.5 sm:mt-1">₹0.00</p>
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 block truncate">100% Free Public Good</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Candidate Feed / Leaderboards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'leaderboards' ? (
          <LeaderboardsView
            candidates={candidates}
            onVerifyProof={handleOpenProof}
            onOpenShareCard={handleOpenShareCard}
            selectedForComparison={selectedForComparison}
            onToggleComparison={handleToggleComparison}
          />
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

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Parliamentary Profiles & Audited Declarations ({filteredCandidates.length.toLocaleString()}){' '}
                  <span className="hidden lg:inline text-base font-normal font-devanagari text-slate-500">• संसदीय प्रोफ़ाइल</span>
                </h2>
                {(isLoading || isSearching) && (
                  <span className="flex items-center gap-1.5 text-xs text-ashoka-700 bg-ashoka-50 px-2.5 py-1 rounded-lg border border-ashoka-200">
                    <SpinnerGap size={14} weight="bold" className="animate-spin text-ashoka-700" />
                    {isSearching ? 'Searching database...' : 'Connecting...'}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">Click any card to inspect photo proof or export dossier</span>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dholpur-300 shadow-xs">
                {!isLiveConnected && !isLoading ? (
                  <div className="space-y-2 max-w-md mx-auto">
                    <p className="text-slate-800 text-sm font-bold">Live Database Not Connected • लाइव डेटाबेस कनेक्टेड नहीं है</p>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      ApnaNeta operates strictly on authentic government data with zero synthetic placeholders under the <strong>Strict Zero-Synthetic-Data Invariant</strong>. Please configure <code className="bg-dholpur-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">VITE_SUPABASE_URL</code> and <code className="bg-dholpur-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> to query verified records.
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm font-medium">No parliamentarians found matching your selected filters.</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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

                {(filteredCandidates.length > displayLimit || directoryOffset < totalDatabaseCount) && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => {
                        if (filteredCandidates.length > displayLimit) {
                          setDisplayLimit((prev) => prev + 50);
                        } else {
                          loadMoreCandidates();
                        }
                      }}
                      disabled={isLoadingMore}
                      className="px-8 py-3.5 bg-white hover:bg-dholpur-50 border border-dholpur-300 hover:border-dholpur-400 text-slate-800 text-sm font-semibold rounded-2xl shadow-xs hover:shadow transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center gap-2 justify-center">
                          <SpinnerGap size={16} className="animate-spin text-ashoka-600" />
                          Loading more parliamentarians...
                        </span>
                      ) : filteredCandidates.length > displayLimit ? (
                        `Load More Parliamentarians (${filteredCandidates.length - displayLimit} remaining in view)`
                      ) : (
                        `Load More from Database (Showing ${candidates.length} of ${totalDatabaseCount})`
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
            <span className="text-xs font-semibold hidden md:inline">Compare • तुलना:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[130px] sm:max-w-xs md:max-w-md">
              {selectedForComparison.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1 bg-slate-800 text-xs px-2 py-1 rounded-lg border border-slate-700 whitespace-nowrap flex-shrink-0"
                >
                  <span className="truncate max-w-[70px] sm:max-w-[90px] font-medium text-[11px] sm:text-xs">
                    {c.name.split(' ')[0]}
                  </span>
                  <button
                    onClick={() => handleRemoveFromComparison(c.id)}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
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
              <span className="hidden sm:inline">Side-by-Side</span>
              <span className="sm:hidden">Compare</span>
              <span>({selectedForComparison.length})</span>
              <ArrowRight size={13} weight="bold" />
            </button>
            <button
              onClick={handleClearComparison}
              className="text-slate-400 hover:text-slate-200 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom,0px)] text-white shadow-lg">
        <button
          onClick={() => setActiveView('directory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            activeView === 'directory' ? 'text-kesariya-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SquaresFour size={20} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">Directory • सूची</span>
        </button>

        <button
          onClick={() => setActiveView('leaderboards')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] transition-colors ${
            activeView === 'leaderboards' ? 'text-kesariya-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy size={20} weight={activeView === 'leaderboards' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">Leaderboards</span>
        </button>

        <button
          onClick={() => {
            if (selectedForComparison.length > 0) {
              setIsComparisonOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] text-slate-400 hover:text-slate-200 relative"
        >
          <Scales size={20} weight="duotone" />
          <span className="text-[10px] mt-0.5 font-sans">Compare • तुलना</span>
          {selectedForComparison.length > 0 && (
            <span className="absolute top-1 right-1/4 sm:right-6 w-4 h-4 bg-kesariya-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
              {selectedForComparison.length}
            </span>
          )}
        </button>
      </nav>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        candidates={selectedForComparison}
        onRemoveCandidate={handleRemoveFromComparison}
        onVerifyProof={handleOpenProof}
        onOpenShareCard={handleOpenShareCard}
      />

      {/* Social Report Card Graphic Modal */}
      <ReportCardModal
        isOpen={!!sharingCandidate}
        onClose={() => setSharingCandidate(null)}
        candidate={sharingCandidate}
      />

      {/* Affidavit Proof Viewer Modal */}
      <AffidavitProofViewer
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal((prev) => ({ ...prev, isOpen: false }))}
        candidateName={proofModal.candidateName}
        pdfUrl={proofModal.pdfUrl}
        fieldLabel={proofModal.fieldLabel}
        claimedValue={proofModal.value}
        bbox={proofModal.bbox}
        candidate={proofModal.candidate}
      />

      {/* Civic Guide FAQ Drawer */}
      <CivicFaqDrawer
        isOpen={isCivicGuideOpen}
        onClose={() => setIsCivicGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#FCFAF6] border-t border-dholpur-300/80 py-6 text-center text-xs text-slate-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-medium text-slate-700">
            Apna Neta (अपना नेता) — The Sovereign Civic Technology Ledger of India • संप्रभु नागरिक पारदर्शिता मंच
          </p>
          <p className="text-[11px] text-slate-500">
            All declarations are reproduced verbatim from sworn ECI Form 26 filings under Section 3(c)(ii) of the Digital Personal Data Protection Act, 2023.
          </p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <ViewModeProvider>
    <AppContent />
  </ViewModeProvider>
);

export default App;
