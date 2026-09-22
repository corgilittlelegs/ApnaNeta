import React, { useState } from 'react';
import {
  X,
  Scale,
  AlertOctagon,
  CalendarCheck,
  Landmark,
  TrendingUp,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Trash2,
  Layers,
} from 'lucide-react';
import { Candidate } from '../types/candidate';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onRemoveCandidate: (candidateId: string) => void;
  onVerifyProof: (candidateName: string, fieldLabel: string, value: string, pdfUrl: string, candidate?: Candidate) => void;
  onOpenShareCard?: (candidate: Candidate) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onRemoveCandidate,
  onVerifyProof,
  onOpenShareCard,
}) => {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  if (!isOpen) return null;

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-sovereign-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-dholpur-50 rounded-2xl shadow-2xl border border-kesariya-600/30 w-full max-w-6xl max-h-[92dvh] sm:max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Tiranga Accent Line */}
        <div className="tiranga-accent-bar" />

        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-sovereign-800 bg-sovereign-950 text-white flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-kesariya-500/20 border border-kesariya-500/30 flex items-center justify-center text-kesariya-400 shadow-sm flex-shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white truncate">Candidate Matrix</h2>
                <span className="text-xs font-devanagari text-kesariya-400 font-medium hidden sm:inline">
                  • तुलनात्मक लेखापरीक्षण
                </span>
                <span className="text-[10px] sm:text-xs bg-kesariya-500/20 text-kesariya-300 font-bold px-2 py-0.5 rounded-full font-mono flex-shrink-0 border border-kesariya-500/30">
                  {candidates.length}/3
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-dholpur-300 truncate sm:line-clamp-none">
                Comparative audit across ECI Form 26 disclosures, Sansad attendance, and MPLADS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-dholpur-400 hover:text-white hover:bg-sovereign-800 transition-colors flex-shrink-0 cursor-pointer"
            title="Close Comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Candidate Switcher Tab (< md) */}
        {candidates.length > 1 && (
          <div className="md:hidden flex border-b border-dholpur-300 bg-dholpur-100 p-1.5 gap-1 overflow-x-auto no-scrollbar touch-pan-x">
            {candidates.map((cand, idx) => (
              <button
                key={cand.id}
                onClick={() => setActiveMobileIndex(idx)}
                className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg truncate text-center transition-all whitespace-nowrap ${
                  activeMobileIndex === idx
                    ? 'bg-kesariya-600 text-sovereign-950 shadow-sm border border-kesariya-600 font-bold'
                    : 'text-sovereign-700 hover:text-sovereign-950'
                }`}
              >
                {cand.name.split(' ')[0]} ({cand.party || 'IND'})
              </button>
            ))}
          </div>
        )}

        {/* Modal Body: Side-by-Side Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dholpur-100/60">
          {candidates.length === 0 ? (
            <div className="py-16 text-center text-sovereign-600">
              <p className="text-sm">No candidates selected for comparison.</p>
              <p className="text-xs text-sovereign-500 mt-1">
                Select candidates using "+ Compare" on any candidate card.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((cand, idx) => {
                const latestWealth =
                  cand.historical_wealth && cand.historical_wealth.length > 0
                    ? cand.historical_wealth[cand.historical_wealth.length - 1]
                    : null;

                const isHiddenOnMobile = activeMobileIndex !== idx;

                return (
                  <div
                    key={cand.id}
                    className={`sandstone-card rounded-2xl border border-dholpur-300 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                      isHiddenOnMobile ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    {/* Candidate Top Header */}
                    <div className="p-5 border-b border-dholpur-200/80 bg-gradient-to-b from-dholpur-100/80 to-dholpur-50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 bg-dholpur-100 text-sovereign-800 border border-dholpur-300 rounded-md">
                          {cand.party || 'Independent'}
                        </span>
                        <button
                          onClick={() => onRemoveCandidate(cand.id)}
                          className="text-sovereign-400 hover:text-terracotta-600 p-1 hover:bg-terracotta-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove from comparison"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5 mb-2">
                        {cand.photo_url ? (
                          <img
                            src={cand.photo_url}
                            alt={cand.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border-2 border-kesariya-500/40 shadow-2xs flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div>
                          <h3 className="font-serif font-bold text-sovereign-950 text-base leading-tight">{cand.name}</h3>
                          {cand.alias && (
                            <p className="text-xs text-sovereign-500 italic mt-0.5">"{cand.alias}"</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-sovereign-700 mt-1 font-medium">
                        {cand.constituency}, {cand.state} • <span className="text-sovereign-500">{cand.house}</span>
                      </p>
                    </div>

                    {/* Comparative Metrics Sections */}
                    <div className="p-5 space-y-4 text-xs">
                      {/* 1. Forensic Math Verdict */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          Audit Verdict
                        </span>
                        {cand.has_arithmetic_discrepancy ? (
                          <div className="p-2.5 bg-terracotta-50 border border-terracotta-200 rounded-xl text-terracotta-800">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 text-terracotta-600 flex-shrink-0" />
                              <span>Discrepancy Flagged</span>
                            </div>
                            <p className="text-[11px] text-terracotta-700 mt-1">
                              Part A vs Part B delta:{' '}
                              <span className="font-mono font-bold">
                                {formatINR(cand.delta_movable + cand.delta_immovable)}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-harit-50 border border-harit-200 rounded-xl text-harit-800">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-harit-600 flex-shrink-0" />
                              <span>Clean Arithmetic Audit</span>
                            </div>
                            <p className="text-[11px] text-harit-700 mt-0.5">
                              Part A item totals match Part B abstract summary.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 2. Balance Sheet Breakdown */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          Sworn Balance Sheet ({cand.filing_year})
                        </span>
                        <div className="bg-dholpur-50 p-3 rounded-xl border border-dholpur-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sovereign-700">Declared Net Worth</span>
                            <span className="font-mono font-bold text-sm text-sovereign-950">
                              {formatINR(cand.total_net_worth)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-sovereign-600">Movable Assets</span>
                            <span className="font-mono text-sovereign-800 font-medium">
                              {formatINR(cand.total_movable_assets)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-sovereign-600">Immovable Assets</span>
                            <span className="font-mono text-sovereign-800 font-medium">
                              {formatINR(cand.total_immovable_assets)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-dholpur-200">
                            <span className="text-sovereign-600">Total Liabilities</span>
                            <span className="font-mono text-terracotta-700 font-medium">
                              {formatINR(cand.total_liabilities)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Criminal Proceedings */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          Criminal Record
                        </span>
                        <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                          {cand.serious_criminal_cases_count > 0 ? (
                            <div className="flex items-center gap-2 text-terracotta-800 font-bold">
                              <AlertOctagon className="w-4 h-4 text-terracotta-600" />
                              <span>{cand.serious_criminal_cases_count} Serious IPC Charge(s)</span>
                            </div>
                          ) : cand.criminal_cases_count > 0 ? (
                            <div className="flex items-center gap-2 text-kesariya-800 font-medium">
                              <Scale className="w-4 h-4 text-kesariya-600" />
                              <span>{cand.criminal_cases_count} Protest/Demonstration Citation(s)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-harit-800 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-harit-600" />
                              <span>0 Declared Criminal Cases</span>
                            </div>
                          )}
                          <span className="text-[10px] text-sovereign-500 block mt-1">
                            Verified from Form 26 Item 5 & 6 Disclosures
                          </span>
                        </div>
                      </div>

                      {/* 4. Legislative Record (Sansad) */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          Sansad Attendance & Activity
                        </span>
                        {cand.attendance_rate !== undefined ? (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sovereign-700 flex items-center gap-1">
                                <CalendarCheck className="w-3.5 h-3.5 text-kesariya-700" />
                                Attendance Rate
                              </span>
                              <span className="font-mono font-bold text-sovereign-950">
                                {cand.attendance_rate}%
                              </span>
                            </div>
                            <div className="w-full bg-dholpur-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  cand.attendance_rate >= 80
                                    ? 'bg-harit-500'
                                    : cand.attendance_rate >= 60
                                    ? 'bg-kesariya-500'
                                    : 'bg-terracotta-500'
                                }`}
                                style={{ width: `${Math.min(cand.attendance_rate, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-sovereign-600 pt-1">
                              <span>Debates: <strong>{cand.debates_count ?? 'N/A'}</strong></span>
                              <span>Questions: <strong>{cand.questions_count ?? 'N/A'}</strong></span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200 text-sovereign-500 text-[11px] italic">
                            N/A — Non-MP or First-Time Candidate
                          </div>
                        )}
                      </div>

                      {/* 5. MoSPI MPLADS Fund Velocity */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          MPLADS Fund Utilization
                        </span>
                        {cand.mplads ? (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-sovereign-700 flex items-center gap-1">
                                <Landmark className="w-3.5 h-3.5 text-kesariya-700" />
                                Velocity
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  cand.mplads.utilization_rate < 60
                                    ? 'text-terracotta-700'
                                    : 'text-harit-700'
                                }`}
                              >
                                {cand.mplads.utilization_rate.toFixed(1)}% Spent
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-sovereign-600">
                              <span>Unspent:</span>
                              <span className="font-mono font-medium text-sovereign-800">
                                {formatINR(cand.mplads.unspent_balance)}
                              </span>
                            </div>
                            <div className="text-[10px] text-sovereign-500">
                              Works completed: {cand.mplads.works_completed} / {cand.mplads.works_recommended}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200 text-sovereign-500 text-[11px] italic">
                            N/A — No Central MPLADS allocation on record
                          </div>
                        )}
                      </div>

                      {/* 6. Longitudinal Wealth Trajectory (CAGR) */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sovereign-500 block mb-1.5">
                          Multi-Term Wealth Trajectory
                        </span>
                        {latestWealth ? (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-sovereign-800 font-medium">
                                <TrendingUp className="w-3.5 h-3.5 text-harit-600" />
                                <span>{latestWealth.from_year} &rarr; {latestWealth.to_year}</span>
                              </div>
                              <span
                                className={`font-mono font-bold ${
                                  latestWealth.is_rapid_accumulation
                                    ? 'text-terracotta-700 bg-terracotta-50 px-1.5 py-0.5 rounded border border-terracotta-200'
                                    : 'text-harit-700'
                                }`}
                              >
                                +{latestWealth.percentage_increase}%
                              </span>
                            </div>
                            {latestWealth.cagr_percent && (
                              <div className="text-[10px] text-sovereign-600 mt-1">
                                Annualized CAGR: <span className="font-mono font-bold">{latestWealth.cagr_percent}%/yr</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200 text-sovereign-500 text-[11px] italic">
                            Single Term Sworn Filing (No historical baseline)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 bg-dholpur-100/80 border-t border-dholpur-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportCandidateDossierPdf(cand)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sovereign-800 bg-white hover:bg-dholpur-100 border border-dholpur-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                          title="Download 1-Page Legal Dossier PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-kesariya-700" />
                          <span>PDF</span>
                        </button>

                        {onOpenShareCard && (
                          <button
                            onClick={() => onOpenShareCard(cand)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sovereign-800 bg-white hover:bg-dholpur-100 border border-dholpur-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                            title="Generate Shareable Social Card"
                          >
                            <Share2 className="w-3.5 h-3.5 text-harit-600" />
                            <span>Share</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          onVerifyProof(
                            cand.name,
                            'Sworn Identity & Declaration',
                            cand.name,
                            cand.pdf_source_url,
                            cand
                          )
                        }
                        className="text-ashoka-700 hover:text-ashoka-900 font-semibold text-[11px] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        Form 26 Proof &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-dholpur-100 border-t border-dholpur-300 flex flex-wrap items-center justify-between gap-4 text-xs text-sovereign-600">
          <span>
            Tip: You can compare up to 3 candidates simultaneously across constituencies or parties.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sovereign-900 hover:bg-sovereign-800 text-dholpur-50 font-medium rounded-xl transition-colors text-xs ml-auto cursor-pointer shadow-xs"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
