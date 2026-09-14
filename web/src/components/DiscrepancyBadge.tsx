import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, Search } from 'lucide-react';
import { Candidate } from '../types/candidate';

interface DiscrepancyBadgeProps {
  candidate: Candidate;
  onVerify: (fieldLabel: string, value: string) => void;
}

export const DiscrepancyBadge: React.FC<DiscrepancyBadgeProps> = ({ candidate, onVerify }) => {
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-2">
      {/* 1. Double-Entry Arithmetic Check */}
      {candidate.has_arithmetic_discrepancy ? (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Arithmetic Variance:</span>{' '}
              Part A list exceeds Part B total by{' '}
              <span className="font-mono font-bold">
                {formatINR(candidate.delta_movable || candidate.delta_immovable)}
              </span>
            </div>
          </div>
          <button
            onClick={() =>
              onVerify(
                'Arithmetic Variance (Part A vs Part B)',
                formatINR(candidate.delta_movable || candidate.delta_immovable)
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg font-medium transition-colors"
          >
            <Search className="w-3 h-3" /> Verify Source
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <span className="font-semibold">Double-Entry Audit:</span> Part A itemized totals match Part B summary perfectly.
          </span>
        </div>
      )}

      {/* 2. Wealth Discrepancy Ratio (WDR) */}
      {candidate.wealth_discrepancy_ratio && (
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
            candidate.has_anomalous_wealth_ratio
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Wealth Discrepancy Ratio:</span>{' '}
              Declared net worth is{' '}
              <span className="font-mono font-bold">{candidate.wealth_discrepancy_ratio}x</span>{' '}
              total 5-year taxable income.
            </div>
          </div>
          <button
            onClick={() =>
              onVerify(
                'Wealth-to-Income Ratio',
                `${candidate.wealth_discrepancy_ratio}x Net Worth (${formatINR(candidate.total_net_worth)})`
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium text-slate-700 transition-colors"
          >
            <Search className="w-3 h-3" /> Audit
          </button>
        </div>
      )}
    </div>
  );
};
