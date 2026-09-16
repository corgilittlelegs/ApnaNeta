import React from 'react';
import { AlertOctagon, Scale, CalendarCheck, FileDown, Landmark, TrendingUp } from 'lucide-react';
import { Candidate } from '../types/candidate';
import { DiscrepancyBadge } from './DiscrepancyBadge';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';

interface CandidateCardProps {
  candidate: Candidate;
  onVerifyProof: (candidateName: string, fieldLabel: string, value: string, pdfUrl: string, candidate?: Candidate) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onVerifyProof }) => {
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const latestWealthGrowth =
    candidate.historical_wealth && candidate.historical_wealth.length > 0
      ? candidate.historical_wealth[candidate.historical_wealth.length - 1]
      : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
      {/* Top Banner & Identity */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-lg hover:text-blue-600 transition-colors cursor-pointer">
                {candidate.name}
              </h3>
              {candidate.alias && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                  "{candidate.alias}"
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {candidate.house} •{' '}
              {candidate.constituency &&
              candidate.constituency !== candidate.state &&
              candidate.constituency !== 'National' &&
              candidate.constituency !== 'Parliament of India' ? (
                <>
                  <span className="font-medium text-slate-700">{candidate.constituency}</span>
                  {candidate.state && candidate.state !== 'India' ? `, ${candidate.state}` : ''}
                </>
              ) : (
                <span className="font-medium text-slate-700">
                  {candidate.state && candidate.state !== 'India' ? candidate.state : (candidate.constituency || 'India')}
                </span>
              )}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg">
            {candidate.party || 'Independent'}
          </span>
        </div>

        {/* Core Financial & Crime Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl mb-3 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Declared Net Worth</span>
            <span className="text-base font-bold font-mono text-slate-900">
              {formatINR(candidate.total_net_worth)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Movable: {formatINR(candidate.total_movable_assets)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Criminal Record</span>
            {candidate.serious_criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                <AlertOctagon className="w-3.5 h-3.5" />
                {candidate.serious_criminal_cases_count} Serious Case(s)
              </span>
            ) : candidate.criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                <Scale className="w-3.5 h-3.5" />
                {candidate.criminal_cases_count} Protest Citation(s)
              </span>
            ) : (
              <span className="font-semibold text-emerald-700">0 Declared Charges</span>
            )}
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {candidate.filing_year} Sworn Filing
            </span>
          </div>
        </div>

        {/* MoSPI MPLADS Fund Velocity & Historical Wealth Badges */}
        <div className="space-y-2 mb-3">
          {candidate.mplads && (
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium">MPLADS Velocity:</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-bold ${
                    candidate.mplads.utilization_rate < 60 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {candidate.mplads.utilization_rate.toFixed(1)}% Spent
                </span>
                <span className="text-[10px] text-slate-400">
                  ({formatINR(candidate.mplads.unspent_balance)} unspent)
                </span>
              </div>
            </div>
          )}

          {latestWealthGrowth && (
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">Wealth Trajectory:</span>
              </div>
              <div>
                {latestWealthGrowth.is_rapid_accumulation ? (
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px]">
                    ⚠️ +{latestWealthGrowth.percentage_increase}% Rapid Surge
                  </span>
                ) : (
                  <span className="font-mono font-bold text-emerald-700 text-[11px]">
                    +{latestWealthGrowth.percentage_increase}% ({latestWealthGrowth.from_year} &rarr; {latestWealthGrowth.to_year})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Parliamentary Attendance if available */}
          {candidate.attendance_rate !== undefined && (
            <div className="flex items-center justify-between py-1.5 px-3 border border-slate-100 rounded-lg text-xs text-slate-600 bg-white">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Sansad Attendance:</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{candidate.attendance_rate}%</span>
            </div>
          )}
        </div>

        {/* Algorithmic Discrepancy Badge */}
        <DiscrepancyBadge
          candidate={candidate}
          onVerify={(label, value) =>
            onVerifyProof(candidate.name, label, value, candidate.pdf_source_url, candidate)
          }
        />
      </div>

      {/* Card Footer with 1-Click Forensic Dossier Export */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Filing Year: {candidate.filing_year}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportCandidateDossierPdf(candidate)}
            title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF Dossier</span>
          </button>
          <button
            onClick={() =>
              onVerifyProof(
                candidate.name,
                'Sworn Identity & Declaration',
                candidate.name,
                candidate.pdf_source_url,
                candidate
              )
            }
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
          >
            Affidavit Scan →
          </button>
        </div>
      </div>
    </div>
  );
};
