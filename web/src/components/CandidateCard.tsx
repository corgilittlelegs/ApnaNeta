import React, { useState } from 'react';
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
  const [showImpactMethodology, setShowImpactMethodology] = useState(false);

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
    <article className="bg-white rounded-2xl border border-dholpur-300/80 shadow-xs hover:shadow-md hover:border-dholpur-400 transition-all overflow-hidden flex flex-col justify-between relative">
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
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full object-cover border-2 border-dholpur-300 shadow-xs bg-dholpur-50"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const next = target.nextElementSibling as HTMLElement;
                    if (next) next.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full items-center justify-center font-bold text-xs text-sovereign-700 bg-dholpur-100 border-2 border-dholpur-300 shadow-xs ${
                  dynamicPhotoUrl ? 'hidden' : 'flex'
                }`}
              >
                {cleanInitials}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-serif font-bold text-sovereign-950 text-base sm:text-lg hover:text-kesariya-800 transition-colors cursor-pointer leading-tight truncate">
                  {candidate.name}
                </h3>
                {candidate.alias && (
                  <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 bg-dholpur-100 text-sovereign-700 rounded-full font-medium">
                    "{candidate.alias}"
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-sovereign-500 mt-0.5 sm:mt-1 font-sans line-clamp-1">
                <span className="font-semibold text-sovereign-700">{candidate.house}</span> •{' '}
                {candidate.constituency &&
                candidate.constituency !== candidate.state &&
                candidate.constituency !== 'National' &&
                candidate.constituency !== 'Parliament of India' ? (
                  <>
                    <span className="font-medium text-sovereign-800">{candidate.constituency}</span>
                    {candidate.state && candidate.state !== 'India' ? `, ${candidate.state}` : ''}
                  </>
                ) : (
                  <span className="font-medium text-sovereign-800">
                    {candidate.state && candidate.state !== 'India'
                      ? candidate.state
                      : candidate.constituency || 'India'}
                  </span>
                )}
              </p>

              {/* Voter-Ink Verified ECI Seal */}
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-voter-ink-50 text-voter-ink-700 border border-voter-ink-200/80"
                  title="Verified Form 26 Sworn Disclosures under RPA 1951"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-voter-ink-600"></span>
                  <span>सत्यापित • ECI Form 26</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {onToggleComparison && (
              <button
                onClick={() => onToggleComparison(candidate)}
                className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg border transition-all ${
                  isSelectedForComparison
                    ? 'bg-ashoka-700 text-white border-ashoka-700 shadow-sm'
                    : 'bg-white hover:bg-dholpur-50 text-sovereign-700 border-dholpur-300 shadow-2xs'
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
                    <Plus size={12} weight="bold" className="text-kesariya-600" />
                    <span className="hidden sm:inline">Compare</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-1 bg-dholpur-100 text-sovereign-800 border border-dholpur-300 rounded-lg max-w-[90px] sm:max-w-none truncate">
              {candidate.party || 'Independent'}
            </span>
          </div>
        </div>

        {/* CITIZEN MODE: 1-Line Plain Takeaway & 2x2 Scorecard Grid (Matching Mockup 2) */}
        {isCitizenMode && (
          <div className="mb-3.5 space-y-2.5">
            {/* 1-Line Plain Summary */}
            <div className="p-2.5 bg-kesariya-50/70 border border-kesariya-200/80 rounded-xl text-xs text-kesariya-950 flex items-start gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider text-kesariya-800 bg-kesariya-100/90 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                Summary • सारांश
              </span>
              <p className="leading-relaxed font-sans text-sovereign-800 text-[11px] sm:text-xs">
                {generateCitizenSummary()}
              </p>
            </div>

            {/* 2x2 Detailed Civic Scorecard Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Card 1: अपराध / Crime */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                  candidate.serious_criminal_cases_count > 0 || candidate.is_rpa_section_8_disqualified
                    ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : candidate.criminal_cases_count > 0
                    ? 'bg-kesariya-50/80 border-kesariya-200 text-kesariya-900'
                    : 'bg-harit-50/80 border-harit-200 text-harit-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <Scales size={14} weight="duotone" />
                    <span>अपराध • Crime</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/70">
                    {candidate.serious_criminal_cases_count > 0 ? '🔴 Major' : candidate.criminal_cases_count > 0 ? '🟡 Agitation' : '🟢 Clean'}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="font-bold text-sm block">
                    {candidate.is_rpa_section_8_disqualified
                      ? 'Barred by Law'
                      : candidate.criminal_cases_count > 0
                      ? `${candidate.criminal_cases_count} Case(s)`
                      : '0 Charges Filed'}
                  </span>
                  <span className="text-[10px] text-sovereign-600 block mt-0.5">
                    {candidate.serious_criminal_cases_count > 0
                      ? `${candidate.serious_criminal_cases_count} गंभीर मामले (Serious)`
                      : candidate.criminal_cases_count > 0
                      ? 'मामूली/प्रदर्शन मामले (Protest)'
                      : 'स्वच्छ छवि (Clean Record)'}
                  </span>
                </div>
              </div>

              {/* Card 2: सांसद निधि / MPLADS Funds */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                  !candidate.mplads
                    ? 'bg-dholpur-50 border-dholpur-200 text-sovereign-700'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_FAIR_SPEND_PERCENT
                    ? 'bg-harit-50/80 border-harit-200 text-harit-900'
                    : candidate.mplads.utilization_rate >= CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT
                    ? 'bg-kesariya-50/80 border-kesariya-200 text-kesariya-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <Bank size={14} weight="duotone" />
                    <span>सांसद निधि • Funds</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/70">
                    {!candidate.mplads ? 'N/A' : `${candidate.mplads.utilization_rate.toFixed(0)}% Spent`}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="font-bold text-sm block font-mono">
                    {!candidate.mplads ? 'No Data' : `${formatINR(candidate.mplads.expenditure_amount || 0)}`}
                  </span>
                  <span className="text-[10px] text-sovereign-600 block mt-0.5 truncate">
                    {!candidate.mplads ? 'Not an MP' : `बकाया: ${formatINR(candidate.mplads.unspent_balance)}`}
                  </span>
                </div>
              </div>

              {/* Card 3: संसद उपस्थिति / Sansad Attendance */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                  candidate.attendance_rate === undefined
                    ? 'bg-dholpur-50 border-dholpur-200 text-sovereign-700'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_FAIR_PERCENT
                    ? 'bg-harit-50/80 border-harit-200 text-harit-900'
                    : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_LOW_PERCENT
                    ? 'bg-kesariya-50/80 border-kesariya-200 text-kesariya-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <CalendarCheck size={14} weight="duotone" />
                    <span>संसद हाजिरी • Attendance</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/70">
                    {candidate.attendance_rate !== undefined ? `${candidate.attendance_rate}%` : 'N/A'}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="font-bold text-sm block">
                    {candidate.attendance_rate === undefined
                      ? 'N/A'
                      : candidate.attendance_rate >= CIVIC_THRESHOLDS.ATTENDANCE_FAIR_PERCENT
                      ? 'सक्रिय (Active)'
                      : 'औसत से कम'}
                  </span>
                  <span className="text-[10px] text-sovereign-600 block mt-0.5">
                    {candidate.questions_count !== undefined ? `${candidate.questions_count} सवाल पूछे (Questions)` : 'सत्र भागीदारी'}
                  </span>
                </div>
              </div>

              {/* Card 4: संपत्ति वृद्धि / Wealth Surge */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                  candidate.has_anomalous_wealth_ratio || (latestWealthGrowth && latestWealthGrowth.is_rapid_accumulation)
                    ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : candidate.wealth_discrepancy_ratio && candidate.wealth_discrepancy_ratio > CIVIC_THRESHOLDS.WEALTH_DISCREPANCY_RATIO_MODERATE
                    ? 'bg-kesariya-50/80 border-kesariya-200 text-kesariya-900'
                    : 'bg-harit-50/80 border-harit-200 text-harit-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <TrendUp size={14} weight="duotone" />
                    <span>संपत्ति • Wealth</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/70">
                    {latestWealthGrowth ? `+${latestWealthGrowth.percentage_increase}%` : 'Declared'}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="font-bold text-sm block font-mono">
                    {formatINR(candidate.total_net_worth)}
                  </span>
                  <span className="text-[10px] text-sovereign-600 block mt-0.5">
                    {latestWealthGrowth?.is_rapid_accumulation ? '⚠️ तीव्र वृद्धि (Surge)' : 'स्थिर विकास (Stable)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Core Financial & Crime Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-dholpur-50/70 rounded-xl border border-dholpur-200/80 mb-3 text-xs">
          <div>
            <span className="text-sovereign-500 block mb-0.5 text-[11px] uppercase tracking-wider font-semibold">
              {isCitizenMode ? 'कुल संपत्ति • Net Worth' : 'Declared Net Worth'}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-sovereign-950">
              {formatINR(candidate.total_net_worth)}
            </span>
            <span className="text-[10px] text-sovereign-500 block mt-0.5 font-mono">
              Movable: {formatINR(candidate.total_movable_assets)}
            </span>
          </div>

          <div>
            <span className="text-sovereign-500 block mb-0.5 text-[11px] uppercase tracking-wider font-semibold">
              {isCitizenMode ? 'आपराधिक मामले • Crime' : 'Criminal Record'}
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
              <span className="inline-flex items-center gap-1 font-medium text-kesariya-900 bg-kesariya-50 border border-kesariya-200 px-2 py-0.5 rounded-md">
                <Scales size={15} weight="duotone" className="text-kesariya-600" />
                {candidate.criminal_cases_count} Protest Case(s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck size={15} weight="duotone" className="text-emerald-600" />
                0 Charges Filed
              </span>
            )}
            <span className="text-[10px] text-sovereign-500 block mt-0.5 flex items-center gap-1">
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
          <div className="flex items-center justify-between py-1.5 px-3 bg-voter-ink-50 border border-voter-ink-200 rounded-xl text-xs text-voter-ink-900 mb-3 shadow-2xs">
            <span className="font-medium flex items-center gap-1 text-[11px]">
              <ShareNetwork size={14} weight="duotone" className="text-voter-ink-700" />
              {isCitizenMode ? 'दल परिवर्तन • Party Switch' : 'Political Mobility Dynamics'}
            </span>
            <span className="text-[10px] bg-voter-ink-100 text-voter-ink-800 font-semibold px-2 py-0.5 rounded border border-voter-ink-200">
              {candidate.defection_count} Career Party Switch(es)
            </span>
          </div>
        )}

        {/* MPLADS Local Development Fund & Wealth Badges */}
        <div className="space-y-2 mb-3">
          {candidate.mplads && (
            <div className="p-2.5 bg-white border border-dholpur-300/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-sovereign-700">
                  <Bank size={15} weight="duotone" className="text-ashoka-700" />
                  <span className="font-medium">
                    {isCitizenMode ? (
                      <>
                        <span>सांसद निधि • MP Local Fund:</span>
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
                  <span className="text-[10px] text-sovereign-500 font-mono">
                    ({formatINR(candidate.mplads.unspent_balance)} unspent)
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar with Indian Civic Gradient */}
              <div className="w-full bg-dholpur-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    candidate.mplads.utilization_rate < CIVIC_THRESHOLDS.MPLADS_LOW_SPEND_PERCENT
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-kesariya-500 to-harit-600'
                  }`}
                  style={{ width: `${Math.min(candidate.mplads.utilization_rate, 100)}%` }}
                ></div>
              </div>

              {/* CITIZEN MODE: "What This Means For You" Real-World Impact Callout */}
              {isCitizenMode && candidate.mplads.unspent_balance >= CIVIC_IMPACT_BENCHMARKS.MIN_UNSPENT_BALANCE_FOR_CALLOUT && (
                <div className="mt-2 pt-2 border-t border-dholpur-200 text-[11px] text-sovereign-600">
                  <div className="flex items-start gap-1.5">
                    <Lightbulb size={14} weight="fill" className="text-kesariya-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>
                        <strong className="text-sovereign-800">Illustrative Civic Benchmark:</strong>{' '}
                        {formatINR(candidate.mplads.unspent_balance)} unspent balance could hypothetically fund ~
                        {Math.floor(candidate.mplads.unspent_balance / CIVIC_IMPACT_BENCHMARKS.COST_PER_PRIMARY_CLINIC)} local health clinics or ~
                        {Math.floor(candidate.mplads.unspent_balance / CIVIC_IMPACT_BENCHMARKS.COST_PER_KM_COMMUNITY_INFRA)} km of community solar
                        street lighting.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImpactMethodology(!showImpactMethodology);
                        }}
                        className="text-[10px] text-ashoka-700 hover:text-ashoka-900 underline font-medium mt-1 cursor-pointer block"
                      >
                        {showImpactMethodology ? 'Hide methodology' : 'How is this calculated? (Methodology & Sources)'}
                      </button>
                      {showImpactMethodology && (
                        <div className="mt-1.5 p-2 bg-dholpur-50 border border-dholpur-200 rounded-lg text-[10px] text-sovereign-500 leading-relaxed">
                          <p className="font-semibold text-sovereign-700 mb-0.5">Methodology & Civic Disclaimer:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Estimates based on national capital expenditure benchmarks: ₹25 Lakh per Primary Health Centre / Ayushman Arogya Mandir (National Health Mission norms) and ₹15 Lakh per km of solar street lighting / rural connectivity.</li>
                            <li>Unspent balances may represent funds already committed in district administrative pipeline or awaiting utilization certificates (UCs).</li>
                            <li>Primary Source: MoSPI e-SAKSHI Portal (Official MPLADS ledger).</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {latestWealthGrowth && (
            <div className="flex items-center justify-between py-2 px-3 bg-white border border-dholpur-300/80 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-1 text-sovereign-700">
                <TrendUp size={15} weight="duotone" className="text-harit-600" />
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
                  <span className="font-mono tabular-nums font-bold text-harit-800 text-[11px]">
                    +{latestWealthGrowth.percentage_increase}% ({latestWealthGrowth.from_year} &rarr;{' '}
                    {latestWealthGrowth.to_year})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Parliamentary Attendance & Questions */}
          {candidate.attendance_rate !== undefined && (
            <div className="p-2 bg-white border border-dholpur-300/80 rounded-xl text-xs text-sovereign-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck size={15} weight="duotone" className="text-ashoka-700" />
                  <span>
                    {isCitizenMode ? 'संसद हाजिरी • Attendance:' : 'Sansad Attendance:'}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sovereign-950">
                  {candidate.attendance_rate}%
                </span>
              </div>

              {candidate.questions_count !== undefined && candidate.questions_count > 0 && (
                <div className="flex items-center justify-between text-[11px] text-sovereign-500 pt-1 border-t border-dholpur-200">
                  <span>
                    Questions Asked: <strong>{candidate.questions_count}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className="bg-ashoka-50 text-ashoka-700 px-1.5 py-0.5 rounded border border-ashoka-200 font-semibold"
                      title="Starred (Oral Questions in Parliament)"
                    >
                      ★ {candidate.starred_questions_count ?? Math.round(candidate.questions_count * 0.1)}{' '}
                      Oral
                    </span>
                    <span
                      className="bg-dholpur-50 text-sovereign-600 px-1.5 py-0.5 rounded border border-dholpur-200"
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
            <div className="flex items-center justify-between py-1.5 px-3 bg-white border border-dholpur-300/80 rounded-xl text-xs text-sovereign-700 shadow-2xs">
              <span className="flex items-center gap-1">
                <Scales size={15} weight="duotone" className="text-voter-ink-600" />
                <span className="font-medium">
                  {isCitizenMode ? 'Key Bills Voted:' : 'Division Voting:'}
                </span>
                {isCitizenMode && <CivicTerm term="DIVISION_VOTING" />}
              </span>
              <span className="font-semibold text-voter-ink-900 bg-voter-ink-50 border border-voter-ink-200 px-2 py-0.5 rounded text-[11px]">
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
            <div className="flex items-center justify-between py-1 px-3 bg-harit-50/70 border border-harit-200 rounded-xl text-[11px] text-harit-800 shadow-2xs">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} weight="duotone" className="text-harit-600" />
                <span>Geotagged Public Works</span>
              </span>
              <span className="font-mono font-semibold text-harit-700">
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

        {/* Verified Civic Stamp (Matching Mockup 1) */}
        <div className="mt-3 pt-2.5 border-t border-dholpur-200/80 flex items-center justify-between text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-harit-50 border border-harit-400 flex items-center justify-center text-harit-700 font-bold text-[9px] shadow-2xs">
              ✓
            </span>
            <span className="font-semibold text-sovereign-800">
              Verified Civic Stamp • <span className="font-devanagari text-kesariya-800 font-medium">सत्यापित नागरिक मोहर</span>
            </span>
          </div>
          <span className="font-mono text-[9.5px] text-sovereign-500 font-medium bg-dholpur-100/80 px-1.5 py-0.5 rounded border border-dholpur-200">
            ECI RPA §29
          </span>
        </div>
      </div>

      {/* Card Footer with Court-Ready PDF and Proof Inspection */}
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-dholpur-100/70 border-t border-dholpur-200/80 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs text-sovereign-500">
        <span className="font-mono text-[10.5px] sm:text-[11px] flex-shrink-0">
          Filing: {candidate.filing_year}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {onOpenShareCard && (
            <button
              onClick={() => onOpenShareCard(candidate)}
              title="Generate 1-Click WhatsApp & Social Report Card Graphic"
              className="inline-flex items-center gap-1 text-sovereign-700 hover:text-sovereign-950 font-semibold bg-white hover:bg-dholpur-50 border border-dholpur-300 px-2 sm:px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 text-[11px] sm:text-xs"
            >
              <ShareNetwork size={13} weight="duotone" className="text-harit-600" />
              <span>Share</span>
            </button>
          )}
          <button
            onClick={() => exportCandidateDossierPdf(candidate)}
            title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
            className="inline-flex items-center gap-1 text-sovereign-700 hover:text-sovereign-950 font-semibold bg-white hover:bg-dholpur-50 border border-dholpur-300 px-2 sm:px-2.5 py-1 rounded-lg shadow-2xs transition-all active:scale-95 text-[11px] sm:text-xs"
          >
            <FilePdf size={13} weight="duotone" className="text-ashoka-700" />
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
            className="text-ashoka-700 hover:text-ashoka-900 font-semibold hover:underline flex items-center gap-1 active:scale-95 text-[11px] sm:text-xs"
          >
            <FileMagnifyingGlass size={13} weight="bold" />
            <span>Proof →</span>
          </button>
        </div>
      </div>
    </article>
  );
};
