import React from 'react';
import { WarningCircle, CheckCircle, TrendUp, FileMagnifyingGlass } from '@phosphor-icons/react';
import { Candidate } from '../types/candidate';
import { useViewMode } from '../context/ViewModeContext';
import { CivicTerm } from './CivicTerm';

interface DiscrepancyBadgeProps {
  candidate: Candidate;
  onVerify: (fieldLabel: string, value: string) => void;
}

export const DiscrepancyBadge: React.FC<DiscrepancyBadgeProps> = ({ candidate, onVerify }) => {
  const { isCitizenMode } = useViewMode();

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-2">
      {/* 1. Double-Entry Arithmetic Check */}
      {candidate.has_arithmetic_discrepancy ? (
        <div className="flex items-center justify-between p-2.5 bg-terracotta-50 border border-terracotta-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-terracotta-900">
            <WarningCircle size={18} weight="duotone" className="text-terracotta-600 flex-shrink-0" />
            <div>
              {isCitizenMode ? (
                <div>
                  <span className="font-bold flex items-center gap-1">
                    <span>Mismatched Affidavit Numbers (अंकगणितीय विसंगति):</span>
                    <CivicTerm term="ARITHMETIC_CHECK" />
                  </span>{' '}
                  Itemized assets add up to{' '}
                  <span className="font-mono tabular-nums font-bold text-terracotta-800">
                    {formatINR(candidate.delta_movable || candidate.delta_immovable)}
                  </span>{' '}
                  more than the declared summary total.
                </div>
              ) : (
                <div>
                  <span className="font-bold">Arithmetic Variance Flagged (गणितीय विसंगति):</span> Part A itemized
                  total exceeds Part B abstract by{' '}
                  <span className="font-mono tabular-nums font-bold text-terracotta-800">
                    {formatINR(candidate.delta_movable || candidate.delta_immovable)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() =>
              onVerify(
                'Arithmetic Variance (Part A vs Part B)',
                formatINR(candidate.delta_movable || candidate.delta_immovable)
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-terracotta-300 text-terracotta-800 hover:bg-terracotta-100 rounded-lg font-semibold transition-colors flex-shrink-0 shadow-2xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Verify Source • जाँच</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-harit-50/80 border border-harit-200/80 rounded-xl text-xs text-harit-900">
          <CheckCircle size={16} weight="duotone" className="text-harit-600 flex-shrink-0" />
          <span>
            {isCitizenMode ? (
              <>
                <strong className="font-semibold text-harit-800">Math Verified (गणितीय सत्यापन):</strong> All
                declared assets match up without calculation discrepancies.
              </>
            ) : (
              <>
                <strong className="font-semibold text-harit-800">
                  Double-Entry Forensic Check (द्वि-प्रविष्टि जाँच):
                </strong>{' '}
                Part A itemized schedule reconciles with Part B abstract.
              </>
            )}
          </span>
        </div>
      )}

      {/* 2. Wealth Discrepancy Ratio (WDR) */}
      {candidate.wealth_discrepancy_ratio && (
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
            candidate.has_anomalous_wealth_ratio
              ? 'bg-kesariya-50 border-kesariya-200 text-kesariya-900'
              : 'bg-dholpur-50 border-dholpur-200 text-sovereign-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendUp size={16} weight="duotone" className="text-kesariya-600 flex-shrink-0" />
            <div>
              {isCitizenMode ? (
                <div>
                  <span className="font-bold inline-flex items-center gap-1">
                    <span>Wealth vs. Income (आय व संपत्ति अनुपात):</span>
                    <CivicTerm term="WDR" />
                  </span>{' '}
                  Declared wealth is{' '}
                  <span className="font-mono tabular-nums font-bold text-sovereign-950">
                    {candidate.wealth_discrepancy_ratio}x
                  </span>{' '}
                  higher than their 5-year declared taxable income.
                </div>
              ) : (
                <div>
                  <span className="font-bold">Wealth Discrepancy Ratio (WDR):</span> Declared net
                  worth is{' '}
                  <span className="font-mono tabular-nums font-bold text-sovereign-950">
                    {candidate.wealth_discrepancy_ratio}x
                  </span>{' '}
                  total 5-year declared taxable income.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() =>
              onVerify(
                'Wealth-to-Income Ratio',
                `${candidate.wealth_discrepancy_ratio}x Net Worth (${formatINR(candidate.total_net_worth)})`
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-dholpur-300 hover:bg-dholpur-100 rounded-lg font-semibold text-sovereign-800 transition-colors flex-shrink-0 shadow-2xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Audit • लेखापरीक्षा</span>
          </button>
        </div>
      )}
    </div>
  );
};
