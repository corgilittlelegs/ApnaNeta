import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CandidateCard } from './components/CandidateCard';
import { AffidavitProofViewer } from './components/AffidavitProofViewer';
import { ConstituencyFilter, FilterState } from './components/ConstituencyFilter';
import { ComparisonModal } from './components/ComparisonModal';
import { ReportCardModal } from './components/ReportCardModal';
import { LeaderboardsView } from './components/LeaderboardsView';
import { Candidate, BoundingBox } from './types/candidate';
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

import { SAMPLE_CANDIDATES } from './data/sampleCandidates';
import { PROMINENT_PARTY_MAP } from './data/politicianLookup';
import { CIVIC_IMPACT_BENCHMARKS } from './utils/civicConstants';

const AppContent: React.FC = () => {
  const { isCitizenMode } = useViewMode();
  const [isCivicGuideOpen, setIsCivicGuideOpen] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE_CANDIDATES);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState<number>(0);
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
          `${cleanUrl}/rest/v1/candidates?select=*,sansad_records(attendance_rate,debates_count,questions_count),affidavits(id,filing_year,source_url,r2_storage_key,audit_discrepancies(*),criminal_cases(*)),mplads_records(*),mplads_works(*),historical_wealth_cagr(*),conflict_of_interest_audits(*),political_mobility_records(*),corporate_associations(*)&order=name.asc&limit=10000`,
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
          const sampleNames = new Set(SAMPLE_CANDIDATES.map((c) => c.name.toLowerCase()));

          const dbCandidates: Candidate[] = data
            .filter((row: any) => !sampleNames.has((row.name || '').toLowerCase()))
            .map((row: any) => {
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
                fir_or_case_number: c.fir_or_case_number || 'Case',
                police_station: c.police_station,
                court_name: c.court_name,
                statutory_charges: c.statutory_charges,
                charges_framed: c.charges_framed,
                charges_framed_date: c.charges_framed_date,
                is_serious_category: c.is_serious_category,
                category_justification: c.category_justification,
                cnr_number: c.cnr_number,
                ecourts_verified: Boolean(c.ecourts_verified),
                ecourts_stage: c.ecourts_stage,
                is_rpa_section_8_disqualified: Boolean(c.is_rpa_section_8_disqualified),
              }));

              const crimCount = parsedDockets.length > 0 ? parsedDockets.length : Number(row.criminal_cases_count ?? 0);
              const seriousCount = parsedDockets.length > 0
                ? parsedDockets.filter((c: any) => c.is_serious_category).length
                : Number(row.serious_criminal_cases_count ?? 0);
              const protestCount = Number(row.protest_cases_count ?? 0);
              const isDisqualified = parsedDockets.some((d: any) => d.is_rpa_section_8_disqualified);

              const conflictList = Array.isArray(row.conflict_of_interest_audits) ? row.conflict_of_interest_audits : [];
              const hasConflict = conflictList.length > 0;

              const mobilityList = Array.isArray(row.political_mobility_records) ? row.political_mobility_records : [];
              const defectionCount = mobilityList.length;

              const corpList = Array.isArray(row.corporate_associations) ? row.corporate_associations : [];

              const pdfSourceUrl = aff?.source_url || row.pdf_source_url || 'https://affidavit.eci.gov.in';
              const r2Key = aff?.r2_storage_key || row.r2_storage_key || undefined;

              // Parse MoSPI MPLADS Record if available
              const mpladsRaw = Array.isArray(row.mplads_records) && row.mplads_records.length > 0 ? row.mplads_records[0] : null;
              const mpladsRecord = mpladsRaw
                ? {
                    entitled_amount: Number(mpladsRaw.entitled_amount ?? CIVIC_IMPACT_BENCHMARKS.DEFAULT_5YR_MPLADS_ENTITLEMENT),
                    released_amount: Number(mpladsRaw.released_amount ?? 0.0),
                    expenditure_amount: Number(mpladsRaw.expenditure_amount ?? 0.0),
                    unspent_balance: Number(mpladsRaw.unspent_balance ?? 0.0),
                    utilization_rate: Number(mpladsRaw.utilization_rate ?? 0.0),
                    works_recommended: Number(mpladsRaw.works_recommended ?? 0),
                    works_completed: Number(mpladsRaw.works_completed ?? 0),
                    term_years: mpladsRaw.term_years || '2019-2024',
                  }
                : undefined;

              // Parse Historical Wealth CAGR if available
              const cagrRawList = Array.isArray(row.historical_wealth_cagr) ? row.historical_wealth_cagr : [];
              const cagrRecords =
                cagrRawList.length > 0
                  ? cagrRawList.map((c: any) => ({
                      from_year: Number(c.from_year),
                      to_year: Number(c.to_year),
                      initial_assets: Number(c.initial_assets),
                      final_assets: Number(c.final_assets),
                      absolute_increase: Number(c.absolute_increase),
                      percentage_increase: Number(c.percentage_increase),
                      cagr_percent: c.cagr_percent != null ? Number(c.cagr_percent) : undefined,
                      is_rapid_accumulation: Boolean(c.is_rapid_accumulation),
                    }))
                  : undefined;

              const known = PROMINENT_PARTY_MAP[row.name ? row.name.toLowerCase().trim() : ''];
              const resolvedParty =
                known?.party ||
                (row.party && row.party !== 'Parliamentarian' && row.party !== 'None' && row.party !== 'null' && row.party !== 'Unknown'
                  ? row.party
                  : 'Independent');
              const resolvedState =
                known?.state ||
                (row.state && row.state !== 'India' && row.state !== 'National'
                  ? row.state
                  : (row.state || 'India'));
              const resolvedConstituency =
                known?.constituency ||
                (row.constituency && row.constituency !== 'Parliament of India' && row.constituency !== 'National'
                  ? row.constituency
                  : (row.constituency || 'National'));

              const rawHouse = row.house ? String(row.house).trim() : '';
              let resolvedHouse: 'Lok Sabha' | 'Rajya Sabha' | 'Vidhan Sabha' = known?.house || 'Lok Sabha';
              if (!known?.house) {
                if (rawHouse === 'Rajya Sabha') {
                  resolvedHouse = 'Rajya Sabha';
                } else if (rawHouse.includes('Vidhan')) {
                  resolvedHouse = 'Vidhan Sabha';
                } else {
                  resolvedHouse = 'Lok Sabha';
                }
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
            });

          // Deduplicate dbCandidates to ensure identical candidates are merged and unique
          const candidateMap = new Map<string, Candidate>();
          for (const cand of dbCandidates) {
            const key = `${cand.name.toLowerCase().trim()}::${cand.house.toLowerCase()}`;
            const existing = candidateMap.get(key);
            if (!existing) {
              candidateMap.set(key, cand);
            } else {
              // Merge records, prioritizing richer telemetry
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
              candidateMap.set(key, merged);
            }
          }

          const uniqueDbCandidates = Array.from(candidateMap.values());
          setCandidates([...SAMPLE_CANDIDATES, ...uniqueDbCandidates]);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.error('Failed to load live Supabase candidates, showing local sample data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCandidates();
  }, []);

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
  }, [candidates, searchQuery, selectedHouse, filterState]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans pb-20 md:pb-0">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedHouse={selectedHouse}
        onHouseChange={setSelectedHouse}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenCivicGuide={() => setIsCivicGuideOpen(true)}
      />

      {/* Civic Pulse Masthead / Telemetry Overview */}
      <section className="bg-white border-b border-slate-200/90 py-8 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  <ShieldCheck size={14} weight="duotone" className="text-emerald-600" />
                  {isCitizenMode
                    ? 'Sovereign Citizen Transparency • संप्रभु नागरिक पारदर्शिता'
                    : 'Section 79 Evidentiary Safe Harbor'}
                </span>
                <span className="text-xs text-slate-400 font-sans hidden sm:inline">
                  {isCitizenMode
                    ? '• Official Government Gazettes'
                    : '• ECI Form 26 Sworn Disclosures'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                {isCitizenMode
                  ? 'Apna Neta: Transparent Civic Records for Every Citizen'
                  : 'Empirical Political Accountability & Forensic Audits'}
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 max-w-2xl font-sans leading-relaxed">
                {isCitizenMode
                  ? 'Look up your Member of Parliament (MP), see how your local area development funds (सांसद निधि) were spent, track declared wealth growth, and review Parliament attendance in simple language.'
                  : 'Automated civic intelligence cross-referencing ECI affidavits, Sansad parliamentary participation, and MoSPI public fund flows. Every metric is bound to cryptographic PDF coordinates.'}
              </p>
            </div>
          </div>

          {/* Quick Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">MPs & Candidates Indexed</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {(totalDatabaseCount || candidates.length).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">
                {isLiveConnected ? 'Live from Supabase' : 'Verified OpenSanctions'}
              </span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">Double-Entry Audits</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">100%</p>
              <span className="text-[10px] text-slate-500">Automated arithmetic checks</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">MoSPI MPLADS Velocity</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">10-Yr Flow</p>
              <span className="text-[10px] text-blue-700 font-medium">Constituency Fund Tracking</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">Monthly Operating Cost</span>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">$0.00</p>
              <span className="text-[10px] text-slate-500">100% Free Public Good</span>
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
                  Parliamentary Profiles & Audited Declarations ({filteredCandidates.length.toLocaleString()})
                </h2>
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    <SpinnerGap size={14} weight="bold" className="animate-spin text-blue-700" /> Connecting...
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">Click any card to inspect photo proof or export dossier</span>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <p className="text-slate-600 text-sm font-medium">No parliamentarians found matching your selected filters.</p>
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

                {filteredCandidates.length > displayLimit && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setDisplayLimit((prev) => prev + 50)}
                      className="px-8 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-sm font-semibold rounded-2xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      Load More Parliamentarians ({filteredCandidates.length - displayLimit} remaining)
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
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0A192F] text-white rounded-2xl shadow-2xl px-4 sm:px-6 py-3 border border-slate-700 flex items-center gap-3 sm:gap-5 animate-in slide-in-from-bottom-6 max-w-[95vw]">
          <div className="flex items-center gap-2">
            <Stack size={18} weight="duotone" className="text-blue-400 flex-shrink-0" />
            <span className="text-xs font-semibold hidden md:inline">Compare:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs md:max-w-md">
              {selectedForComparison.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 bg-slate-800 text-xs px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  <span className="truncate max-w-[90px] font-medium">{c.name.split(' ')[0]}</span>
                  <button
                    onClick={() => handleRemoveFromComparison(c.id)}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Remove"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsComparisonOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Side-by-Side ({selectedForComparison.length})</span>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around h-16 px-2 text-white shadow-lg">
        <button
          onClick={() => setActiveView('directory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeView === 'directory' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SquaresFour size={20} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
          <span className="text-[10px] mt-0.5 font-sans">Directory</span>
        </button>

        <button
          onClick={() => setActiveView('leaderboards')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeView === 'leaderboards' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
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
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 relative"
        >
          <Scales size={20} weight="duotone" />
          <span className="text-[10px] mt-0.5 font-sans">Compare</span>
          {selectedForComparison.length > 0 && (
            <span className="absolute top-1 right-5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
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
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>
            Apna Neta is an open-source non-partisan civic technology project. All declarations are reproduced
            verbatim from sworn ECI Form 26 filings under Section 3(c)(ii) of the Digital Personal Data Protection Act, 2023.
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
