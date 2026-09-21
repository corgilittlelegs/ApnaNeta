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
  CheckCircle,
  WarningCircle,
  Lightbulb,
} from '@phosphor-icons/react';
import { Candidate } from '../types/candidate';
import { DiscrepancyBadge } from './DiscrepancyBadge';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';
import { useViewMode } from '../context/ViewModeContext';
import { CivicTerm } from './CivicTerm';
import {
  CIVIC_IMPACT_BENCHMARKS,
  CIVIC_THRESHOLDS,
  WEALTH_TIERS,
} from '../utils/civicConstants';
import { useCandidatePhoto } from '../utils/wikidataPhoto';

interface CandidateCardProps {
  candidate: Candidate;
  onVerifyProof: (
    candidateName: string,
    fieldLabel: string,
    value: string,
    pdfUrl: string,
    candidate?: Candidate
  ) => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: (candidate: Candidate) => void;
  onOpenShareCard?: (candidate: Candidate) => void;
  onOpenAuditTrace?: (candidate: Candidate) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onVerifyProof,
  isSelectedForComparison = false,
  onToggleComparison,
  onOpenShareCard,
  onOpenAuditTrace,
}) => {
  const { isCitizenMode } = useViewMode();
  const { photoUrl: dynamicPhotoUrl, attribution: photoAttribution } = useCandidatePhoto(
    candidate.name,
    candidate.photo_url
  );

  const cleanInitials =
    candidate.name
      .replace(/\s*\(.*?\)/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || candidate.name.slice(0, 2).toUpperCase();

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const latestWealthGrowth =
    candidate.historical_wealth && candidate.historical_wealth.length > 0
      ? candidate.historical_wealth[candidate.historical_wealth.length - 1]
      : null;

  // Generate 1-line citizen-friendly takeaway
  const generateCitizenSummary = () => {
    const parts: string[] = [];

    // 1. Criminal record assessment
    if (candidate.is_rpa_section_8_disqualified) {
      parts.push('Barred by court conviction');
    } else if (candidate.serious_criminal_cases_count > 0) {
      parts.push(`Faces ${candidate.serious_criminal_cases_count} serious court charge(s)`);
    } else if (candidate.criminal_cases_count > 0) {
      parts.push(`Has ${candidate.criminal_cases_count} protest/agitation FIR(s)`);
    } else {
      parts.push('Clean criminal record');
    }

    // 2. Attendance
    if (candidate.attendance_rate !== undefined) {
      if (candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_HIGH_PERCENT) {
        parts.push(`highly active in Parliament (${candidate.attendance_rate.toFixed(0)}% attendance)`);
      } else if (candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_LOW_PERCENT) {
        parts.push(`average Parliament attendance (${candidate.attendance_rate.toFixed(0)}%)`);
      } else {
        parts.push(`low Parliament attendance (${candidate.attendance_rate.toFixed(0)}%)`);
      }
    }

    // 3. MPLADS Local Fund
    if (candidate.mplads) {
      if (candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_GOOD_SPEND_PERCENT) {
        parts.push(`and spent ${candidate.mplads.utilization_rate.toFixed(0)}% of local development funds`);
      } else if (candidate.mplads.unspent_balance > WEALTH_TIERS.TIER_1CR_TO_10CR) {
        parts.push(`but left ${formatINR(candidate.mplads.unspent_balance)} in local development funds unspent`);
      }
    }

    return parts.join(', ') + '.';
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Banner & Candidate Identity */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 mb-3">
          <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Candidate Avatar */}
            <div className="relative flex-shrink-0">
              {dynamicPhotoUrl ? (
                <img
                  src={dynamicPhotoUrl}
                  alt={candidate.name}
                  title={photoAttribution || `Photo of ${candidate.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 shadow-2xs bg-slate-50"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const next = target.nextElementSibling as HTMLElement;
                    if (next) next.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full items-center justify-center font-bold text-xs text-slate-700 bg-slate-100 border-2 border-slate-200 shadow-2xs ${
                  dynamicPhotoUrl ? 'hidden' : 'flex'
                }`}
              >
                {cleanInitials}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-serif font-bold text-slate-900 text-base sm:text-lg hover:text-blue-700 transition-colors cursor-pointer leading-tight truncate">
                  {candidate.name}
                </h3>
                {candidate.alias && (
                  <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                    "{candidate.alias}"
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-sans line-clamp-1">
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
                    {candidate.state && candidate.state !== 'India'
                      ? candidate.state
                      : candidate.constituency || 'India'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {onToggleComparison && (
              <button
                onClick={() => onToggleComparison(candidate)}
                className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg border transition-all ${
                  isSelectedForComparison
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
                title={isSelectedForComparison ? 'Selected for comparison' : 'Add to head-to-head comparison'}
              >
                {isSelectedForComparison ? (
                  <>
                    <Check size={12} weight="bold" />
                    <span className="hidden sm:inline">Added</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} weight="bold" className="text-blue-600" />
                    <span className="hidden sm:inline">Compare</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg max-w-[90px] sm:max-w-none truncate">
              {candidate.party || 'Independent'}
            </span>
          </div>
        </div>

        {/* CITIZEN MODE: 1-Line Plain Takeaway & Traffic-Light Scorecard */}
        {isCitizenMode && (
          <div className="mb-3.5 space-y-2">
            {/* 1-Line Plain Summary */}
            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                Summary
              </span>
              <p className="leading-relaxed font-sans text-slate-800 text-[11px] sm:text-xs">
                {generateCitizenSummary()}
              </p>
            </div>

            {/* 4 Traffic-Light Ratings */}
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center text-[9px] sm:text-[10px]">
              {/* 1. Crime Traffic Light */}
              <div
                className={`p-1 sm:p-1.5 rounded-lg border font-medium ${
                  candidate.serious_criminal_cases_count > 0 || candidate.is_rpa_section_8_disqualified
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : candidate.criminal_cases_count > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
                title="Criminal record status"
              >
                <span className="block font-bold truncate">
                  {candidate.serious_criminal_cases_count > 0
                    ? '🔴 Serious'
                    : candidate.criminal_cases_count > 0
                    ? '🟡 Agitation'
                    : '🟢 Clean'}
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] text-slate-500">Record</span>
              </div>

              {/* 2. MPLADS Spending Traffic Light */}
              <div
                className={`p-1 sm:p-1.5 rounded-lg border font-medium ${
                  !candidate.mplads
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_FAIR_SPEND_PERCENT
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
                title="Local development fund utilization"
              >
                <span className="block font-bold truncate">
                  {!candidate.mplads
                    ? '⚪ N/A'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_FAIR_SPEND_PERCENT
                    ? '🟢 Good'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT
                    ? '🟡 Fair'
                    : '🔴 Low'}
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] text-slate-500">Local Fund</span>
              </div>

              {/* 3. Parliament Attendance Traffic Light */}
              <div
                className={`p-1 sm:p-1.5 rounded-lg border font-medium ${
                  candidate.attendance_rate === undefined
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_FAIR_PERCENT
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_LOW_PERCENT
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
                title="Parliament attendance rating"
              >
                <span className="block font-bold truncate">
                  {candidate.attendance_rate === undefined
                    ? '⚪ N/A'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_FAIR_PERCENT
                    ? '🟢 Active'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_LOW_PERCENT
                    ? '🟡 Fair'
                    : '🔴 Inactive'}
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] text-slate-500">Attendance</span>
              </div>

              {/* 4. Wealth Discrepancy Traffic Light */}
              <div
                className={`p-1 sm:p-1.5 rounded-lg border font-medium ${
                  candidate.has_anomalous_wealth_ratio ||
                  (latestWealthGrowth && latestWealthGrowth.is_rapid_accumulation)
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : candidate.wealth_discrepancy_ratio && candidate.wealth_discrepancy_ratio > CIVIC_THRESHOLDS.WEALTH_DISCREPANCY_RATIO_MODERATE
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
                title="Wealth growth check"
              >
                <span className="block font-bold truncate">
                  {candidate.has_anomalous_wealth_ratio ||
                  (latestWealthGrowth && latestWealthGrowth.is_rapid_accumulation)
                    ? '🔴 High Gap'
                    : candidate.wealth_discrepancy_ratio && candidate.wealth_discrepancy_ratio > CIVIC_THRESHOLDS.WEALTH_DISCREPANCY_RATIO_MODERATE
                    ? '🟡 Moderate'
                    : '🟢 Normal'}
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] text-slate-500">Wealth</span>
              </div>
            </div>
          </div>
        )}

        {/* Core Financial & Crime Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-100 mb-3 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5 text-[11px] uppercase tracking-wider font-medium">
              {isCitizenMode ? 'Declared Net Worth (कुल संपत्ति)' : 'Declared Net Worth'}
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
              {isCitizenMode ? 'Criminal Record (आपराधिक रिकॉर्ड)' : 'Criminal Record'}
            </span>
            {candidate.is_rpa_section_8_disqualified ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                <WarningOctagon size={15} weight="fill" className="text-rose-700" />
                {isCitizenMode ? 'Barred from Office' : 'Disqualified (RPA Sec 8)'}
              </span>
            ) : candidate.serious_criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <WarningOctagon size={15} weight="duotone" className="text-rose-600" />
                {candidate.serious_criminal_cases_count} Serious Case(s)
              </span>
            ) : candidate.criminal_cases_count > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <Scales size={15} weight="duotone" className="text-amber-600" />
                {candidate.criminal_cases_count} Protest Case(s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck size={15} weight="duotone" className="text-emerald-600" />
                0 Charges Filed
              </span>
            )}
            <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
              {candidate.filing_year}{' '}
              {isCitizenMode ? (
                <CivicTerm term="FORM_26">Affidavit</CivicTerm>
              ) : (
                'Sworn Form 26'
              )}
              {candidate.dockets?.some((d) => d.ecourts_verified) && (
                <span className="text-emerald-700 font-semibold">• eCourts Verified</span>
              )}
            </span>
          </div>
        </div>

        {/* Section 9A Commercial Conflict Alert */}
        {candidate.has_section_9a_conflict && (
          <div className="flex items-center justify-between py-1.5 px-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 mb-3 shadow-2xs">
            <span className="font-bold flex items-center gap-1 text-[11px]">
              <WarningOctagon size={14} weight="fill" className="text-rose-600" />
              {isCitizenMode ? (
                <>
                  <span>Govt Contract Conflict</span>
                  <CivicTerm term="SECTION_9A" />
                </>
              ) : (
                'Section 9A Conflict of Interest Flag'
              )}
            </span>
            <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
              Active Govt Tender
            </span>
          </div>
        )}

        {/* Political Mobility Defection Badge */}
        {candidate.defection_count !== undefined && candidate.defection_count > 0 && (
          <div className="flex items-center justify-between py-1.5 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 mb-3 shadow-2xs">
            <span className="font-medium flex items-center gap-1 text-[11px]">
              <ShareNetwork size={14} weight="duotone" className="text-purple-700" />
              {isCitizenMode ? 'Party Switching History' : 'Political Mobility Dynamics'}
            </span>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded border border-purple-200">
              {candidate.defection_count} Career Party Switch(es)
            </span>
          </div>
        )}

        {/* MPLADS Local Development Fund & Wealth Badges */}
        <div className="space-y-2 mb-3">
          {candidate.mplads && (
            <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-slate-700">
                  <Bank size={15} weight="duotone" className="text-blue-700" />
                  <span className="font-medium">
                    {isCitizenMode ? (
                      <>
                        <span>MP Local Fund (सांसद निधि):</span>
                        <CivicTerm term="MPLADS" />
                      </>
                    ) : (
                      'MPLADS Fund Utilization:'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      candidate.mplads.utilization_rate < CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT ? 'text-rose-700' : 'text-emerald-700'
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
                    candidate.mplads.utilization_rate < CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT ? 'bg-rose-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(candidate.mplads.utilization_rate, 100)}%` }}
                ></div>
              </div>

              {/* CITIZEN MODE: "What This Means For You" Real-World Impact Callout */}
              {isCitizenMode && candidate.mplads.unspent_balance >= CIVIC_IMPACT_BENCHMARKS.MIN_UNSPENT_BALANCE_FOR_CALLOUT && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5">
                  <Lightbulb size={14} weight="fill" className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800">What this unspent fund means:</strong>{' '}
                    {formatINR(candidate.mplads.unspent_balance)} could have funded ~
                    {Math.floor(candidate.mplads.unspent_balance / CIVIC_IMPACT_BENCHMARKS.COST_PER_PRIMARY_CLINIC)} local health clinics or ~
                    {Math.floor(candidate.mplads.unspent_balance / CIVIC_IMPACT_BENCHMARKS.COST_PER_KM_COMMUNITY_INFRA)} km of community solar
                    street lighting.
                  </p>
                </div>
              )}
            </div>
          )}

          {latestWealthGrowth && (
            <div className="flex items-center justify-between py-2 px-3 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-1 text-slate-700">
                <TrendUp size={15} weight="duotone" className="text-emerald-600" />
                <span className="font-medium">
                  {isCitizenMode ? (
                    <>
                      <span>5-Yr Wealth Growth:</span>
                      <CivicTerm term="CAGR" />
                    </>
                  ) : (
                    'Wealth Trajectory:'
                  )}
                </span>
              </div>
              <div>
                {latestWealthGrowth.is_rapid_accumulation ? (
                  <span className="font-mono tabular-nums font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] inline-flex items-center gap-1">
                    ⚠️ +{latestWealthGrowth.percentage_increase}% Rapid Surge
                  </span>
                ) : (
                  <span className="font-mono tabular-nums font-bold text-emerald-800 text-[11px]">
                    +{latestWealthGrowth.percentage_increase}% ({latestWealthGrowth.from_year} &rarr;{' '}
                    {latestWealthGrowth.to_year})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Parliamentary Attendance & Questions */}
          {candidate.attendance_rate !== undefined && (
            <div className="p-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck size={15} weight="duotone" className="text-blue-700" />
                  <span>
                    {isCitizenMode ? 'Parliament Attendance (संसद में हाजिरी):' : 'Sansad Attendance:'}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {candidate.attendance_rate}%
                </span>
              </div>

              {candidate.questions_count !== undefined && candidate.questions_count > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    Questions Asked: <strong>{candidate.questions_count}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-semibold"
                      title="Starred (Oral Questions in Parliament)"
                    >
                      ★ {candidate.starred_questions_count ?? Math.round(candidate.questions_count * 0.1)}{' '}
                      Oral
                    </span>
                    <span
                      className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                      title="Unstarred (Written Replies)"
                    >
                      {candidate.unstarred_questions_count ?? Math.round(candidate.questions_count * 0.9)}{' '}
                      Written
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parliamentary Division Voting Record */}
          {candidate.division_votes && candidate.division_votes.length > 0 && (
            <div className="flex items-center justify-between py-1.5 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 shadow-2xs">
              <span className="flex items-center gap-1">
                <Scales size={15} weight="duotone" className="text-indigo-600" />
                <span className="font-medium">
                  {isCitizenMode ? 'Key Bills Voted:' : 'Division Voting:'}
                </span>
                {isCitizenMode && <CivicTerm term="DIVISION_VOTING" />}
              </span>
              <span className="font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                {candidate.division_votes.length} Landmark Bill(s)
              </span>
            </div>
          )}

          {/* MPLADS GIS & Ghost Project Risk Alert */}
          {candidate.ghost_project_alerts_count !== undefined &&
          candidate.ghost_project_alerts_count > 0 ? (
            <div className="flex items-center justify-between py-1.5 px-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 shadow-2xs">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <WarningOctagon size={14} weight="fill" className="text-rose-600" />
                <span>Location Anomaly Alert</span>
                <CivicTerm term="GHOST_PROJECT" />
              </span>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                {candidate.ghost_project_alerts_count} Flagged Coordinates
              </span>
            </div>
          ) : candidate.mplads_works && candidate.mplads_works.length > 0 ? (
            <div className="flex items-center justify-between py-1 px-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 shadow-2xs">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} weight="duotone" className="text-emerald-600" />
                <span>Geotagged Public Works</span>
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                {candidate.mplads_works.length} Verified
              </span>
            </div>
          ) : null}
        </div>

        {/* Mathematical Discrepancy Badge */}
        <DiscrepancyBadge
          candidate={candidate}
          onVerify={(label, value) =>
            onVerifyProof(candidate.name, label, value, candidate.pdf_source_url, candidate)
          }
        />
      </div>

      {/* Card Footer with Court-Ready PDF and Proof Inspection */}
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50/90 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs text-slate-500">
        <span className="font-mono text-[10.5px] sm:text-[11px] flex-shrink-0">
          Filing: {candidate.filing_year}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {onOpenShareCard && (
            <button
              onClick={() => onOpenShareCard(candidate)}
              title="Generate 1-Click WhatsApp & Social Report Card Graphic"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 text-[11px] sm:text-xs"
            >
              <ShareNetwork size={13} weight="duotone" className="text-emerald-600" />
              <span>Share</span>
            </button>
          )}
          <button
            onClick={() => exportCandidateDossierPdf(candidate)}
            title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 text-[11px] sm:text-xs"
          >
            <FilePdf size={13} weight="duotone" className="text-blue-700" />
            <span className="hidden sm:inline">PDF Dossier</span>
            <span className="sm:hidden">Dossier</span>
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
            className="text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-1 active:scale-95 text-[11px] sm:text-xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Proof →</span>
          </button>
        </div>
      </div>
    </article>
  );
};
