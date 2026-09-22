import React from 'react';
import { MapPin, X, Funnel, WarningCircle, Scales, TrendUp, Sparkle } from '@phosphor-icons/react';

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

  const handleQuickPill = (flag: FilterState['forensicFlag']) => {
    onFilterChange({
      ...filters,
      forensicFlag: filters.forensicFlag === flag ? 'ALL' : flag,
    });
  };

    return (
    <div className="bg-white rounded-2xl border border-dholpur-300/80 shadow-xs p-4 mb-6 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-dholpur-200">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 bg-kesariya-50 text-kesariya-700 rounded-lg border border-kesariya-200/80 flex-shrink-0">
            <MapPin size={16} weight="duotone" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm tracking-tight text-slate-900">
              Constituency & Forensic Filter Dock • <span className="font-devanagari text-kesariya-800 font-semibold">निर्वाचन क्षेत्र व फ़िल्टर</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans line-clamp-1 sm:line-clamp-none">
              Audit across India's 543 Lok Sabha seats, sworn Form 26 disclosures, and algorithmic checks
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono tabular-nums font-bold px-2.5 py-1 bg-dholpur-100 text-slate-800 rounded-lg border border-dholpur-300">
            {totalMatches.toLocaleString()} matching MP{totalMatches === 1 ? '' : 's'}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200/60 transition-colors"
            >
              <X size={12} weight="bold" /> Reset All • पुनः सेट
            </button>
          )}
        </div>
      </div>

      {/* 1-Tap Quick Filter Pills (Touch Scrollable on Mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar text-xs border-b border-dholpur-200 whitespace-nowrap touch-pan-x">
        <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 pl-0.5 flex-shrink-0">Quick Filters:</span>
        <button
          onClick={() => handleQuickPill('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
            filters.forensicFlag === 'ALL'
              ? 'bg-[#0A192F] text-kesariya-300 border-kesariya-500/40 shadow-xs'
              : 'bg-dholpur-50 text-slate-600 border-dholpur-300 hover:bg-dholpur-100'
          }`}
        >
          All 543 Lok Sabha • 543 सीटें
        </button>
        <button
          onClick={() => handleQuickPill('DISCREPANCY')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
            filters.forensicFlag === 'DISCREPANCY'
              ? 'bg-kesariya-600 text-white border-kesariya-600 shadow-xs'
              : 'bg-kesariya-50 text-kesariya-800 border-kesariya-200/80 hover:bg-kesariya-100'
          }`}
        >
          <WarningCircle size={13} weight="fill" />
          <span>Discrepancies • विसंगतियां</span>
        </button>
        <button
          onClick={() => handleQuickPill('RAPID_WEALTH')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
            filters.forensicFlag === 'RAPID_WEALTH'
              ? 'bg-ashoka-700 text-white border-ashoka-700 shadow-xs'
              : 'bg-ashoka-50 text-ashoka-800 border-ashoka-200/80 hover:bg-ashoka-100'
          }`}
        >
          <TrendUp size={13} weight="bold" />
          <span>Wealth Surge (≥300%) • त्वरित वृद्धि</span>
        </button>
        <button
          onClick={() => handleQuickPill('CRIMINAL')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
            filters.forensicFlag === 'CRIMINAL'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100'
          }`}
        >
          <Scales size={13} weight="duotone" />
          <span>Declared Charges • आपराधिक आरोप</span>
        </button>
      </div>

      {/* Advanced Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 pt-3">
        {/* State Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
            राज्य / UT • State
          </label>
          <select
            value={filters.state}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                state: e.target.value,
                constituency: 'ALL',
              })
            }
            className="w-full text-[11.5px] sm:text-xs bg-dholpur-50 border border-dholpur-300 rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-kesariya-400 outline-none transition-all cursor-pointer hover:border-dholpur-400 truncate"
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
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
            निर्वाचन क्षेत्र • Seat
          </label>
          <select
            value={filters.constituency}
            onChange={(e) => onFilterChange({ ...filters, constituency: e.target.value })}
            className="w-full text-[11.5px] sm:text-xs bg-dholpur-50 border border-dholpur-300 rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-kesariya-400 outline-none transition-all cursor-pointer hover:border-dholpur-400 truncate"
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
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
            राजनीतिक दल • Party
          </label>
          <select
            value={filters.party}
            onChange={(e) => onFilterChange({ ...filters, party: e.target.value })}
            className="w-full text-[11.5px] sm:text-xs bg-dholpur-50 border border-dholpur-300 rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-kesariya-400 outline-none transition-all cursor-pointer hover:border-dholpur-400 truncate"
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
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
            ऑडिट फ़्लैग • Audit Flag
          </label>
          <select
            value={filters.forensicFlag}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                forensicFlag: e.target.value as FilterState['forensicFlag'],
              })
            }
            className="w-full text-[11.5px] sm:text-xs bg-dholpur-50 border border-dholpur-300 rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-kesariya-400 outline-none transition-all cursor-pointer hover:border-dholpur-400 truncate"
          >
            <option value="ALL">All Candidates</option>
            <option value="DISCREPANCY">⚠️ Discrepancy • विसंगतियां</option>
            <option value="HIGH_WDR">📈 High WDR Ratio</option>
            <option value="CRIMINAL">⚖️ Criminal Charges • आरोप</option>
            <option value="LOW_MPLADS">📉 Low MPLADS (&lt;60%)</option>
            <option value="RAPID_WEALTH">🚀 Wealth Surge (≥300%)</option>
          </select>
        </div>

        {/* Wealth Tier Filter */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
            कुल संपत्ति • Net Worth
          </label>
          <select
            value={filters.wealthTier}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                wealthTier: e.target.value as FilterState['wealthTier'],
              })
            }
            className="w-full text-[11.5px] sm:text-xs bg-dholpur-50 border border-dholpur-300 rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-kesariya-400 outline-none transition-all cursor-pointer hover:border-dholpur-400 truncate"
          >
            <option value="ALL">All Wealth Tiers</option>
            <option value="100CR_PLUS">&ge; ₹100 Crore (₹100 करोड़+)</option>
            <option value="10CR_TO_100CR">₹10 Cr &ndash; ₹100 Cr (₹10-100 करोड़)</option>
            <option value="1CR_TO_10CR">₹1 Cr &ndash; ₹10 Cr (₹1-10 करोड़)</option>
            <option value="UNDER_1CR">&lt; ₹1 Crore (&lt; ₹1 करोड़)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

