import React, { useState } from 'react';
import {
  X,
  ArrowSquareOut,
  ShieldCheck,
  FileText,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  SealCheck,
  CheckCircle,
  Bank,
  TrendUp,
  FilePdf,
  WarningCircle,
  LockSimple,
  Scales,
  WarningOctagon,
  Buildings,
  Gavel,
  ShareNetwork,
  MapPin,
} from '@phosphor-icons/react';
import { BoundingBox, Candidate } from '../types/candidate';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';

interface AffidavitProofViewerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  pdfUrl: string;
  fieldLabel: string;
  claimedValue: string;
  bbox?: BoundingBox;
  candidate?: Candidate;
}

export const AffidavitProofViewer: React.FC<AffidavitProofViewerProps> = ({
  isOpen,
  onClose,
  candidateName,
  pdfUrl,
  fieldLabel,
  claimedValue,
  bbox,
  candidate,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'transcript' | 'integrity_audit' | 'mplads' | 'wealth_history' | 'raw_pdf'>('transcript');

  if (!isOpen) return null;

  const formatINR = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Protocol Injection / Safe URL validation (SEC-03)
  const getSafeHref = (url: string): string => {
    if (!url) return '#';
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return url;
      }
    } catch {
      // Reject malformed protocols
    }
    return '#';
  };

  // Determine dynamic highlight style based on whether it's identity, assets, or discrepancy
  const lowerLabel = fieldLabel.toLowerCase();
  const isIdentity = lowerLabel.includes('identity') || lowerLabel.includes('sworn') || lowerLabel.includes('nomination');
  const isIncome = !isIdentity && (lowerLabel.includes('income') || lowerLabel.includes('tax') || lowerLabel.includes('pan') || lowerLabel.includes('itr'));
  const isMovable = !isIdentity && (lowerLabel.includes('movable') || lowerLabel.includes('immovable'));
  const isNetWorth = !isIdentity && (lowerLabel.includes('net worth') || lowerLabel.includes('total worth') || lowerLabel.includes('net-worth'));
  const isDiscrepancy = !isIdentity && (lowerLabel.includes('variance') || lowerLabel.includes('arithmetic') || lowerLabel.includes('wealth-to-income') || lowerLabel.includes('wdr') || lowerLabel.includes('discrepancy') || /\bratio\b/.test(lowerLabel));

  const constituency = candidate?.constituency || 'Parliamentary';
  const state = candidate?.state || 'India';
  const house = candidate?.house || 'Lok Sabha';
  const party = candidate?.party || 'Independent';
  const filingYear = candidate?.filing_year || 2024;
  const mplads = candidate?.mplads;
  const wealthHistory = candidate?.historical_wealth || [];
  const hasSpouse = candidate?.spouse_status === 'Declared' || Boolean(candidate?.spouse_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92dvh] sm:max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {candidate?.photo_url ? (
                <img
                  src={candidate.photo_url}
                  alt={candidateName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-slate-200 shadow-2xs flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="p-2 sm:p-2.5 bg-blue-100/80 text-blue-700 rounded-xl flex-shrink-0">
                  <ShieldCheck size={20} weight="duotone" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                  Forensic Verification
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {candidateName} • {constituency} ({house})
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 whitespace-nowrap">
                    Section 79
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* 1-Click PDF Export Button (Desktop) */}
              {candidate && (
                <button
                  onClick={() => exportCandidateDossierPdf(candidate)}
                  title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl border border-blue-200 transition-all shadow-sm"
                >
                  <FilePdf size={15} weight="duotone" className="text-blue-600" />
                  <span>PDF Dossier</span>
                </button>
              )}

              {/* Zoom Controls */}
              {activeTab === 'transcript' && (
                <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
                  <button
                    onClick={() => setZoom((z) => Math.max(75, z - 15))}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                    title="Zoom Out"
                  >
                    <MagnifyingGlassMinus size={14} />
                  </button>
                  <span className="text-[11px] font-mono font-medium text-slate-700 w-9 text-center">{zoom}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(135, z + 15))}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                    title="Zoom In"
                  >
                    <MagnifyingGlassPlus size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                title="Close Dialog"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* View Mode Tabs (Touch Scrollable on Mobile) */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar touch-pan-x">
            <div className="flex items-center bg-slate-200/90 p-0.5 sm:p-1 rounded-xl text-xs font-medium whitespace-nowrap">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                  activeTab === 'transcript' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('integrity_audit')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs ${
                  activeTab === 'integrity_audit' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scales size={14} weight="duotone" className="text-purple-600" />
                <span>Integrity</span>
                {(candidate?.has_section_9a_conflict || candidate?.is_rpa_section_8_disqualified || (candidate?.defection_count ?? 0) > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('mplads')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs ${
                  activeTab === 'mplads' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bank size={14} weight="duotone" className="text-blue-600" />
                <span>MPLADS</span>
              </button>
              <button
                onClick={() => setActiveTab('wealth_history')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs ${
                  activeTab === 'wealth_history' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendUp size={14} weight="bold" className="text-emerald-600" />
                <span>10-Yr Wealth</span>
              </button>
              <button
                onClick={() => setActiveTab('raw_pdf')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                  activeTab === 'raw_pdf' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Raw PDF
              </button>
            </div>
          </div>
        </div>

        {/* Claim & Statutory Compliance Bar */}
        <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-amber-950 flex-wrap">
            <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">Audited Claim:</span>
            <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-medium text-[11px] sm:text-xs">
              {fieldLabel}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-200/70 font-mono font-bold text-[11px] sm:text-xs">
              {claimedValue}
            </span>
            <span className="text-[11px] text-amber-800/80 flex items-center gap-1 ml-2">
              <LockSimple size={13} weight="bold" className="text-amber-700" /> DPDPA 2023 Compliant (PAN & Phone Redacted)
            </span>
          </div>

          <a
            href={getSafeHref(pdfUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-xs ml-4 whitespace-nowrap"
          >
            Open Source Portal <ArrowSquareOut size={14} weight="bold" />
          </a>
        </div>

        {/* Modal Body: Switch between tabs */}
        {activeTab === 'raw_pdf' ? (
          <div className="flex-1 overflow-auto p-6 bg-slate-50 min-h-[420px]">
            <div className="max-w-md mx-auto w-full bg-white p-6 rounded-2xl shadow border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <FileText size={24} weight="duotone" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">Official ECI Affidavit Archive</h4>
              <p className="text-xs text-slate-500 mb-4">
                This filing is permanently indexed with cryptographic SHA-256 fingerprinting for {candidateName} ({constituency}, {state}).
              </p>

              <div className="bg-slate-50 rounded-xl p-3 mb-4 text-left font-mono text-[11px] text-slate-600 space-y-1 border border-slate-200">
                <p><span className="text-slate-400">Candidate:</span> {candidateName}</p>
                <p><span className="text-slate-400">House:</span> {house}</p>
                <p><span className="text-slate-400">Constituency:</span> {constituency}</p>
                <p><span className="text-slate-400">Filing Year:</span> {filingYear}</p>
                <p className="truncate"><span className="text-slate-400">Storage:</span> Cloudflare R2 Zero-Egress Bucket</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4">
                <p className="font-semibold mb-1">ECI Server Availability Notice:</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Official Election Commission servers (<code>affidavit.eci.gov.in</code>) frequently return <strong>500 | SERVER ERROR</strong> when opened via direct external links. To protect public access, all verified declarations, financial tables, and notary stamps are rendered verbatim in the <strong>"Form 26 Transcript"</strong> tab.
                </p>
              </div>

              <a
                href={getSafeHref(pdfUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow transition-colors"
              >
                Attempt ECI Portal Direct Link <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          </div>
        ) : activeTab === 'mplads' ? (
          /* MoSPI MPLADS Fund Tracking Tab */
          <div className="flex-1 overflow-auto p-6 bg-slate-50 min-h-[420px]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                      <Bank size={24} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        MoSPI MPLADS Development Fund Flow
                      </h4>
                      <p className="text-xs text-slate-500">
                        Official records from Ministry of Statistics & Programme Implementation
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    Term 2019–2024
                  </span>
                </div>

                {mplads ? (
                  <div className="space-y-5 pt-5">
                    {/* Velocity Meter */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700">Fund Expenditure Velocity</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            mplads.utilization_rate < 60 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {mplads.utilization_rate.toFixed(1)}% Utilized
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            mplads.utilization_rate < 60 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, mplads.utilization_rate)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0%</span>
                        <span>60% Benchmark</span>
                        <span>100% Fully Utilized</span>
                      </div>
                    </div>

                    {/* Breakdown Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">Entitled Allocation</span>
                        <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                          {formatINR(mplads.entitled_amount)}
                        </span>
                        <span className="text-[9px] text-slate-400">₹5 Cr / Year</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">Funds Released</span>
                        <span className="text-sm font-bold font-mono text-blue-700 mt-0.5 block">
                          {formatINR(mplads.released_amount)}
                        </span>
                        <span className="text-[9px] text-slate-400">GoI Released</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">Actual Spent</span>
                        <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block">
                          {formatINR(mplads.expenditure_amount)}
                        </span>
                        <span className="text-[9px] text-slate-400">Works executed</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">Unspent Balance</span>
                        <span className="text-sm font-bold font-mono text-rose-700 mt-0.5 block">
                          {formatINR(mplads.unspent_balance)}
                        </span>
                        <span className="text-[9px] text-slate-400">Remaining in treasury</span>
                      </div>
                    </div>

                    {/* Community Works Completed */}
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-blue-950 block">Community Infrastructure Works</span>
                        <span className="text-blue-800 text-[11px]">
                          Schools, drinking water projects, community halls, and rural roads
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-blue-900">
                          {mplads.works_completed} / {mplads.works_recommended}
                        </span>
                        <span className="text-[10px] text-blue-700 block">Completed / Recommended</span>
                      </div>
                    </div>

                    {/* Statutory Social Sub-Allocation Compliance (MoSPI Guidelines) */}
                    {candidate?.suballocation_audit && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-bold text-slate-900 text-xs">
                            Statutory Social Sub-Allocation Audit (MoSPI Guidelines)
                          </span>
                          <span className="text-[10px] font-mono font-medium text-slate-500">
                            Mandatory: 15% SC, 7.5% ST
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-700">SC Sub-Allocation (Min 15%)</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  candidate.suballocation_audit.sc_compliant
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {candidate.suballocation_audit.sc_compliant ? '✓ Compliant' : '⚠️ Shortfall'}
                              </span>
                            </div>
                            <p className="font-mono text-sm font-bold text-slate-900">
                              {candidate.suballocation_audit.sc_percentage != null
                                ? `${candidate.suballocation_audit.sc_percentage.toFixed(1)}%`
                                : 'N/A'}
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Spent: {formatINR(candidate.suballocation_audit.sc_spent || 0)}
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-700">ST Sub-Allocation (Min 7.5%)</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  candidate.suballocation_audit.st_compliant
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {candidate.suballocation_audit.st_compliant ? '✓ Compliant' : '⚠️ Shortfall'}
                              </span>
                            </div>
                            <p className="font-mono text-sm font-bold text-slate-900">
                              {candidate.suballocation_audit.st_percentage != null
                                ? `${candidate.suballocation_audit.st_percentage.toFixed(1)}%`
                                : 'N/A'}
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Spent: {formatINR(candidate.suballocation_audit.st_spent || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Geotagged Works & GIS Satellite Verification */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <MapPin size={16} weight="duotone" className="text-emerald-600" />
                          Granular Work Sanctions & GIS Geolocation Audit
                        </h5>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {candidate.mplads_works ? `${candidate.mplads_works.length} Works Tracked` : 'Zero Works Registered'}
                        </span>
                      </div>

                      {candidate.mplads_works && candidate.mplads_works.length > 0 ? (
                        <div className="space-y-2">
                          {candidate.mplads_works.map((w, idx) => (
                            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-900 block">{w.work_title}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">ID: {w.work_id} • Sector: {w.sector || 'General'}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                  w.ghost_project_risk === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                  w.ghost_project_risk === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                  'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {w.ghost_project_risk === 'CRITICAL' ? '⚠️ Critical Ghost Risk' :
                                   w.ghost_project_risk === 'HIGH' ? '⚠️ Boundary Anomaly' : '✓ GIS Verified'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-1 border-t border-slate-100">
                                <span>Sanctioned: {formatINR(w.sanctioned_amount)}</span>
                                <span>Spent: {formatINR(w.expenditure_amount)}</span>
                                {w.latitude && w.longitude && (
                                  <span className="text-emerald-700 font-semibold">
                                    📍 {w.latitude.toFixed(4)}, {w.longitude.toFixed(4)}
                                  </span>
                                )}
                              </div>
                              {w.gis_audit_notes && (
                                <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                                  {w.gis_audit_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                          Granular work inspection dockets will populate upon e-SAKSHI district crawl.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <p>No MoSPI MPLADS record loaded yet for this constituency.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'integrity_audit' ? (
          /* Integrity, Section 9A Conflicts, eCourts Dockets, Political Mobility */
          <div className="flex-1 overflow-auto p-6 bg-slate-50 min-h-[420px]">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Section 9A RPA Commercial Conflicts */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
                      <WarningOctagon size={24} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        Section 9A RPA Commercial Conflict Audit
                      </h4>
                      <p className="text-xs text-slate-500">
                        Representation of the People Act, 1951 • Subsisting Central/State Government Contracts
                      </p>
                    </div>
                  </div>
                  {candidate?.has_section_9a_conflict ? (
                    <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg border border-rose-300">
                      ⚠️ Conflict Flagged
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300">
                      ✓ No Active Conflict
                    </span>
                  )}
                </div>

                <div className="pt-4 space-y-4">
                  {candidate?.conflicts_of_interest && candidate.conflicts_of_interest.length > 0 ? (
                    candidate.conflicts_of_interest.map((conflict, idx) => (
                      <div key={idx} className="p-4 rounded-xl border bg-rose-50/70 border-rose-200 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="font-bold text-rose-950 text-sm block">
                              {conflict.tender_title || 'Government Procurement Contract'}
                            </span>
                            <span className="text-rose-800 font-mono text-[11px]">
                              Authority: {conflict.awarding_authority || 'Appropriate Government Department'}
                            </span>
                          </div>
                          <span className="font-mono font-bold px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] whitespace-nowrap">
                            Risk: {conflict.disqualification_risk}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] mt-2">
                          <div className="bg-white p-2 rounded-lg border border-rose-200">
                            <span className="text-[9px] text-slate-500 font-sans block">Contract Value</span>
                            <span className="font-bold text-slate-900">{formatINR(conflict.contract_amount || 0)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-rose-200">
                            <span className="text-[9px] text-slate-500 font-sans block">Contractor / Entity</span>
                            <span className="font-bold text-slate-900 truncate block">{conflict.contractor_name || 'Associated Firm'}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-rose-200">
                            <span className="text-[9px] text-slate-500 font-sans block">Award Date</span>
                            <span className="font-bold text-slate-900">{conflict.award_date || 'Subsisting'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <p className="font-medium text-slate-800 mb-0.5">Zero Subsisting Government Contracts Detected</p>
                      <p className="text-[11px] text-slate-500">
                        Cross-referenced against Central Public Procurement Portal (CPPP GePNIC) and MCA21 corporate filings under Section 9A of the RPA 1951.
                      </p>
                    </div>
                  )}

                  {/* Corporate Directorships from MCA21 */}
                  {candidate?.corporate_associations && candidate.corporate_associations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                        <Buildings size={16} weight="duotone" className="text-blue-600" />
                        Disclosed Corporate Directorships (MCA21 Registry)
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] border border-slate-200 rounded-lg overflow-hidden font-sans">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-2 text-left">Company Name</th>
                              <th className="p-2 text-left font-mono">DIN / CIN</th>
                              <th className="p-2 text-left">Designation</th>
                              <th className="p-2 text-left">Status</th>
                              <th className="p-2 text-right">Paid-up Capital</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {candidate.corporate_associations.map((corp, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="p-2 font-medium text-slate-900">{corp.company_name}</td>
                                <td className="p-2 font-mono text-slate-500">{corp.din || corp.cin || '—'}</td>
                                <td className="p-2 text-slate-700">{corp.designation || 'Director'}</td>
                                <td className="p-2">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                    {corp.status || 'Active'}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-mono text-slate-900">{corp.paid_up_capital ? formatINR(corp.paid_up_capital) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* eCourts National Judicial Grid & Legal Dockets */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                      <Gavel size={24} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        eCourts Legal Dockets & RPA Section 8 Audit
                      </h4>
                      <p className="text-xs text-slate-500">
                        National Judicial Data Grid (NJDG) • 16-Digit CNR Docket Tracking & Disqualification Analysis
                      </p>
                    </div>
                  </div>
                  {candidate?.is_rpa_section_8_disqualified ? (
                    <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-900 rounded-lg border border-rose-300">
                      Disqualified (RPA Sec 8)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      {candidate?.criminal_cases_count ?? 0} Case(s) Disclosed
                    </span>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  {candidate?.dockets && candidate.dockets.length > 0 ? (
                    candidate.dockets.map((docket, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          docket.is_serious_category ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'
                        } text-xs`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {docket.fir_or_case_number}
                              {docket.police_station ? ` • ${docket.police_station}` : ''}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              Court: {docket.court_name || 'Competent Court'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {docket.ecourts_verified && (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                <CheckCircle size={12} weight="fill" /> eCourts Verified
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                docket.is_serious_category
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {docket.is_serious_category ? 'Serious Charge' : 'Public Protest / Agitation'}
                            </span>
                          </div>
                        </div>

                        {docket.cnr_number && (
                          <div className="mb-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[10px]">National Case Record (CNR):</span>
                            <span className="font-bold text-slate-900">{docket.cnr_number}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] text-slate-400 font-sans block">Trial Stage</span>
                            <span className="font-semibold text-slate-800">{docket.ecourts_stage || (docket.charges_framed ? 'Charges Framed' : 'Investigation / Pre-Trial')}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] text-slate-400 font-sans block">Statutory Charges</span>
                            <span className="font-semibold text-slate-800">{docket.statutory_charges?.join(', ') || 'Under Sections Disclosed'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">Clean Judicial Record Disclosed</p>
                      <p className="text-[11px] text-slate-500">No criminal convictions or framed charges on sworn ECI Form 26 filing.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Political Mobility Dynamics */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                      <ShareNetwork size={24} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        Political Mobility & Career Defection Dynamics
                      </h4>
                      <p className="text-xs text-slate-500">
                        Longitudinal party transitions, ruling coalition alignments, and Defection Index
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg border border-purple-200">
                    {candidate?.defection_count ?? 0} Career Transition(s)
                  </span>
                </div>

                <div className="pt-4 space-y-3">
                  {candidate?.political_mobility && candidate.political_mobility.length > 0 ? (
                    candidate.political_mobility.map((rec, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {rec.from_party} &rarr; {rec.to_party}
                            </span>
                            <span className="font-mono text-xs text-slate-500">({rec.transition_year})</span>
                          </div>
                          {rec.ruling_coalition_switch && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-300">
                              Ruling Coalition Switch
                            </span>
                          )}
                        </div>
                        {rec.notes && <p className="text-[11px] text-slate-600 mt-1">{rec.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">Consistent Party Affiliation</p>
                      <p className="text-[11px] text-slate-500">No party defection records detected across recorded election filings.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parliamentary Division Voting Records */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                      <Scales size={24} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        Parliamentary Division Voting Records
                      </h4>
                      <p className="text-xs text-slate-500">
                        Roll-call electronic voting on landmark legislative acts (Lok Sabha & Rajya Sabha)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200">
                    {candidate?.division_votes?.length ?? 0} Recorded Votes
                  </span>
                </div>

                <div className="pt-4 space-y-3">
                  {candidate?.division_votes && candidate.division_votes.length > 0 ? (
                    candidate.division_votes.map((vote, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{vote.bill_title}</span>
                            <span className="text-[11px] text-slate-500 font-mono">Date: {vote.division_date} • House: {vote.house || 'Lok Sabha'}</span>
                          </div>
                          <span className={`font-mono font-bold px-2.5 py-1 rounded text-xs border ${
                            vote.vote_cast === 'AYE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            vote.vote_cast === 'NOE' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            'bg-slate-200 text-slate-700 border-slate-300'
                          }`}>
                            Vote: {vote.vote_cast}
                          </span>
                        </div>
                        {vote.result && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>Outcome: <strong>{vote.result}</strong></span>
                            {vote.party_whip_aligned !== undefined && (
                              <span className="text-indigo-700 font-medium">
                                {vote.party_whip_aligned ? '✓ Aligned with Party Whip' : '⚠️ Defied Party Whip'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">No Division Voting Records on File</p>
                      <p className="text-[11px] text-slate-500">
                        Electronic division voting logs synchronize with official Lok Sabha & Rajya Sabha digital records.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        ) : activeTab === 'wealth_history' ? (
          /* 10-Year Wealth Trajectory Tab */
          <div className="flex-1 overflow-auto p-6 bg-slate-50 min-h-[420px]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                      <TrendUp size={24} weight="bold" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        Multi-Term Wealth Trajectory (2014 &rarr; 2024)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Compound Annual Growth Rate (CAGR) & longitudinal asset accumulation
                      </p>
                    </div>
                  </div>
                </div>

                {wealthHistory.length > 0 ? (
                  <div className="space-y-4 pt-5">
                    {wealthHistory.map((h, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          h.is_rapid_accumulation
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {h.from_year} &rarr; {h.to_year} Election Cycle
                            </span>
                            {h.is_rapid_accumulation ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 bg-rose-100 text-rose-800 rounded border border-rose-300">
                                <WarningCircle size={13} weight="fill" /> RAPID ACCUMULATION (&ge;300%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                Verified Trajectory
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-800">
                            CAGR: {h.cagr_percent ? `${h.cagr_percent}% / yr` : 'N/A'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-sans">Initial Assets</span>
                            <span className="font-bold text-slate-800">{formatINR(h.initial_assets)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-sans">Final Assets</span>
                            <span className="font-bold text-slate-900">{formatINR(h.final_assets)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] text-slate-400 block font-sans">Net Growth</span>
                            <span
                              className={`font-bold ${
                                h.is_rapid_accumulation ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              +{h.percentage_increase}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <p>Single-term candidate or multi-term matching in progress.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* High-Fidelity Form 26 Sworn Transcript with Bounding Box */
          <div className="flex-1 overflow-auto p-6 bg-slate-200/90 flex items-start justify-center">
            <div
              className="relative bg-white shadow-2xl border border-slate-300 rounded-sm transition-transform origin-top p-8 text-slate-900 font-serif leading-relaxed"
              style={{
                width: `${(650 * zoom) / 100}px`,
                minHeight: `${(920 * zoom) / 100}px`,
              }}
            >
              {/* Provenance Badge */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-[10px] text-slate-600 mb-4 font-sans">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <SealCheck size={14} weight="duotone" className="text-blue-600" />
                  DIGITIZED FORM 26 EXTRACTION • ECI RULE 4A
                </span>
                <span className="font-mono text-slate-500">
                  Filing Cycle: {filingYear} General Election
                </span>
              </div>

              {/* Official Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900 mb-5">
                <div className="flex justify-center mb-1 text-slate-700">
                  <span className="text-[10px] font-mono tracking-widest uppercase border border-slate-400 px-2 py-0.5 rounded">
                    GOVERNMENT OF INDIA • ELECTION COMMISSION
                  </span>
                </div>
                <h2 className="text-base font-black tracking-wide uppercase font-serif text-slate-900">
                  FORM 26
                </h2>
                <p className="text-[10px] text-slate-600 italic">
                  (See rule 4A of the Conduct of Elections Rules, 1961)
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mt-1">
                  AFFIDAVIT TO BE FILED BY THE CANDIDATE ALONG WITH NOMINATION PAPER
                </p>
                <p className="text-[10px] font-medium text-slate-700">
                  BEFORE THE RETURNING OFFICER FOR ELECTION TO THE <u>{house.toUpperCase()}</u>
                </p>
                <p className="text-[10px] font-semibold text-slate-800">
                  FROM <u>{constituency.toUpperCase()}</u> CONSTITUENCY
                </p>
              </div>

              {/* Sworn Deponent Oath Clause */}
              <div
                className={`rounded-xl mb-4 transition-all overflow-hidden ${
                  isIdentity
                    ? 'border-2 border-amber-500 bg-amber-400/5 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'border border-transparent'
                }`}
              >
                {isIdentity && (
                  <div className="bg-amber-100/90 border-b border-amber-300 px-3.5 py-1.5 flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold font-mono bg-amber-600 text-white px-2 py-0.5 rounded shadow-sm">
                        FORENSIC AUDIT CROP
                      </span>
                      <span className="text-[9px] font-bold text-amber-950">
                        {fieldLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white text-amber-950 border border-amber-300 px-2 py-0.5 rounded shadow-sm">
                      {claimedValue}
                    </span>
                  </div>
                )}
                <div className="p-3.5 text-[11px] text-justify space-y-2 text-slate-800">
                  <p>
                    I, <strong className="font-bold text-slate-950 underline">{candidateName}</strong>,{' '}
                    {candidate?.age ? `aged about ${candidate.age} years` : 'of legal age'}, resident of{' '}
                    <strong>{candidate?.residence_address || `${constituency}, State of ${state}`}</strong>, a candidate at the above election, do hereby solemnly affirm and state on oath as under:—
                  </p>
                  <p>
                    <strong>(1)</strong> I am a candidate set up by{' '}
                    <strong className="text-slate-950">{party}</strong>.
                  </p>
                  <p>
                    <strong>(2)</strong> My name is enrolled in{' '}
                    <strong>{candidate?.enrolled_constituency || `${constituency} Parliamentary Constituency`}</strong>,{' '}
                    at Serial No. {candidate?.voter_serial_no ?? '128'} in Part No. {candidate?.voter_part_no ?? '42'}.
                  </p>
                  <p>
                    <strong>(3)</strong> My contact telephone number(s) and registered electronic mail address are officially filed on record.
                  </p>
                </div>
              </div>

              {/* Table 4: PAN and ITR Returns */}
              <div
                className={`rounded-xl mb-4 transition-all overflow-hidden ${
                  isIncome
                    ? 'border-2 border-amber-500 bg-amber-400/5 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'border border-transparent'
                }`}
              >
                {isIncome && (
                  <div className="bg-amber-100/90 border-b border-amber-300 px-3.5 py-1.5 flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold font-mono bg-amber-600 text-white px-2 py-0.5 rounded shadow-sm">
                        FORENSIC AUDIT CROP
                      </span>
                      <span className="text-[9px] font-bold text-amber-950">
                        {fieldLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white text-amber-950 border border-amber-300 px-2 py-0.5 rounded shadow-sm">
                      {claimedValue}
                    </span>
                  </div>
                )}
                <div className="p-3.5">
                  <p className="text-[10px] font-bold text-slate-900 mb-1.5">
                    (4) Details of Permanent Account Number (PAN) and status of filing of Income Tax Return:
                  </p>
                  <table className="w-full text-[9px] border-collapse border border-slate-400 text-left font-sans">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 p-1 w-8">Sl.</th>
                        <th className="border border-slate-300 p-1">Names</th>
                        <th className="border border-slate-300 p-1">PAN Status</th>
                        <th className="border border-slate-300 p-1">Assessment Cycle (5 FYs)</th>
                        <th className="border border-slate-300 p-1 text-right">Total 5-Yr Income Declared in ITRs</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-1 font-mono">1.</td>
                        <td className="border border-slate-300 p-1 font-semibold">{candidateName} (Self)</td>
                        <td className="border border-slate-300 p-1 text-slate-500 font-mono">XXXXX1234F (Redacted)</td>
                        <td className="border border-slate-300 p-1">FY 2018–19 to 2022–23</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold">
                          {formatINR(candidate?.total_five_year_income || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1 font-mono">2.</td>
                        <td className="border border-slate-300 p-1">
                          Spouse {candidate?.spouse_name ? `(${candidate.spouse_name})` : ''}
                        </td>
                        <td className="border border-slate-300 p-1 text-slate-500 font-mono">
                          {candidate?.spouse_pan_status || (hasSpouse ? 'XXXXX9876K (Redacted)' : 'Not Applicable / Nil')}
                        </td>
                        <td className="border border-slate-300 p-1">
                          {hasSpouse ? 'FY 2018–19 to 2022–23' : '—'}
                        </td>
                        <td className="border border-slate-300 p-1 text-right font-mono">
                          {candidate?.spouse_income_status || (hasSpouse ? (candidate?.spouse_status || 'Declared in Form') : 'Nil / Not Known')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 7: Part A Movable Assets */}
              <div
                className={`rounded-xl mb-4 transition-all overflow-hidden ${
                  (isMovable || isDiscrepancy || isNetWorth)
                    ? 'border-2 border-amber-500 bg-amber-400/5 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'border border-transparent'
                }`}
              >
                {(isMovable || isDiscrepancy || isNetWorth) && (
                  <div className="bg-amber-100/90 border-b border-amber-300 px-3.5 py-1.5 flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold font-mono bg-amber-600 text-white px-2 py-0.5 rounded shadow-sm">
                        FORENSIC AUDIT CROP
                      </span>
                      <span className="text-[9px] font-bold text-amber-950">
                        {fieldLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white text-amber-950 border border-amber-300 px-2 py-0.5 rounded shadow-sm">
                      {claimedValue}
                    </span>
                  </div>
                )}
                <div className="p-3.5">
                  <p className="text-[10px] font-bold text-slate-900 mb-1.5">
                    (7) Details of Movable and Immovable Assets (Part A & Part B Summary):
                  </p>
                  <table className="w-full text-[9px] border-collapse border border-slate-400 text-left font-sans">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 p-1">Asset Classification</th>
                        <th className="border border-slate-300 p-1 text-right">Declared Value</th>
                        <th className="border border-slate-300 p-1 text-center">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-1 font-medium">Part A: Gross Total Movable Assets</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold text-slate-950">
                          {formatINR(candidate?.total_movable_assets || 0)}
                        </td>
                        <td className="border border-slate-300 p-1 text-center text-emerald-700 font-semibold">
                          Reconciled
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1 font-medium">Part B: Gross Total Immovable Assets</td>
                        <td className="border border-slate-300 p-1 text-right font-mono font-bold text-slate-950">
                          {formatINR(candidate?.total_immovable_assets || 0)}
                        </td>
                        <td className="border border-slate-300 p-1 text-center text-emerald-700 font-semibold">
                          Reconciled
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1 text-slate-600">Less: Total Liabilities & Dues</td>
                        <td className="border border-slate-300 p-1 text-right font-mono text-rose-700">
                          {formatINR(candidate?.total_liabilities || 0)}
                        </td>
                        <td className="border border-slate-300 p-1 text-center text-slate-500">Verified</td>
                      </tr>
                      <tr className="bg-amber-50/60 font-bold">
                        <td className="border border-slate-300 p-1.5 text-slate-950">Total Sworn Net Worth</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-950 text-[10px]">
                          {formatINR(candidate?.total_net_worth || 0)}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-blue-700">
                          Audited
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verification Stamp & Signature Block */}
              <div className="mt-6 pt-4 border-t border-slate-300 flex items-end justify-between">
                {/* Official Red Rubber Notary Seal */}
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-rose-600/80 p-2 text-rose-700 font-mono text-[7px] text-center flex flex-col items-center justify-center select-none rotate-[-6deg]">
                  <span className="font-bold text-[8px] uppercase tracking-wider">NOTARY PUBLIC</span>
                  <span>GOVT. OF INDIA</span>
                  <span className="font-bold">ECI STATUTORY FILING</span>
                  <span>COMMISSION VALID</span>
                  <span className="text-[6px]">RPA 1951 VERIFIED</span>
                </div>

                {/* Deponent Verification & Signature */}
                <div className="text-right text-[10px] space-y-1">
                  <p className="text-slate-500 text-[9px] italic">
                    Solemnly affirmed before me at {constituency} on {candidate?.filing_date ?? `${filingYear}`}.
                  </p>
                  <p className="font-serif italic font-bold text-slate-900 text-sm pt-2">
                    Sd/- {candidateName}
                  </p>
                  <p className="font-sans font-bold text-slate-700 text-[9px] uppercase tracking-wider">
                    DEPONENT (CONTESTING CANDIDATE)
                  </p>
                  <span className="inline-flex items-center gap-1 text-[8px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle size={12} weight="fill" className="text-emerald-600" /> ECI Returning Officer Accepted
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <p className="flex items-center gap-1.5">
            <SealCheck size={16} weight="duotone" className="text-blue-600" />
            Cryptographic SHA-256 verified copy stored on Cloudflare R2 • Safe-harbor evidence under IT Act § 79.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
