import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CalendarCheck,
  Landmark,
  BarChart3,
  Search,
  FileDown,
  Share2,
  Plus,
  Check,
  AlertOctagon,
  Scale,
  Award,
  Filter,
} from 'lucide-react';
import { Candidate } from '../types/candidate';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';
import { useViewMode } from '../context/ViewModeContext';
import { CivicTerm } from './CivicTerm';

interface LeaderboardsViewProps {
  candidates: Candidate[];
  onVerifyProof: (candidateName: string, fieldLabel: string, value: string, pdfUrl: string, candidate?: Candidate) => void;
  onOpenShareCard: (candidate: Candidate) => void;
  selectedForComparison: Candidate[];
  onToggleComparison: (candidate: Candidate) => void;
}

type LeaderboardTab = 'wealth_growth' | 'discrepancy' | 'sansad' | 'mplads' | 'averages';

export const LeaderboardsView: React.FC<LeaderboardsViewProps> = ({
  candidates,
  onVerifyProof,
  onOpenShareCard,
  selectedForComparison,
  onToggleComparison,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('wealth_growth');
  const [searchFilter, setSearchFilter] = useState('');
  const [houseFilter, setHouseFilter] = useState('ALL');
  const [sansadSubTab, setSansadSubTab] = useState<'high' | 'low'>('high');
  const [mpladsSubTab, setMpladsSubTab] = useState<'high_spend' | 'high_unspent'>('high_spend');
  const [averagesGrouping, setAveragesGrouping] = useState<'party' | 'state'>('party');
  const { isCitizenMode } = useViewMode();

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // House & search filtering
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (houseFilter !== 'ALL' && c.house !== houseFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchConst = c.constituency.toLowerCase().includes(q);
        const matchParty = (c.party || '').toLowerCase().includes(q);
        const matchState = (c.state || '').toLowerCase().includes(q);
        if (!matchName && !matchConst && !matchParty && !matchState) return false;
      }
      return true;
    });
  }, [candidates, houseFilter, searchFilter]);

  // Tab 1: Wealth Growth Champions (Sorted by percentage increase or CAGR)
  const wealthGrowthRankings = useMemo(() => {
    const list: { candidate: Candidate; growth: NonNullable<Candidate['historical_wealth']>[0] }[] = [];
    filteredCandidates.forEach((c) => {
      if (c.historical_wealth && c.historical_wealth.length > 0) {
        // Take the largest growth or the most recent
        const latest = c.historical_wealth[c.historical_wealth.length - 1];
        if (latest && latest.percentage_increase !== undefined) {
          list.push({ candidate: c, growth: latest });
        }
      }
    });

    return list.sort((a, b) => {
      const cagrA = a.growth.cagr_percent ?? 0;
      const cagrB = b.growth.cagr_percent ?? 0;
      if (cagrA !== cagrB) return cagrB - cagrA;
      return (b.growth.percentage_increase || 0) - (a.growth.percentage_increase || 0);
    });
  }, [filteredCandidates]);

  // Tab 2: Forensic Discrepancy Watchlist (Sorted by total variance)
  const discrepancyWatchlist = useMemo(() => {
    const flagged = filteredCandidates.filter(
      (c) => c.has_arithmetic_discrepancy || (c.delta_movable + c.delta_immovable > 0)
    );
    return flagged.sort((a, b) => {
      const deltaA = Math.abs(a.delta_movable) + Math.abs(a.delta_immovable);
      const deltaB = Math.abs(b.delta_movable) + Math.abs(b.delta_immovable);
      return deltaB - deltaA;
    });
  }, [filteredCandidates]);

  // Tab 3: Sansad Attendance
  const sansadRankings = useMemo(() => {
    const withAttendance = filteredCandidates.filter((c) => c.attendance_rate !== undefined);
    if (sansadSubTab === 'high') {
      return withAttendance.sort((a, b) => (b.attendance_rate || 0) - (a.attendance_rate || 0));
    } else {
      return withAttendance.sort((a, b) => (a.attendance_rate || 0) - (b.attendance_rate || 0));
    }
  }, [filteredCandidates, sansadSubTab]);

  // Tab 4: MPLADS Velocity
  const mpladsRankings = useMemo(() => {
    const withMplads = filteredCandidates.filter((c) => c.mplads !== undefined);
    if (mpladsSubTab === 'high_spend') {
      return withMplads.sort((a, b) => (b.mplads?.utilization_rate || 0) - (a.mplads?.utilization_rate || 0));
    } else {
      return withMplads.sort((a, b) => (b.mplads?.unspent_balance || 0) - (a.mplads?.unspent_balance || 0));
    }
  }, [filteredCandidates, mpladsSubTab]);

  // Tab 5: Party & State Aggregated Averages
  const aggregateAverages = useMemo(() => {
    const map = new Map<
      string,
      {
        groupKey: string;
        count: number;
        totalNetWorth: number;
        totalAttendance: number;
        attendanceCount: number;
        discrepancyCount: number;
        seriousCrimeCount: number;
      }
    >();

    filteredCandidates.forEach((c) => {
      const key = averagesGrouping === 'party' ? (c.party || 'Independent') : (c.state || 'Other');
      let entry = map.get(key);
      if (!entry) {
        entry = {
          groupKey: key,
          count: 0,
          totalNetWorth: 0,
          totalAttendance: 0,
          attendanceCount: 0,
          discrepancyCount: 0,
          seriousCrimeCount: 0,
        };
        map.set(key, entry);
      }

      entry.count += 1;
      entry.totalNetWorth += c.total_net_worth || 0;
      if (c.attendance_rate !== undefined) {
        entry.totalAttendance += c.attendance_rate;
        entry.attendanceCount += 1;
      }
      if (c.has_arithmetic_discrepancy) {
        entry.discrepancyCount += 1;
      }
      if (c.serious_criminal_cases_count > 0) {
        entry.seriousCrimeCount += 1;
      }
    });

    const results = Array.from(map.values()).map((e) => ({
      groupKey: e.groupKey,
      count: e.count,
      avgNetWorth: e.count > 0 ? e.totalNetWorth / e.count : 0,
      avgAttendance: e.attendanceCount > 0 ? e.totalAttendance / e.attendanceCount : null,
      discrepancyRate: e.count > 0 ? (e.discrepancyCount / e.count) * 100 : 0,
      seriousCrimeRate: e.count > 0 ? (e.seriousCrimeCount / e.count) * 100 : 0,
    }));

    // Sort by count descending
    return results.sort((a, b) => b.count - a.count);
  }, [filteredCandidates, averagesGrouping]);

  // Summary Metrics Banner
  const totalAnalyzed = candidates.length;
  const totalDiscrepancies = candidates.filter((c) => c.has_arithmetic_discrepancy).length;
  const avgAttendanceOverall = useMemo(() => {
    const list = candidates.filter((c) => c.attendance_rate !== undefined);
    if (list.length === 0) return 0;
    return (list.reduce((acc, c) => acc + (c.attendance_rate || 0), 0) / list.length).toFixed(1);
  }, [candidates]);

  return (
    <div className="space-y-6">
      {/* Top Header & Aggregate Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full font-semibold">
                NATIONAL CIVIC INDEX
              </span>
              <span className="text-xs text-slate-400">• Sworn Transparency Rankings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isCitizenMode ? 'Public Accountability Rankings' : 'Political Transparency Leaderboards'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              {isCitizenMode
                ? 'Simple rankings showing which representatives are most active, how constituency funds are spent, and where wealth grew fastest.'
                : 'Real-time forensic aggregations identifying exponential wealth surges, affidavit arithmetic discrepancies, legislative participation, and public fund velocities.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-slate-300 block">Analyzed Profiles</span>
              <span className="text-xl font-mono font-bold">{totalAnalyzed.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-rose-300 block">Flagged Discrepancies</span>
              <span className="text-xl font-mono font-bold text-rose-400">
                {totalDiscrepancies} ({((totalDiscrepancies / (totalAnalyzed || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-300 block">Avg Sansad Attendance</span>
              <span className="text-xl font-mono font-bold text-emerald-400">{avgAttendanceOverall}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-sm space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 touch-pan-x sm:flex-wrap">
          <button
            onClick={() => setActiveTab('wealth_growth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === 'wealth_growth'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="sm:hidden">Wealth Growth</span>
            <span className="hidden sm:inline">
              {isCitizenMode ? 'Fastest Growing Wealth (तेज़ी से बढ़ती संपत्ति)' : 'Wealth Growth (CAGR)'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('discrepancy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === 'discrepancy'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="sm:hidden">Discrepancies</span>
            <span className="hidden sm:inline">
              {isCitizenMode ? 'Affidavit Discrepancies (हलफ़नामा जांच)' : 'Discrepancy Watchlist'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sansad')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === 'sansad'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="sm:hidden">Sansad Activity</span>
            <span className="hidden sm:inline">
              {isCitizenMode ? 'Parliament Activity (संसद में सक्रियता)' : 'Sansad Attendance'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mplads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === 'mplads'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span className="sm:hidden">MPLADS Spend</span>
            <span className="hidden sm:inline">
              {isCitizenMode ? 'Local Fund Spending (सांसद निधि खर्च)' : 'MPLADS Fund Velocity'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('averages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === 'averages'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="sm:hidden">State & Party</span>
            <span className="hidden sm:inline">
              {isCitizenMode ? 'Party & State Comparison (राज्य और दल)' : 'State & Party Averages'}
            </span>
          </button>
        </div>

        {/* Global Filter Bar for Leaderboards */}
        <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search politician or party..."
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-blue-400 rounded-lg outline-none transition-all"
            />
          </div>

          <select
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value)}
            className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 font-medium text-slate-700 outline-none flex-shrink-0 max-w-[115px] sm:max-w-none"
          >
            <option value="ALL">All Houses</option>
            <option value="Lok Sabha">Lok Sabha</option>
            <option value="Rajya Sabha">Rajya Sabha</option>
            <option value="Vidhan Sabha">Vidhan Sabha</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Wealth Growth Content */}
      {activeTab === 'wealth_growth' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Longitudinal Asset Accumulation (CAGR %)</h3>
              <p className="text-xs text-slate-500">
                Multi-term compound annual asset surge tracked between consecutive election sworn affidavits.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{wealthGrowthRankings.length} tracked records</span>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {wealthGrowthRankings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No historical wealth trajectories recorded matching current filters.
              </div>
            ) : (
              wealthGrowthRankings.slice(0, 50).map((row, idx) => {
                const isSelected = selectedForComparison.some((c) => c.id === row.candidate.id);
                return (
                  <div key={`${row.candidate.id}-${idx}`} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-xs text-slate-400 w-6 flex-shrink-0 text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        {row.candidate.photo_url ? (
                          <img
                            src={row.candidate.photo_url}
                            alt={row.candidate.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                            {row.candidate.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {row.candidate.party || 'Independent'} • {row.candidate.constituency}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                            row.growth.is_rapid_accumulation
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          +{row.growth.percentage_increase}%
                        </span>
                        {row.growth.cagr_percent && (
                          <span className="block text-[10px] font-mono text-blue-700 font-semibold mt-0.5">
                            {row.growth.cagr_percent}% CAGR
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-mono text-[10.5px]">
                        {formatINR(row.growth.initial_assets)} &rarr; {formatINR(row.growth.final_assets)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleComparison(row.candidate)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onOpenShareCard(row.candidate)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                          title="Share Report Card"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => exportCandidateDossierPdf(row.candidate)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                          title="Download Legal Dossier PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Candidate & Constituency</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Initial Assets</th>
                  <th className="py-3 px-4">Final Assets</th>
                  <th className="py-3 px-4">Increase</th>
                  <th className="py-3 px-4 text-center">Annual CAGR</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wealthGrowthRankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No historical wealth trajectories recorded matching current filters.
                    </td>
                  </tr>
                ) : (
                  wealthGrowthRankings.slice(0, 50).map((row, idx) => {
                    const isSelected = selectedForComparison.some((c) => c.id === row.candidate.id);
                    return (
                      <tr key={`${row.candidate.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {row.candidate.photo_url ? (
                              <img
                                src={row.candidate.photo_url}
                                alt={row.candidate.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div>
                              <div className="font-bold text-slate-900">{row.candidate.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {row.candidate.party || 'Independent'} • {row.candidate.constituency}, {row.candidate.state}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {row.growth.from_year} &rarr; {row.growth.to_year}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatINR(row.growth.initial_assets)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatINR(row.growth.final_assets)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              row.growth.is_rapid_accumulation
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            +{row.growth.percentage_increase}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                          {row.growth.cagr_percent ? `${row.growth.cagr_percent}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onToggleComparison(row.candidate)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => onOpenShareCard(row.candidate)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Share Report Card"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button
                              onClick={() => exportCandidateDossierPdf(row.candidate)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Download Legal Dossier PDF"
                            >
                              <FileDown className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Discrepancy Watchlist */}
      {activeTab === 'discrepancy' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-rose-950 text-sm">Forensic Discrepancy Watchlist</h3>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Sworn declarations where itemized asset lines (Part A) do not match the sworn abstract totals (Part B).
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
              {discrepancyWatchlist.length} Candidates Flagged
            </span>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {discrepancyWatchlist.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Zero discrepancies detected in the active dataset.
              </div>
            ) : (
              discrepancyWatchlist.map((cand, idx) => {
                const totalDelta = Math.abs(cand.delta_movable) + Math.abs(cand.delta_immovable);
                const isSelected = selectedForComparison.some((c) => c.id === cand.id);

                return (
                  <div key={cand.id} className="p-3.5 hover:bg-rose-50/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-xs text-rose-600 w-6 flex-shrink-0 text-center">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                            {cand.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {cand.party || 'Independent'} • {cand.constituency}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                          {formatINR(totalDelta)} Δ
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() =>
                          onVerifyProof(
                            cand.name,
                            'Forensic Mathematical Discrepancy',
                            formatINR(totalDelta),
                            cand.pdf_source_url,
                            cand
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px]"
                      >
                        Inspect Scan &rarr;
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleComparison(cand)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onOpenShareCard(cand)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                          title="Share Report Card"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Candidate & Seat</th>
                  <th className="py-3 px-4">Declared Net Worth</th>
                  <th className="py-3 px-4">Part A Movable Δ</th>
                  <th className="py-3 px-4">Part A Immovable Δ</th>
                  <th className="py-3 px-4 font-bold text-rose-900">Total Arithmetic Variance</th>
                  <th className="py-3 px-4">Safe Harbor Proof</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discrepancyWatchlist.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Zero discrepancies detected in the active dataset. All mathematical declarations reconciled!
                    </td>
                  </tr>
                ) : (
                  discrepancyWatchlist.map((cand, idx) => {
                    const totalDelta = Math.abs(cand.delta_movable) + Math.abs(cand.delta_immovable);
                    const isSelected = selectedForComparison.some((c) => c.id === cand.id);

                    return (
                      <tr key={cand.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-rose-600 font-mono">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{cand.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {cand.party || 'Independent'} • {cand.constituency}, {cand.state}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatINR(cand.total_net_worth)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatINR(cand.delta_movable)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatINR(cand.delta_immovable)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                            {formatINR(totalDelta)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              onVerifyProof(
                                cand.name,
                                'Forensic Mathematical Discrepancy',
                                formatINR(totalDelta),
                                cand.pdf_source_url,
                                cand
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px]"
                          >
                            Inspect Scan &rarr;
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onToggleComparison(cand)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => onOpenShareCard(cand)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Share Report Card"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Sansad Attendance */}
      {activeTab === 'sansad' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sansad Parliamentary Attendance Meter</h3>
              <p className="text-xs text-slate-500">
                Official sittings attendance, debates, and questions logged by the Lok Sabha Secretariat.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setSansadSubTab('high')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sansadSubTab === 'high' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Top Attendance (≥ 80%)
              </button>
              <button
                onClick={() => setSansadSubTab('low')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sansadSubTab === 'low' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lowest Attendance / Absentees
              </button>
            </div>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {sansadRankings.slice(0, 50).map((cand, idx) => {
              const isSelected = selectedForComparison.some((c) => c.id === cand.id);
              const att = cand.attendance_rate || 0;

              return (
                <div key={cand.id} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-slate-400 w-6 flex-shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                          {cand.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {cand.party || 'Independent'} • {cand.constituency} ({cand.house})
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-mono font-bold text-xs ${
                          att >= 80 ? 'text-emerald-700' : att >= 60 ? 'text-blue-700' : 'text-rose-700'
                        }`}
                      >
                        {att}% Att.
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-2 text-[10.5px]">
                      <span>Debates: <strong>{cand.debates_count ?? '—'}</strong></span>
                      <span>•</span>
                      <span>Questions: <strong>{cand.questions_count ?? '—'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleComparison(cand)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenShareCard(cand)}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                        title="Share Report Card"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Member of Parliament</th>
                  <th className="py-3 px-4">Party & State</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                  <th className="py-3 px-4">Debates Participated</th>
                  <th className="py-3 px-4">Questions Asked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sansadRankings.slice(0, 50).map((cand, idx) => {
                  const isSelected = selectedForComparison.some((c) => c.id === cand.id);
                  const att = cand.attendance_rate || 0;

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cand.name}</div>
                        <div className="text-[11px] text-slate-500">{cand.constituency} ({cand.house})</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{cand.party || 'Independent'}</span>
                        <span className="text-[11px] text-slate-400 block">{cand.state}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              att >= 80 ? 'text-emerald-700' : att >= 60 ? 'text-blue-700' : 'text-rose-700'
                            }`}
                          >
                            {att}%
                          </span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                att >= 80 ? 'bg-emerald-500' : att >= 60 ? 'bg-blue-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(att, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {cand.debates_count ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {cand.questions_count ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleComparison(cand)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                            title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => onOpenShareCard(cand)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: MPLADS Fund Velocity */}
      {activeTab === 'mplads' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  {isCitizenMode
                    ? 'Constituency Development Fund Flow (सांसद निधि)'
                    : 'MoSPI MPLADS Development Fund Flow'}
                </h3>
                <CivicTerm term="MPLADS" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCitizenMode
                  ? 'Official record of how much local area development money (₹5 Cr/year) was spent or left idle.'
                  : 'Official expenditure rate and unspent public development funds per constituency.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setMpladsSubTab('high_spend')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mpladsSubTab === 'high_spend'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Highest Spend Velocity (%)
              </button>
              <button
                onClick={() => setMpladsSubTab('high_unspent')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mpladsSubTab === 'high_unspent'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Largest Unspent Balance
              </button>
            </div>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {mpladsRankings.slice(0, 50).map((cand, idx) => {
              const m = cand.mplads!;
              const isSelected = selectedForComparison.some((c) => c.id === cand.id);

              return (
                <div key={cand.id} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-slate-400 w-6 flex-shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                          {cand.constituency}, {cand.state}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {cand.name} ({cand.party || 'IND'})
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                          m.utilization_rate < 60
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {m.utilization_rate.toFixed(1)}% Spent
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="text-[10.5px]">
                      <span className="font-mono">{formatINR(m.unspent_balance)} unspent</span>
                      <span className="text-slate-400 block text-[9.5px]">
                        Works: {m.works_completed}/{m.works_recommended}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleComparison(cand)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title={isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenShareCard(cand)}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Constituency & MP</th>
                  <th className="py-3 px-4">Entitled</th>
                  <th className="py-3 px-4">Released</th>
                  <th className="py-3 px-4">Spent %</th>
                  <th className="py-3 px-4">Unspent Funds</th>
                  <th className="py-3 px-4">Works Done</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mpladsRankings.slice(0, 50).map((cand, idx) => {
                  const m = cand.mplads!;
                  const isSelected = selectedForComparison.some((c) => c.id === cand.id);

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cand.constituency}, {cand.state}</div>
                        <div className="text-[11px] text-slate-500">
                          {cand.name} ({cand.party || 'IND'})
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatINR(m.entitled_amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatINR(m.released_amount)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            m.utilization_rate < 60
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.utilization_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatINR(m.unspent_balance)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.works_completed} / {m.works_recommended}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleComparison(cand)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => onOpenShareCard(cand)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Party & State Averages */}
      {activeTab === 'averages' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Aggregated Transparency Benchmarks</h3>
              <p className="text-xs text-slate-500">
                Average net worth, discrepancy occurrence rates, and legislative attendance grouped by affiliation.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setAveragesGrouping('party')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  averagesGrouping === 'party'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Group by Party
              </button>
              <button
                onClick={() => setAveragesGrouping('state')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  averagesGrouping === 'state'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Group by State
              </button>
            </div>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {aggregateAverages.map((row) => (
              <div key={row.groupKey} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{row.groupKey}</h4>
                  <span className="font-mono text-xs text-slate-500 font-medium">
                    {row.count} MP{row.count === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Avg Net Worth</span>
                    <span className="font-mono font-bold text-slate-800">{formatINR(row.avgNetWorth)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Avg Attendance</span>
                    <span className="font-mono font-bold text-slate-800">
                      {row.avgAttendance !== null ? `${row.avgAttendance.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Discrepancy Rate</span>
                    <span
                      className={`font-mono font-bold ${
                        row.discrepancyRate > 15 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {row.discrepancyRate.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Serious Crime Rate</span>
                    <span
                      className={`font-mono font-bold ${
                        row.seriousCrimeRate > 20 ? 'text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      {row.seriousCrimeRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">
                    {averagesGrouping === 'party' ? 'Political Party' : 'State / UT'}
                  </th>
                  <th className="py-3 px-4 text-center">Candidates Analyzed</th>
                  <th className="py-3 px-4">Average Declared Net Worth</th>
                  <th className="py-3 px-4">Avg Sansad Attendance</th>
                  <th className="py-3 px-4">Discrepancy Flag Rate</th>
                  <th className="py-3 px-4">Serious IPC Case Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggregateAverages.map((row) => (
                  <tr key={row.groupKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.groupKey}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatINR(row.avgNetWorth)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {row.avgAttendance !== null ? `${row.avgAttendance.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          row.discrepancyRate > 15
                            ? 'bg-rose-100 text-rose-800'
                            : row.discrepancyRate > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.discrepancyRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          row.seriousCrimeRate > 20
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.seriousCrimeRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
