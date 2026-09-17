import React from 'react';
import {
  WarningOctagon,
  Scales,
  CalendarCheck,
  FilePdf,
  Bank,
  TrendUp,
  ShareNetwork,
  Plus,
  Check,
  ShieldCheck,
  FileMagnifyingGlass,
  SealCheck,
  Info,
} from '@phosphor-icons/react';
import { Candidate } from '../types/candidate';
import { DiscrepancyBadge } from './DiscrepancyBadge';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';

interface CandidateCardProps {
  candidate: Candidate;
  onVerifyProof: (candidateName: string, fieldLabel: string, value: string, pdfUrl: string, candidate?: Candidate) => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: (candidate: Candidate) => void;
  onOpenShareCard?: (candidate: Candidate) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onVerifyProof,
  isSelectedForComparison,
  onToggleComparison,
  onOpenShareCard,
}) => {
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
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Banner & Candidate Identity */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Candidate Avatar with Legal Attribution Badge */}
            <div className="relative flex-shrink-0">
              {candidate.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={candidate.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow-2xs bg-slate-50"
                  onError={(e) => {
                    // Hide failed image and display monogram sibling
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const next = target.nextElementSibling as HTMLElement;
                    if (next) next.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-12 h-12 rounded-full items-center justify-center font-bold text-xs text-slate-700 bg-slate-100 border-2 border-slate-200 shadow-2xs ${
                  candidate.photo_url ? 'hidden' : 'flex'
                }`}
              >
                {candidate.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>

              {/* Attribution info tooltip badge */}
              {candidate.photo_attribution && (
                <a
                  href={candidate.photo_license_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={candidate.photo_attribution}
                  className="absolute -bottom-1 -right-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-0.5 shadow-xs transition-colors"
                >
                  <span className="sr-only">Photo Attribution: {candidate.photo_attribution}</span>
                  <Info size={11} weight="bold" />
                </a>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif font-bold text-slate-900 text-lg sm:text-xl hover:text-blue-700 transition-colors cursor-pointer leading-tight truncate">
                  {candidate.name}
                </h3>
                {candidate.alias && (
                  <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                    "{candidate.alias}"
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                <span className="font-semibold text-slate-700">{candidate.house}</span> •{' '}
                {candidate.constituency &&
                candidate.constituency !== candidate.state &&
                candidate.constituency !== 'National' &&
                candidate.constituency !== 'Parliament of India' ? (
                  <>
                    <span className="font-medium text-slate-800">{candidate.constituency}</span>
                    {candidate.state && candidate.state !== 'India' ? `, ${candidate.state}` : ''}
                  </>
                ) : (
                  <span className="font-medium text-slate-800">
                    {candidate.state && candidate.state !== 'India' ? candidate.state : (candidate.constituency || 'India')}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onToggleComparison && (
              <button
                onClick={() => onToggleComparison(candidate)}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  isSelectedForComparison
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
                title={isSelectedForComparison ? 'Selected for comparison' : 'Add to head-to-head comparison'}
              >
                {isSelectedForComparison ? (
                  <>
                    <Check size={13} weight="bold" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} weight="bold" className="text-blue-600" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg">
              {candidate.party || 'Independent'}
            </span>
          </div>
        </div>

        {/* Core Financial & Crime Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-100 mb-3.5 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5 text-[11px] uppercase tracking-wider font-medium">
              Declared Net Worth
            </span>
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900">
              {formatINR(candidate.total_net_worth)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              Movable: {formatINR(candidate.total_movable_assets)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5 text-[11px] uppercase tracking-wider font-medium">
              Criminal Record
            </span>
            {candidate.is_rpa_section_8_disqualified ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                <WarningOctagon size={15} weight="fill" className="text-rose-700" />
                Disqualified (RPA Sec 8)
              </span>
            ) : candidate.serious_criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <WarningOctagon size={15} weight="duotone" className="text-rose-600" />
                {candidate.serious_criminal_cases_count} Serious Case(s)
              </span>
            ) : candidate.criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <Scales size={15} weight="duotone" className="text-amber-600" />
                {candidate.criminal_cases_count} Protest Citation(s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck size={15} weight="duotone" className="text-emerald-600" />
                0 Charges Filed
              </span>
            )}
            <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
              {candidate.filing_year} Sworn Form 26
              {candidate.dockets?.some((d) => d.ecourts_verified) && (
                <span className="text-emerald-700 font-semibold">• eCourts Verified</span>
              )}
            </span>
          </div>
        </div>

        {/* Section 9A Commercial Conflict of Interest Alert */}
        {candidate.has_section_9a_conflict && (
          <div className="flex items-center justify-between py-1.5 px-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 mb-3 shadow-2xs">
            <span className="font-bold flex items-center gap-1 text-[11px]">
              <WarningOctagon size={14} weight="fill" className="text-rose-600" />
              Section 9A Conflict of Interest Flag
            </span>
            <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
              Subsisting Govt Tender
            </span>
          </div>
        )}

        {/* Political Mobility Defection Badge */}
        {candidate.defection_count !== undefined && candidate.defection_count > 0 && (
          <div className="flex items-center justify-between py-1.5 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 mb-3 shadow-2xs">
            <span className="font-medium flex items-center gap-1 text-[11px]">
              <ShareNetwork size={14} weight="duotone" className="text-purple-700" />
              Political Mobility Dynamics
            </span>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded border border-purple-200">
              {candidate.defection_count} Career Party Switch(es)
            </span>
          </div>
        )}

        {/* MoSPI MPLADS Fund Velocity & Historical Wealth Badges */}
        <div className="space-y-2 mb-3">
          {candidate.mplads && (
            <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Bank size={15} weight="duotone" className="text-blue-700" />
                  <span className="font-medium">MPLADS Fund Utilization:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      candidate.mplads.utilization_rate < 60 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {candidate.mplads.utilization_rate.toFixed(1)}% Spent
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({formatINR(candidate.mplads.unspent_balance)} unspent)
                  </span>
                </div>
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    candidate.mplads.utilization_rate < 60 ? 'bg-rose-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(candidate.mplads.utilization_rate, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {latestWealthGrowth && (
            <div className="flex items-center justify-between py-2 px-3 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <TrendUp size={15} weight="duotone" className="text-emerald-600" />
                <span className="font-medium">Wealth Trajectory:</span>
              </div>
              <div>
                {latestWealthGrowth.is_rapid_accumulation ? (
                  <span className="font-mono tabular-nums font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] inline-flex items-center gap-1">
                    ⚠️ +{latestWealthGrowth.percentage_increase}% Rapid Surge
                  </span>
                ) : (
                  <span className="font-mono tabular-nums font-bold text-emerald-800 text-[11px]">
                    +{latestWealthGrowth.percentage_increase}% ({latestWealthGrowth.from_year} &rarr; {latestWealthGrowth.to_year})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Parliamentary Attendance & Question Hour Breakdown */}
          {candidate.attendance_rate !== undefined && (
            <div className="p-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck size={15} weight="duotone" className="text-blue-700" />
                  <span>Sansad Attendance:</span>
                </div>
                <span className="font-mono tabular-nums font-bold text-slate-900">{candidate.attendance_rate}%</span>
              </div>
              
              {/* Question Hour Starred vs Unstarred Split */}
              {candidate.questions_count !== undefined && candidate.questions_count > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Questions Raised: <strong>{candidate.questions_count}</strong></span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-semibold" title="Starred (Oral Floor Examination)">
                      ★ {candidate.starred_questions_count ?? Math.round(candidate.questions_count * 0.1)} Starred
                    </span>
                    <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="Unstarred (Written Ministerial Replies)">
                      {candidate.unstarred_questions_count ?? Math.round(candidate.questions_count * 0.9)} Written
                    </span>
                  </div>
                </div>
              )}

              {/* Policy Topic Focus */}
              {candidate.policy_topics && Object.keys(candidate.policy_topics).length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                  <span className="text-slate-400 font-medium">Policy Focus:</span>
                  {Object.entries(candidate.policy_topics)
                    .filter(([_, pct]) => pct > 15)
                    .slice(0, 2)
                    .map(([domain, pct]) => (
                      <span key={domain} className="bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded border border-indigo-100 capitalize">
                        {domain.replace('_', ' ')} ({pct.toFixed(0)}%)
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Parliamentary Division Voting Record */}
          {candidate.division_votes && candidate.division_votes.length > 0 && (
            <div className="flex items-center justify-between py-1.5 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <Scales size={15} weight="duotone" className="text-indigo-600" />
                <span className="font-medium">Division Voting:</span>
              </span>
              <span className="font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                {candidate.division_votes.length} Landmark Bill(s) Voted
              </span>
            </div>
          )}

          {/* MPLADS GIS & Ghost Project Risk Alert */}
          {candidate.ghost_project_alerts_count !== undefined && candidate.ghost_project_alerts_count > 0 ? (
            <div className="flex items-center justify-between py-1.5 px-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 shadow-2xs">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <WarningOctagon size={14} weight="fill" className="text-rose-600" />
                GIS Anomaly Warning
              </span>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                {candidate.ghost_project_alerts_count} Duplicate/Ocean Alert(s)
              </span>
            </div>
          ) : candidate.mplads_works && candidate.mplads_works.length > 0 ? (
            <div className="flex items-center justify-between py-1 px-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 shadow-2xs">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} weight="duotone" className="text-emerald-600" />
                <span>e-SAKSHI Geotagged Works</span>
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                {candidate.mplads_works.length} Verified
              </span>
            </div>
          ) : null}
        </div>


        {/* Algorithmic Discrepancy Badge */}
        <DiscrepancyBadge
          candidate={candidate}
          onVerify={(label, value) =>
            onVerifyProof(candidate.name, label, value, candidate.pdf_source_url, candidate)
          }
        />
      </div>

      {/* Card Footer with Court-Ready PDF and Proof Inspection */}
      <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-mono text-[11px]">Sworn Filing: {candidate.filing_year}</span>
        <div className="flex items-center gap-2">
          {onOpenShareCard && (
            <button
              onClick={() => onOpenShareCard(candidate)}
              title="Generate 1-Click WhatsApp & Social Report Card Graphic"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95"
            >
              <ShareNetwork size={14} weight="duotone" className="text-emerald-600" />
              <span>Share</span>
            </button>
          )}
          <button
            onClick={() => exportCandidateDossierPdf(candidate)}
            title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95"
          >
            <FilePdf size={14} weight="duotone" className="text-blue-700" />
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
            className="text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-1 active:scale-95"
          >
            <FileMagnifyingGlass size={14} weight="bold" />
            <span>Form 26 Proof →</span>
          </button>
        </div>
      </div>
    </article>
  );
};

