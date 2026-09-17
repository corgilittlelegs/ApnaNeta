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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Head-to-Head Candidate Matrix</h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {candidates.length} / 3 Candidates
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Comparative audit across sworn ECI Form 26 disclosures, Sansad attendance, and MPLADS velocity.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close Comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Candidate Switcher Tab (< md) */}
        {candidates.length > 1 && (
          <div className="md:hidden flex border-b border-slate-200 bg-slate-100/80 p-1.5 gap-1 overflow-x-auto">
            {candidates.map((cand, idx) => (
              <button
                key={cand.id}
                onClick={() => setActiveMobileIndex(idx)}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg truncate text-center transition-all ${
                  activeMobileIndex === idx
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cand.name.split(' ')[0]} ({cand.party || 'IND'})
              </button>
            ))}
          </div>
        )}

        {/* Modal Body: Side-by-Side Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {candidates.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-sm">No candidates selected for comparison.</p>
              <p className="text-xs text-slate-400 mt-1">
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
                    className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                      isHiddenOnMobile ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    {/* Candidate Top Header */}
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                          {cand.party || 'Independent'}
                        </span>
                        <button
                          onClick={() => onRemoveCandidate(cand.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors"
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
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                          />
                        ) : null}
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">{cand.name}</h3>
                          {cand.alias && (
                            <p className="text-xs text-slate-500 italic mt-0.5">"{cand.alias}"</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {cand.constituency}, {cand.state} • <span className="text-slate-500">{cand.house}</span>
                      </p>
                    </div>

                    {/* Comparative Metrics Sections */}
                    <div className="p-5 space-y-4 text-xs">
                      {/* 1. Forensic Math Verdict */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Audit Verdict
                        </span>
                        {cand.has_arithmetic_discrepancy ? (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                              <span>Discrepancy Flagged</span>
                            </div>
                            <p className="text-[11px] text-rose-700 mt-1">
                              Part A vs Part B delta:{' '}
                              <span className="font-mono font-bold">
                                {formatINR(cand.delta_movable + cand.delta_immovable)}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>Clean Arithmetic Audit</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              Part A item totals match Part B abstract summary.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 2. Balance Sheet Breakdown */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Sworn Balance Sheet ({cand.filing_year})
                        </span>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Declared Net Worth</span>
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {formatINR(cand.total_net_worth)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Movable Assets</span>
                            <span className="font-mono text-slate-700 font-medium">
                              {formatINR(cand.total_movable_assets)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Immovable Assets</span>
                            <span className="font-mono text-slate-700 font-medium">
                              {formatINR(cand.total_immovable_assets)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500">Total Liabilities</span>
                            <span className="font-mono text-slate-700 font-medium">
                              {formatINR(cand.total_liabilities)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Criminal Proceedings */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Criminal Record
                        </span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          {cand.serious_criminal_cases_count > 0 ? (
                            <div className="flex items-center gap-2 text-rose-800 font-bold">
                              <AlertOctagon className="w-4 h-4 text-rose-600" />
                              <span>{cand.serious_criminal_cases_count} Serious IPC Charge(s)</span>
                            </div>
                          ) : cand.criminal_cases_count > 0 ? (
                            <div className="flex items-center gap-2 text-amber-800 font-medium">
                              <Scale className="w-4 h-4 text-amber-600" />
                              <span>{cand.criminal_cases_count} Protest/Demonstration Citation(s)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-800 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>0 Declared Criminal Cases</span>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Verified from Form 26 Item 5 & 6 Disclosures
                          </span>
                        </div>
                      </div>

                      {/* 4. Legislative Record (Sansad) */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Sansad Attendance & Activity
                        </span>
                        {cand.attendance_rate !== undefined ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-1">
                                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                                Attendance Rate
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {cand.attendance_rate}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  cand.attendance_rate >= 80
                                    ? 'bg-emerald-500'
                                    : cand.attendance_rate >= 60
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(cand.attendance_rate, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                              <span>Debates: <strong>{cand.debates_count ?? 'N/A'}</strong></span>
                              <span>Questions: <strong>{cand.questions_count ?? 'N/A'}</strong></span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-[11px] italic">
                            N/A — Non-MP or First-Time Candidate
                          </div>
                        )}
                      </div>

                      {/* 5. MoSPI MPLADS Fund Velocity */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          MPLADS Fund Utilization
                        </span>
                        {cand.mplads ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-1">
                                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                                Velocity
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  cand.mplads.utilization_rate < 60
                                    ? 'text-rose-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {cand.mplads.utilization_rate.toFixed(1)}% Spent
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>Unspent:</span>
                              <span className="font-mono font-medium text-slate-700">
                                {formatINR(cand.mplads.unspent_balance)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Works completed: {cand.mplads.works_completed} / {cand.mplads.works_recommended}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-[11px] italic">
                            N/A — No Central MPLADS allocation on record
                          </div>
                        )}
                      </div>

                      {/* 6. Longitudinal Wealth Trajectory (CAGR) */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Multi-Term Wealth Trajectory
                        </span>
                        {latestWealth ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-slate-700 font-medium">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{latestWealth.from_year} &rarr; {latestWealth.to_year}</span>
                              </div>
                              <span
                                className={`font-mono font-bold ${
                                  latestWealth.is_rapid_accumulation
                                    ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                                    : 'text-emerald-700'
                                }`}
                              >
                                +{latestWealth.percentage_increase}%
                              </span>
                            </div>
                            {latestWealth.cagr_percent && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                Annualized CAGR: <span className="font-mono font-bold">{latestWealth.cagr_percent}%/yr</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-[11px] italic">
                            Single Term Sworn Filing (No historical baseline)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportCandidateDossierPdf(cand)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                          title="Download 1-Page Legal Dossier PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                          <span>PDF</span>
                        </button>

                        {onOpenShareCard && (
                          <button
                            onClick={() => onOpenShareCard(cand)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            title="Generate Shareable Social Card"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
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
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] hover:underline inline-flex items-center gap-0.5"
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
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            Tip: You can compare up to 3 candidates simultaneously across constituencies or parties.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors text-xs ml-auto"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
