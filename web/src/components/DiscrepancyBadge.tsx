import React from 'react';
import { WarningCircle, CheckCircle, TrendUp, FileMagnifyingGlass } from '@phosphor-icons/react';
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
          <div className="flex items-center gap-2 text-rose-900">
            <WarningCircle size={18} weight="duotone" className="text-rose-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Arithmetic Variance Flagged:</span>{' '}
              Part A itemized total exceeds Part B abstract by{' '}
              <span className="font-mono tabular-nums font-bold text-rose-800">
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
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg font-semibold transition-colors flex-shrink-0 shadow-2xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Verify Source</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
          <CheckCircle size={16} weight="duotone" className="text-emerald-600 flex-shrink-0" />
          <span>
            <strong className="font-semibold text-emerald-800">Double-Entry Forensic Check:</strong> Part A itemized schedule reconciles with Part B abstract.
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
            <TrendUp size={16} weight="duotone" className="text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Wealth Discrepancy Ratio (WDR):</span>{' '}
              Declared net worth is{' '}
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {candidate.wealth_discrepancy_ratio}x
              </span>{' '}
              total 5-year declared taxable income.
            </div>
          </div>
          <button
            onClick={() =>
              onVerify(
                'Wealth-to-Income Ratio',
                `${candidate.wealth_discrepancy_ratio}x Net Worth (${formatINR(candidate.total_net_worth)})`
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors flex-shrink-0 shadow-2xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Audit</span>
          </button>
        </div>
      )}
    </div>
  );
};

