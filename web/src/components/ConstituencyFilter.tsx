import React from 'react';
import { Filter, MapPin, X, AlertTriangle, TrendingUp, Landmark, ShieldAlert, Award } from 'lucide-react';

export interface FilterState {
  state: string;
  constituency: string;
  party: string;
  forensicFlag: 'ALL' | 'DISCREPANCY' | 'HIGH_WDR' | 'CRIMINAL' | 'LOW_MPLADS' | 'RAPID_WEALTH';
  wealthTier: 'ALL' | '100CR_PLUS' | '10CR_TO_100CR' | '1CR_TO_10CR' | 'UNDER_1CR';
}

interface ConstituencyFilterProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableStates: string[];
  availableConstituencies: string[];
  availableParties: string[];
  totalMatches: number;
}

export const ConstituencyFilter: React.FC<ConstituencyFilterProps> = ({
  filters,
  onFilterChange,
  availableStates,
  availableConstituencies,
  availableParties,
  totalMatches,
}) => {
  const hasActiveFilters =
    filters.state !== 'ALL' ||
    filters.constituency !== 'ALL' ||
    filters.party !== 'ALL' ||
    filters.forensicFlag !== 'ALL' ||
    filters.wealthTier !== 'ALL';

  const resetFilters = () => {
    onFilterChange({
      state: 'ALL',
      constituency: 'ALL',
      party: 'ALL',
      forensicFlag: 'ALL',
      wealthTier: 'ALL',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 mb-6 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Constituency & Forensic Explorer
            </h3>
            <p className="text-[11px] text-slate-500">
              Filter across India's 543 Lok Sabha seats, financial tiers, and forensic audit flags
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
            {totalMatches} matching MP{totalMatches === 1 ? '' : 's'}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3">
        {/* State Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            State / UT
          </label>
          <select
            value={filters.state}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                state: e.target.value,
                constituency: 'ALL', // Reset constituency when state changes
              })
            }
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All States / UTs ({availableStates.length})</option>
            {availableStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Constituency Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Constituency
          </label>
          <select
            value={filters.constituency}
            onChange={(e) => onFilterChange({ ...filters, constituency: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Constituencies</option>
            {availableConstituencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Political Party Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Political Party
          </label>
          <select
            value={filters.party}
            onChange={(e) => onFilterChange({ ...filters, party: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Parties</option>
            {availableParties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Forensic Audit Flag Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Forensic Audit Flag
          </label>
          <select
            value={filters.forensicFlag}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                forensicFlag: e.target.value as FilterState['forensicFlag'],
              })
            }
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Candidates</option>
            <option value="DISCREPANCY">⚠️ Discrepancy Flagged</option>
            <option value="HIGH_WDR">📈 High WDR Ratio Anomaly</option>
            <option value="CRIMINAL">⚖️ Declared Criminal Charges</option>
            <option value="LOW_MPLADS">📉 Low MPLADS Spend (&lt;60%)</option>
            <option value="RAPID_WEALTH">🚀 Rapid Wealth Surge (&ge;300%)</option>
          </select>
        </div>

        {/* Wealth Tier Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Declared Net Worth
          </label>
          <select
            value={filters.wealthTier}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                wealthTier: e.target.value as FilterState['wealthTier'],
              })
            }
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Wealth Tiers</option>
            <option value="100CR_PLUS">&ge; ₹100 Crore</option>
            <option value="10CR_TO_100CR">₹10 Cr &ndash; ₹100 Cr</option>
            <option value="1CR_TO_10CR">₹1 Cr &ndash; ₹10 Cr</option>
            <option value="UNDER_1CR">&lt; ₹1 Crore</option>
          </select>
        </div>
      </div>
    </div>
  );
};
