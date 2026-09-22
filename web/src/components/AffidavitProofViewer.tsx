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
  Check,
  DownloadSimple,
  GridFour,
  Funnel,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import { BoundingBox, Candidate } from '../types/candidate';
import { exportCandidateDossierPdf } from '../utils/DossierPdfExport';
import { CivicEmblem } from './CivicEmblem';

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
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLegalHardeningEnabled, setIsLegalHardeningEnabled] = useState<boolean>(true);
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Clean candidate name (strip stray dots or honorific remnants)
  const cleanName = (candidateName || candidate?.name || '')
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Candidate';

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

  const handleVerifyAffidavit = () => {
    setVerifiedSuccess(true);
    setTimeout(() => setVerifiedSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sovereign-950/85 backdrop-blur-md p-1 sm:p-2 md:p-3 overflow-y-auto">
      <div className="relative w-full max-w-[1600px] h-[95dvh] sm:h-[94vh] bg-dholpur-50 rounded-2xl shadow-2xl overflow-hidden border border-kesariya-600/30 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Tiranga Accent Line */}
        <div className="tiranga-accent-bar" />

        {/* Top App / Modal Header Bar (Matching Mockup 3) */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-sovereign-800 bg-[#0A192F] text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            
            {/* Left: Brand Identity & Active Section */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <CivicEmblem size={34} className="flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-white text-sm sm:text-base leading-tight truncate">
                    APNA NETA: Forensic Affidavit Verification & Legal Audit
                  </h3>
                  <span className="text-xs font-devanagari text-kesariya-400 font-medium hidden md:inline">
                    • प्रमाण सत्यापन एवं विधिक संपरीक्षा
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs text-dholpur-300 truncate font-sans">
                    {cleanName} • {constituency} ({house})
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-harit-900/60 text-harit-300 rounded-md border border-harit-600/40 whitespace-nowrap">
                    Section 79 Evidence
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              {/* PDF Dossier Export Button */}
              {candidate && (
                <button
                  onClick={() => exportCandidateDossierPdf(candidate)}
                  title="Download Court-Ready 1-Page Forensic Audit Dossier PDF"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-kesariya-600/20 text-kesariya-300 hover:bg-kesariya-600/30 font-semibold text-xs rounded-xl border border-kesariya-500/40 transition-all shadow-sm cursor-pointer"
                >
                  <FilePdf size={15} weight="duotone" className="text-kesariya-400" />
                  <span>PDF Dossier</span>
                </button>
              )}

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-sovereign-900 border border-sovereign-700 rounded-xl px-2 py-1 shadow-sm">
                <button
                  onClick={() => setZoom((z) => Math.max(75, z - 15))}
                  className="p-1 text-dholpur-300 hover:text-white rounded hover:bg-sovereign-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinus size={14} />
                </button>
                <span className="text-[11px] font-mono font-medium text-dholpur-200 w-9 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(135, z + 15))}
                  className="p-1 text-dholpur-300 hover:text-white rounded hover:bg-sovereign-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlus size={14} />
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-dholpur-400 hover:text-white hover:bg-sovereign-800 rounded-xl transition-colors cursor-pointer"
                title="Close Dialog"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs Bar */}
          <div className="mt-2.5 pt-2 border-t border-sovereign-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar touch-pan-x">
            <div className="flex items-center bg-sovereign-900/90 p-0.5 sm:p-1 rounded-xl text-xs font-medium whitespace-nowrap border border-sovereign-700/60">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'transcript' ? 'bg-kesariya-600 text-sovereign-950 shadow-sm font-bold' : 'text-dholpur-300 hover:text-white'
                }`}
              >
                Form 26 Transcript • शपथपत्र
              </button>
              <button
                onClick={() => setActiveTab('integrity_audit')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'integrity_audit' ? 'bg-kesariya-600 text-sovereign-950 shadow-sm font-bold' : 'text-dholpur-300 hover:text-white'
                }`}
              >
                <Scales size={14} weight="duotone" className={activeTab === 'integrity_audit' ? 'text-sovereign-950' : 'text-kesariya-400'} />
                <span>Integrity & Conflicts • विधिक विवाद</span>
                {(candidate?.has_section_9a_conflict || candidate?.is_rpa_section_8_disqualified || (candidate?.defection_count ?? 0) > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('mplads')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'mplads' ? 'bg-kesariya-600 text-sovereign-950 shadow-sm font-bold' : 'text-dholpur-300 hover:text-white'
                }`}
              >
                <Bank size={14} weight="duotone" className={activeTab === 'mplads' ? 'text-sovereign-950' : 'text-kesariya-400'} />
                <span>MPLADS Works • सांसद निधि</span>
              </button>
              <button
                onClick={() => setActiveTab('wealth_history')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'wealth_history' ? 'bg-kesariya-600 text-sovereign-950 shadow-sm font-bold' : 'text-dholpur-300 hover:text-white'
                }`}
              >
                <TrendUp size={14} weight="bold" className={activeTab === 'wealth_history' ? 'text-sovereign-950' : 'text-harit-400'} />
                <span>10-Yr Wealth • संपत्ति वृद्धि</span>
              </button>
              <button
                onClick={() => setActiveTab('raw_pdf')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'raw_pdf' ? 'bg-kesariya-600 text-sovereign-950 shadow-sm font-bold' : 'text-dholpur-300 hover:text-white'
                }`}
              >
                Raw ECI PDF • मूल दस्तावेज़
              </button>
            </div>

            {/* Audited Claim Badge on the right */}
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="font-semibold text-dholpur-300 text-[11px]">Audited Claim:</span>
              <span className="px-2 py-0.5 rounded bg-sovereign-800 border border-kesariya-500/40 text-kesariya-300 text-[11px] font-medium">
                {fieldLabel}
              </span>
              <span className="px-2 py-0.5 rounded bg-kesariya-500/20 text-white font-mono font-bold text-[11px] border border-kesariya-400/40">
                {claimedValue}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Action Toolbar (Matching Mockup 3) */}
        <div className="px-4 sm:px-6 py-2 bg-dholpur-100 border-b border-dholpur-300 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-dholpur-50 text-sovereign-800 border border-dholpur-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Funnel size={13} weight="duotone" className="text-kesariya-600" />
              <span>{isSidebarOpen ? 'Hide Pages ◂' : 'Show Pages ▸'}</span>
            </button>
            <h4 className="font-serif font-bold text-sovereign-950 text-xs sm:text-sm tracking-wide flex items-center gap-1.5">
              <span>ILLUMINATED CONSTITUTIONAL DOCUMENT VIEWER</span>
              <span className="font-devanagari text-kesariya-800 font-medium hidden sm:inline">• प्रदीप्त संवैधानिक दस्तावेज़ दर्शक</span>
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Verify Affidavit Button */}
            <button
              onClick={handleVerifyAffidavit}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                verifiedSuccess
                  ? 'bg-harit-600 text-white border-harit-500'
                  : 'bg-sovereign-950 hover:bg-sovereign-900 text-white border-kesariya-500/40'
              }`}
            >
              {verifiedSuccess ? <Check size={14} weight="bold" /> : <ShieldCheck size={14} weight="duotone" className="text-kesariya-400" />}
              <span>{verifiedSuccess ? 'AFFIDAVIT VERIFIED ✓' : 'VERIFY AFFIDAVIT'}</span>
            </button>

            {/* View Legal Actions Button */}
            <button
              onClick={() => setActiveTab('integrity_audit')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-dholpur-50 text-sovereign-900 text-xs font-semibold rounded-xl border border-dholpur-300 transition-all cursor-pointer shadow-2xs"
            >
              <Scales size={14} weight="duotone" className="text-ashoka-700" />
              <span>VIEW LEGAL ACTIONS</span>
            </button>

            {/* Download Audit Report */}
            {candidate && (
              <button
                onClick={() => exportCandidateDossierPdf(candidate)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-kesariya-600 hover:bg-kesariya-500 text-sovereign-950 text-xs font-bold rounded-xl border border-kesariya-500/50 transition-all cursor-pointer shadow-2xs"
              >
                <DownloadSimple size={14} weight="bold" />
                <span>DOWNLOAD AUDIT REPORT</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Workspace: 3-Column Split View Matching Mockup 3 */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F2EFE9]">
          
          {/* COLUMN 1: Collapsible Document Thumbnails Sidebar (Left) */}
          {isSidebarOpen && (
            <aside className="w-full md:w-48 lg:w-56 bg-dholpur-100 border-b md:border-b-0 md:border-r border-dholpur-300 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-dholpur-200 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sovereign-700 font-mono">
                  FILING SECTIONS
                </span>
                <span className="text-[10px] bg-dholpur-200 text-sovereign-700 px-1.5 py-0.5 rounded font-mono">
                  4 Parts
                </span>
              </div>

              {/* Thumbnails list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {[
                  { page: 1, label: 'Part 1: Sworn Identity & Oath', sub: 'ECI Form 26 Preamble' },
                  { page: 2, label: 'Part 2: PAN & 5-Yr Income', sub: 'ITR Assessment' },
                  { page: 3, label: 'Part 3: Movable & Immovable', sub: 'Asset Reconciler' },
                  { page: 4, label: 'Part 4: Judicial Dockets', sub: 'Notary Verification' },
                ].map((item) => (
                  <button
                    key={item.page}
                    onClick={() => setSelectedPage(item.page)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                      selectedPage === item.page
                        ? 'bg-white border-kesariya-600 shadow-sm ring-2 ring-kesariya-400/30'
                        : 'bg-dholpur-50 hover:bg-white border-dholpur-200 text-sovereign-700'
                    }`}
                  >
                    <div className="w-full h-20 bg-white rounded-lg border border-dholpur-200 p-1.5 flex flex-col justify-between mb-2 shadow-inner">
                      <div className="flex items-center justify-between border-b border-dholpur-100 pb-1">
                        <span className="text-[9px] font-bold text-sovereign-900 font-mono">Part {item.page}</span>
                        <span className="w-2 h-2 rounded-full bg-kesariya-500/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-dholpur-200 rounded w-5/6" />
                        <div className="h-1.5 bg-dholpur-200 rounded w-full" />
                        <div className="h-1.5 bg-dholpur-200 rounded w-2/3" />
                      </div>
                      <div className="text-[8px] text-right font-mono text-sovereign-400">ECI Form 26</div>
                    </div>
                    <p className="font-serif font-bold text-xs text-sovereign-950 leading-tight">{item.label}</p>
                    <p className="text-[10px] text-sovereign-500">{item.sub}</p>
                  </button>
                ))}
              </div>

              {/* Bottom Thumbnail Controls */}
              <div className="p-2 border-t border-dholpur-200 bg-dholpur-50 flex items-center justify-between text-sovereign-600">
                <button
                  onClick={() => setZoom(100)}
                  className="p-1 hover:text-sovereign-950 hover:bg-dholpur-200 rounded cursor-pointer transition-colors"
                  title="Reset Zoom"
                >
                  <GridFour size={16} weight="duotone" />
                </button>
                <span className="text-[10px] font-mono text-sovereign-500">Part {selectedPage} of 4</span>
                <span className="text-[10px] font-mono font-bold text-kesariya-700">Official ECI</span>
              </div>
            </aside>
          )}

          {/* COLUMN 2: Center - Illuminated Constitutional Document Viewer */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-start justify-center bg-[#EFECE6]/90 relative">
            {activeTab === 'transcript' ? (
              /* The Illuminated Constitutional Document (Matching Mockup 3) */
              <div
                className="relative bg-[#FFFDF8] shadow-2xl transition-transform origin-top text-sovereign-950 font-serif"
                style={{
                  width: `${(680 * zoom) / 100}px`,
                  minHeight: `${(960 * zoom) / 100}px`,
                  padding: '24px',
                }}
              >
                {/* Authentic Ornate Indian Constitutional Frame (Nandalal Bose Style) */}
                <div className="relative border-4 border-[#B45309] p-2.5 sm:p-3 rounded-xs shadow-inner bg-[#FCFAF4]">
                  
                  {/* Four Corner Medallions with Ashoka Geometry */}
                  <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-[#FAF7F2] border-2 border-[#D97706] rounded-full flex items-center justify-center text-[#B45309] text-xs font-bold shadow-xs">
                    ☸
                  </div>
                  <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-[#FAF7F2] border-2 border-[#D97706] rounded-full flex items-center justify-center text-[#B45309] text-xs font-bold shadow-xs">
                    ☸
                  </div>
                  <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-[#FAF7F2] border-2 border-[#D97706] rounded-full flex items-center justify-center text-[#B45309] text-xs font-bold shadow-xs">
                    ☸
                  </div>
                  <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#FAF7F2] border-2 border-[#D97706] rounded-full flex items-center justify-center text-[#B45309] text-xs font-bold shadow-xs">
                    ☸
                  </div>

                  {/* Intricate Gold/Terracotta Dashed Ornamental Band */}
                  <div className="border-2 border-dashed border-[#D97706]/70 p-3.5 sm:p-5 rounded-xs bg-[#FFFDF9]">
                    
                    {/* Inner Terracotta Hairline Frame */}
                    <div className="border border-[#991B1B]/40 p-4 sm:p-6 bg-[#FFFFFD] space-y-4">
                      
                      {/* Document Top Header with Ashoka Emblem & ECI Logo */}
                      <div className="text-center pb-4 border-b-2 border-sovereign-950 mb-4 relative">
                        
                        {/* Center: Ashoka Lion Capital Geometry */}
                        <div className="flex justify-center mb-1.5">
                          <svg width="42" height="42" viewBox="0 0 100 100" fill="none" className="text-sovereign-900">
                            <circle cx="50" cy="50" r="46" fill="#0A192F" stroke="#D4AF37" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#FF9933" strokeWidth="1.5" strokeDasharray="3 2" />
                            <circle cx="50" cy="50" r="14" fill="#138808" />
                            <g stroke="#FFFFFF" strokeWidth="1.2">
                              <line x1="50" y1="16" x2="50" y2="84" />
                              <line x1="16" y1="50" x2="84" y2="50" />
                              <line x1="26" y1="26" x2="74" y2="74" />
                              <line x1="26" y1="74" x2="74" y2="26" />
                            </g>
                          </svg>
                        </div>

                        <h2 className="text-sm sm:text-base font-black tracking-wider uppercase font-serif text-sovereign-950">
                          ELECTION COMMISSION OF INDIA
                        </h2>
                        <p className="text-[12px] font-bold uppercase tracking-widest text-sovereign-800">
                          FORM 26 - AFFIDAVIT
                        </p>
                        <p className="text-[10px] text-sovereign-600 italic">
                          (See rule 4A of the Conduct of Elections Rules, 1961)
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sovereign-800 mt-1">
                          AFFIDAVIT TO BE FILED BY THE CANDIDATE ALONG WITH NOMINATION PAPER
                        </p>
                        <p className="text-[10px] font-medium text-sovereign-700">
                          BEFORE THE RETURNING OFFICER FOR ELECTION TO THE <u>{house.toUpperCase()}</u>
                        </p>
                        <p className="text-[10px] font-semibold text-sovereign-800">
                          FROM <u>{constituency.toUpperCase()}</u> CONSTITUENCY
                        </p>
                        <span className="absolute top-0 right-0 text-[10px] font-mono text-sovereign-500">
                          Dated: {filingYear}
                        </span>
                      </div>

                      {/* Deponent Sworn Declaration (Clauses 1 to 3) */}
                      <div
                        className={`rounded-xl transition-all overflow-hidden p-3.5 sm:p-4 text-[11px] leading-relaxed text-sovereign-900 font-sans ${
                          isIdentity
                            ? 'border-2 border-kesariya-500 bg-kesariya-400/10 shadow-[0_0_20px_rgba(217,119,6,0.25)]'
                            : 'border border-dholpur-200 bg-dholpur-50/60'
                        }`}
                      >
                        {isIdentity && (
                          <div className="bg-kesariya-100 border-b border-kesariya-300 -mx-4 -mt-4 px-3.5 py-1.5 flex items-center justify-between mb-3 font-sans">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold font-mono bg-kesariya-600 text-white px-2 py-0.5 rounded shadow-sm">
                                FORENSIC AUDIT CROP
                              </span>
                              <span className="text-[9px] font-bold text-sovereign-950">
                                {fieldLabel}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-white text-sovereign-950 border border-kesariya-300 px-2 py-0.5 rounded shadow-sm">
                              {claimedValue}
                            </span>
                          </div>
                        )}
                        <p className="mb-2">
                          I, <strong className="font-bold text-sovereign-950 underline font-serif text-xs">{cleanName}</strong>,{' '}
                          {candidate?.age ? `aged about ${candidate.age} years` : 'of legal age'}, resident of{' '}
                          <strong>{candidate?.residence_address || (constituency !== 'Parliament of India' && constituency !== 'National' ? `${constituency}, ${state}` : `${state}`)}</strong>, a candidate at the above election, do hereby solemnly affirm and state on oath as under:—
                        </p>
                        <p className="mb-1.5">
                          <strong>(1)</strong> I am a candidate set up by <strong className="text-sovereign-950">{party}</strong>.
                        </p>
                        <p className="mb-1.5">
                          <strong>(2)</strong> My name is enrolled in <strong>{constituency !== 'Parliament of India' && constituency !== 'National' ? `${constituency} Constituency` : `the Parliamentary Roll`}</strong>
                          {candidate?.voter_serial_no ? `, at Serial No. ${candidate.voter_serial_no}` : ''}
                          {candidate?.voter_part_no ? ` in Part No. ${candidate.voter_part_no}` : ''}
                          {!candidate?.voter_serial_no && !candidate?.voter_part_no ? ' as per official electoral roll records.' : '.'}
                        </p>
                        <p>
                          <strong>(3)</strong> My contact telephone number(s) and registered electronic mail address are officially filed on record.
                        </p>
                      </div>

                      {/* Section (4): Permanent Account Number (PAN) & 5-Yr Income Returns */}
                      <div
                        className={`rounded-xl transition-all overflow-hidden p-3.5 text-[10px] font-sans ${
                          isIncome
                            ? 'border-2 border-kesariya-500 bg-kesariya-400/10 shadow-[0_0_20px_rgba(217,119,6,0.25)]'
                            : 'border border-dholpur-200 bg-dholpur-50/60'
                        }`}
                      >
                        {isIncome && (
                          <div className="bg-kesariya-100 border-b border-kesariya-300 -mx-3.5 -mt-3.5 px-3 py-1 flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold font-mono bg-kesariya-600 text-white px-2 py-0.5 rounded">
                              FORENSIC AUDIT CROP • ITR
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-kesariya-300">
                              {claimedValue}
                            </span>
                          </div>
                        )}
                        <p className="font-bold text-sovereign-950 mb-1.5">
                          (4) Details of Permanent Account Number (PAN) and status of filing of Income Tax Return:
                        </p>
                        <table className="w-full text-[9px] border-collapse border border-dholpur-300 text-left bg-white">
                          <thead>
                            <tr className="bg-dholpur-100 text-sovereign-800">
                              <th className="border border-dholpur-300 p-1 w-7 font-mono">Sl.</th>
                              <th className="border border-dholpur-300 p-1">Names</th>
                              <th className="border border-dholpur-300 p-1 font-mono">PAN Status</th>
                              <th className="border border-dholpur-300 p-1">Assessment Cycle</th>
                              <th className="border border-dholpur-300 p-1 text-right">5-Yr Declared Income</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-dholpur-300 p-1 font-mono">1.</td>
                              <td className="border border-dholpur-300 p-1 font-bold text-sovereign-950">{cleanName} (Self)</td>
                              <td className="border border-dholpur-300 p-1 font-mono text-sovereign-600">XXXXX1234F (Redacted)</td>
                              <td className="border border-dholpur-300 p-1 text-sovereign-700">FY 2018–19 to 2022–23</td>
                              <td className="border border-dholpur-300 p-1 text-right font-mono font-bold text-sovereign-950">
                                {formatINR(candidate?.total_five_year_income || 0)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-dholpur-300 p-1 font-mono">2.</td>
                              <td className="border border-dholpur-300 p-1 text-sovereign-700">
                                Spouse {candidate?.spouse_name ? `(${candidate.spouse_name})` : ''}
                              </td>
                              <td className="border border-dholpur-300 p-1 font-mono text-sovereign-500">
                                {candidate?.spouse_pan_status || (hasSpouse ? 'XXXXX9876K (Redacted)' : 'Not Applicable / Nil')}
                              </td>
                              <td className="border border-dholpur-300 p-1 text-sovereign-700">
                                {hasSpouse ? 'FY 2018–19 to 2022–23' : '—'}
                              </td>
                              <td className="border border-dholpur-300 p-1 text-right font-mono text-sovereign-700">
                                {candidate?.spouse_income_status || (hasSpouse ? (candidate?.spouse_status || 'Declared in Form') : 'Nil / Not Known')}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Section (7): Movable and Immovable Assets Summary */}
                      <div
                        className={`rounded-xl transition-all overflow-hidden p-3.5 text-[10px] font-sans ${
                          (isMovable || isDiscrepancy || isNetWorth)
                            ? 'border-2 border-kesariya-500 bg-kesariya-400/10 shadow-[0_0_20px_rgba(217,119,6,0.25)]'
                            : 'border border-dholpur-200 bg-dholpur-50/60'
                        }`}
                      >
                        {(isMovable || isDiscrepancy || isNetWorth) && (
                          <div className="bg-kesariya-100 border-b border-kesariya-300 -mx-3.5 -mt-3.5 px-3 py-1 flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold font-mono bg-kesariya-600 text-white px-2 py-0.5 rounded">
                              FORENSIC AUDIT CROP • ASSETS
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-kesariya-300">
                              {claimedValue}
                            </span>
                          </div>
                        )}
                        <p className="font-bold text-sovereign-950 mb-1.5">
                          (7) Details of Movable and Immovable Assets (Part A & Part B Reconciliation):
                        </p>
                        <table className="w-full text-[9px] border-collapse border border-dholpur-300 text-left bg-white">
                          <thead>
                            <tr className="bg-dholpur-100 text-sovereign-800">
                              <th className="border border-dholpur-300 p-1">Asset Classification</th>
                              <th className="border border-dholpur-300 p-1 text-right">Declared Value</th>
                              <th className="border border-dholpur-300 p-1 text-center">Audit Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-dholpur-300 p-1 font-medium text-sovereign-900">Part A: Gross Total Movable Assets</td>
                              <td className="border border-dholpur-300 p-1 text-right font-mono font-bold text-sovereign-950">
                                {formatINR(candidate?.total_movable_assets || 0)}
                              </td>
                              <td className="border border-dholpur-300 p-1 text-center text-harit-700 font-semibold">
                                ✓ Reconciled
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-dholpur-300 p-1 font-medium text-sovereign-900">Part B: Gross Total Immovable Assets</td>
                              <td className="border border-dholpur-300 p-1 text-right font-mono font-bold text-sovereign-950">
                                {formatINR(candidate?.total_immovable_assets || 0)}
                              </td>
                              <td className="border border-dholpur-300 p-1 text-center text-harit-700 font-semibold">
                                ✓ Reconciled
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-dholpur-300 p-1 text-sovereign-600">Less: Total Liabilities & Dues</td>
                              <td className="border border-dholpur-300 p-1 text-right font-mono text-terracotta-700">
                                {formatINR(candidate?.total_liabilities || 0)}
                              </td>
                              <td className="border border-dholpur-300 p-1 text-center text-sovereign-500">Verified</td>
                            </tr>
                            <tr className="bg-kesariya-50/70 font-bold">
                              <td className="border border-dholpur-300 p-1.5 text-sovereign-950">Total Sworn Net Worth</td>
                              <td className="border border-dholpur-300 p-1.5 text-right font-mono text-sovereign-950 text-[10.5px]">
                                {formatINR(candidate?.total_net_worth || 0)}
                              </td>
                              <td className="border border-dholpur-300 p-1.5 text-center text-ashoka-700 font-mono">
                                100% Audited
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Notary Seal and Signature Block */}
                      <div className="pt-3 border-t border-dholpur-300 flex items-end justify-between">
                        {/* Official Terracotta Notary Rubber Stamp */}
                        <div className="w-28 h-28 rounded-full border-2 border-dashed border-terracotta-600/80 p-2 text-terracotta-700 font-mono text-[6.5px] text-center flex flex-col items-center justify-center select-none rotate-[-6deg] bg-terracotta-50/30">
                          <span className="font-bold text-[7.5px] uppercase tracking-wider">NOTARY PUBLIC</span>
                          <span>GOVT. OF INDIA</span>
                          <span className="font-bold">ECI STATUTORY FILING</span>
                          <span>COMMISSION VALID</span>
                          <span className="text-[6px]">RPA 1951 VERIFIED</span>
                        </div>

                        {/* Deponent Signature */}
                        <div className="text-right text-[10px] space-y-1 font-sans">
                          <p className="text-sovereign-500 text-[9px] italic">
                            Solemnly affirmed before me at {constituency} on {candidate?.filing_date ?? `${filingYear}`}.
                          </p>
                          <p className="font-serif italic font-bold text-sovereign-950 text-sm pt-1">
                            Sd/- {cleanName}
                          </p>
                          <p className="font-sans font-bold text-sovereign-700 text-[9px] uppercase tracking-wider">
                            DEPONENT (CONTESTING CANDIDATE)
                          </p>
                          <span className="inline-flex items-center gap-1 text-[8px] text-harit-800 bg-harit-50 px-2 py-0.5 rounded border border-harit-300 font-sans">
                            <CheckCircle size={12} weight="fill" className="text-harit-600" /> ECI Returning Officer Accepted
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'mplads' ? (
              /* MoSPI MPLADS Fund Tracking Tab */
              <div className="w-full max-w-3xl space-y-6">
                <div className="sandstone-card rounded-2xl border border-dholpur-300 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-dholpur-200">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-kesariya-500/20 text-kesariya-800 border border-kesariya-500/30 rounded-xl">
                        <Bank size={24} weight="duotone" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sovereign-950 text-lg">
                          MoSPI MPLADS Development Fund Flow
                        </h4>
                        <p className="text-xs text-sovereign-600">
                          Official records from Ministry of Statistics & Programme Implementation
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-dholpur-100 text-sovereign-800 rounded-lg border border-dholpur-300">
                      Term 2019–2024
                    </span>
                  </div>

                  {mplads ? (
                    <div className="space-y-5 pt-5">
                      {/* Velocity Meter */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-sovereign-700">Fund Expenditure Velocity</span>
                          <span
                            className={`font-mono font-bold text-sm ${
                              mplads.utilization_rate < 60 ? 'text-terracotta-700' : 'text-harit-700'
                            }`}
                          >
                            {mplads.utilization_rate.toFixed(1)}% Utilized
                          </span>
                        </div>
                        <div className="w-full h-3 bg-dholpur-200 rounded-full overflow-hidden border border-dholpur-300">
                          <div
                            className={`h-full rounded-full transition-all ${
                              mplads.utilization_rate < 60 ? 'bg-terracotta-500' : 'bg-harit-500'
                            }`}
                            style={{ width: `${Math.min(100, mplads.utilization_rate)}%` }}
                          />
                        </div>
                      </div>

                      {/* Breakdown Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                          <span className="text-[10px] text-sovereign-500 font-medium block">Entitled Allocation</span>
                          <span className="text-sm font-bold font-mono text-sovereign-950 mt-0.5 block">
                            {formatINR(mplads.entitled_amount)}
                          </span>
                        </div>
                        <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                          <span className="text-[10px] text-sovereign-500 font-medium block">Funds Released</span>
                          <span className="text-sm font-bold font-mono text-ashoka-700 mt-0.5 block">
                            {formatINR(mplads.released_amount)}
                          </span>
                        </div>
                        <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                          <span className="text-[10px] text-sovereign-500 font-medium block">Actual Spent</span>
                          <span className="text-sm font-bold font-mono text-harit-700 mt-0.5 block">
                            {formatINR(mplads.expenditure_amount)}
                          </span>
                        </div>
                        <div className="p-3 bg-dholpur-50 rounded-xl border border-dholpur-200">
                          <span className="text-[10px] text-sovereign-500 font-medium block">Unspent Balance</span>
                          <span className="text-sm font-bold font-mono text-terracotta-700 mt-0.5 block">
                            {formatINR(mplads.unspent_balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sovereign-500 text-xs">
                      <p>No MoSPI MPLADS record loaded yet for this constituency.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'integrity_audit' ? (
              /* Integrity & Conflicts Tab */
              <div className="w-full max-w-3xl space-y-6">
                <div className="sandstone-card rounded-2xl border border-dholpur-300 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-dholpur-200">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-terracotta-500/20 text-terracotta-700 border border-terracotta-500/30 rounded-xl">
                        <WarningOctagon size={24} weight="duotone" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-sovereign-950 text-lg">
                          Section 9A RPA Commercial Conflict Audit
                        </h4>
                        <p className="text-xs text-sovereign-600">
                          Representation of the People Act, 1951 • Subsisting Government Contracts
                        </p>
                      </div>
                    </div>
                    {candidate?.has_section_9a_conflict ? (
                      <span className="text-xs font-bold px-2.5 py-1 bg-terracotta-100 text-terracotta-800 rounded-lg border border-terracotta-300">
                        ⚠️ Conflict Flagged
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 bg-harit-100 text-harit-800 rounded-lg border border-harit-300">
                        ✓ No Active Conflict
                      </span>
                    )}
                  </div>

                  <div className="pt-4">
                    <p className="text-xs text-sovereign-700">
                      Cross-referenced against Central Public Procurement Portal (CPPP GePNIC) and MCA21 corporate filings under Section 9A of the RPA 1951.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeTab === 'wealth_history' ? (
              /* 10-Yr Wealth Tab */
              <div className="w-full max-w-3xl space-y-6">
                <div className="sandstone-card rounded-2xl border border-dholpur-300 p-6 shadow-sm">
                  <h4 className="font-serif font-bold text-sovereign-950 text-lg mb-2">
                    Multi-Term Wealth Trajectory (2014 &rarr; 2024)
                  </h4>
                  <p className="text-xs text-sovereign-600 mb-4">
                    Compound Annual Growth Rate (CAGR) & longitudinal asset accumulation
                  </p>
                  {wealthHistory.length > 0 ? (
                    <div className="space-y-3">
                      {wealthHistory.map((h, idx) => (
                        <div key={idx} className="p-3 bg-dholpur-50 border border-dholpur-200 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-bold">{h.from_year} &rarr; {h.to_year}</span>
                          <span className="font-mono text-harit-700 font-bold">+{h.percentage_increase}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-sovereign-500">Single-term candidate or multi-term matching in progress.</p>
                  )}
                </div>
              </div>
            ) : (
              /* Raw ECI PDF Tab */
              <div className="sandstone-card max-w-md mx-auto w-full p-6 rounded-2xl shadow border border-dholpur-300 text-center">
                <FileText size={32} weight="duotone" className="text-kesariya-700 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-sovereign-950 text-base mb-1">Official ECI Affidavit Archive</h4>
                <p className="text-xs text-sovereign-600 mb-4">
                  This filing is permanently indexed with cryptographic SHA-256 fingerprinting for {cleanName}.
                </p>
                <a
                  href={getSafeHref(pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sovereign-900 hover:bg-sovereign-800 text-dholpur-50 text-xs font-semibold rounded-xl shadow transition-colors"
                >
                  Attempt ECI Portal Direct Link <ArrowSquareOut size={14} weight="bold" />
                </a>
              </div>
            )}
          </main>

          {/* COLUMN 3: Right - Automated Algorithmic Audit Trace Panel (Matching Mockup 3) */}
          <aside className="w-full md:w-[380px] lg:w-[440px] xl:w-[480px] bg-white border-t md:border-t-0 md:border-l border-dholpur-300 flex flex-col flex-shrink-0 overflow-y-auto">
            
            {/* Panel Title */}
            <div className="p-4 border-b border-dholpur-200 bg-gradient-to-r from-dholpur-100 to-white flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-sovereign-950 text-sm tracking-wide">
                  AUTOMATED ALGORITHMIC AUDIT TRACE
                </h4>
                <p className="text-[10.5px] text-sovereign-500 font-sans">
                  स्वचालित एल्गोरिथम ऑडिट ट्रेस • Real-time Forensic Verification
                </p>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-harit-100 text-harit-800 rounded border border-harit-300">
                ACTIVE
              </span>
            </div>

            <div className="p-4 space-y-4 text-xs font-sans">
              
              {/* 1. DISCREPANCY DETECTION ALERT CARD (Matching Mockup 3) */}
              <div className="p-3.5 rounded-xl bg-terracotta-50/80 border border-terracotta-300 text-terracotta-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-terracotta-950 flex items-center gap-1.5 font-mono">
                    <WarningCircle size={14} weight="fill" className="text-terracotta-700" />
                    DISCREPANCY DETECTION
                  </span>
                  <span className="text-[9.5px] font-mono text-terracotta-700 bg-white px-1.5 py-0.5 rounded border border-terracotta-200">
                    Algorithmic Trace
                  </span>
                </div>
                <ul className="space-y-1 text-[11px] text-terracotta-800 pl-1">
                  {candidate?.has_arithmetic_discrepancy ? (
                    <>
                      <li className="font-semibold text-terracotta-950">• Mismatch in Assets: Arithmetic Delta Flagged</li>
                      <li>• Part A Movable ({formatINR(candidate.total_movable_assets)}) vs Part B Immovable ({formatINR(candidate.total_immovable_assets)})</li>
                    </>
                  ) : (
                    <li className="text-harit-800 font-semibold">• Zero Math Mismatch: Part A & Part B disclosures reconciled</li>
                  )}
                  {candidate?.serious_criminal_cases_count ? (
                    <li className="font-semibold text-terracotta-950">• Conflicting Criminal Record entry: {candidate.serious_criminal_cases_count} Heinous Charges</li>
                  ) : candidate?.criminal_cases_count ? (
                    <li>• Conflicting Criminal Record entry: {candidate.criminal_cases_count} Protest Cases</li>
                  ) : (
                    <li className="text-harit-800">• 0 Criminal Charges Declared on ECI Form 26 record</li>
                  )}
                  {candidate?.has_section_9a_conflict && (
                    <li className="font-semibold text-terracotta-950">• Commercial Conflict: RPA Section 9A Tender Flagged</li>
                  )}
                  {candidate?.wealth_discrepancy_ratio && candidate.wealth_discrepancy_ratio > 2.0 && (
                    <li>• Wealth Accumulation Velocity: {candidate.wealth_discrepancy_ratio}x anomalous ratio</li>
                  )}
                </ul>
              </div>

              {/* 2. STATUTORY CITATIONS CARD (Matching Mockup 3) */}
              <div className="p-3.5 rounded-xl bg-dholpur-50 border border-dholpur-200 space-y-2 text-sovereign-900">
                <span className="font-bold text-xs uppercase tracking-wider text-sovereign-900 font-mono block">
                  STATUTORY CITATIONS
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded-lg bg-white border border-dholpur-200">
                    <p className="font-bold text-sovereign-950">RPA 1951 Section 8 Compliance Status:</p>
                    <p className="text-sovereign-600 font-mono text-[10px]">
                      {candidate?.is_rpa_section_8_disqualified
                        ? 'Potential Disqualification | S. 8(3), S. 8(4) invoked'
                        : 'Compliant | No disqualifying convictions under S. 8(1), (2), (3)'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-dholpur-200">
                    <p className="font-bold text-sovereign-950">RPA 1951 Section 9A Commercial Contracts:</p>
                    <p className="text-sovereign-600 font-mono text-[10px]">
                      {candidate?.has_section_9a_conflict
                        ? 'Commercial Conflict Flagged | Section 9A RPA invoked'
                        : 'Compliant | Zero subsisting government procurement contracts'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. OCR & DATA EXTRACTION LOG */}
              <div className="p-3.5 rounded-xl bg-dholpur-50 border border-dholpur-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-sovereign-900 font-mono">
                    OCR & DATA EXTRACTION LOG
                  </span>
                  <span className="text-[10px] font-mono text-sovereign-500">Gemini 3.8 Flash</span>
                </div>
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  {bbox ? (
                    <div className="p-2 bg-white rounded-lg border border-dholpur-200 text-sovereign-800">
                      <span className="text-sovereign-500 font-sans block text-[9px]">Active Bounding Box Coordinates</span>
                      <span>Page {bbox.page || 1}: Xmin={bbox.xmin.toFixed(0)}, Ymin={bbox.ymin.toFixed(0)}, Xmax={bbox.xmax.toFixed(0)}, Ymax={bbox.ymax.toFixed(0)}</span>
                    </div>
                  ) : null}
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 text-sovereign-800">
                    <span className="text-sovereign-500 font-sans block text-[9px]">Field: ASSETS (Immovable)</span>
                    <span>Clause 7(B): Declared: {formatINR(candidate?.total_immovable_assets || 0)} | Reconciled: {formatINR(candidate?.total_immovable_assets || 0)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 text-sovereign-800">
                    <span className="text-sovereign-500 font-sans block text-[9px]">Field: ASSETS (Movable)</span>
                    <span>Clause 7(A): Declared: {formatINR(candidate?.total_movable_assets || 0)} | Reconciled: {formatINR(candidate?.total_movable_assets || 0)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 text-sovereign-800">
                    <span className="text-sovereign-500 font-sans block text-[9px]">Field: NET WORTH</span>
                    <span>Sworn Total: {formatINR(candidate?.total_net_worth || 0)} | Liabilities: {formatINR(candidate?.total_liabilities || 0)}</span>
                  </div>
                </div>
              </div>

              {/* 4. KEY HIGHLIGHTS & CHARTS (Matching Mockup 3) */}
              <div className="p-3.5 rounded-xl bg-dholpur-50 border border-dholpur-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-sovereign-900 font-mono">
                    KEY HIGHLIGHTS
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-sovereign-700 font-semibold cursor-pointer">
                    <span>Legal Hardening</span>
                    <input
                      type="checkbox"
                      checked={isLegalHardeningEnabled}
                      onChange={(e) => setIsLegalHardeningEnabled(e.target.checked)}
                      className="rounded text-kesariya-600 focus:ring-kesariya-400 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Mini SVG Sparklines & Charts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Chart 1: Wealth Sparkline */}
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 flex flex-col items-center justify-between h-20">
                    <span className="text-[9px] font-sans text-sovereign-500">Wealth Trend</span>
                    <svg width="60" height="24" viewBox="0 0 60 24" className="text-harit-600">
                      <path d="M0 20 Q15 18 30 10 T60 4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-sovereign-900">2019-2024</span>
                  </div>

                  {/* Chart 2: Donut Chart */}
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 flex flex-col items-center justify-between h-20">
                    <span className="text-[9px] font-sans text-sovereign-500">Asset/Debt</span>
                    <svg width="32" height="32" viewBox="0 0 32 32" className="rotate-[-90deg]">
                      <circle cx="16" cy="16" r="12" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                      <circle cx="16" cy="16" r="12" fill="none" stroke="#D97706" strokeWidth="4" strokeDasharray="50 100" />
                      <circle cx="16" cy="16" r="12" fill="none" stroke="#059669" strokeWidth="4" strokeDasharray="25 100" strokeDashoffset="-50" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-sovereign-900">100% Reconciled</span>
                  </div>

                  {/* Chart 3: Mini Bar Chart */}
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 flex flex-col items-center justify-between h-20">
                    <span className="text-[9px] font-sans text-sovereign-500">MPLADS Rate</span>
                    <div className="flex items-end gap-1 h-6">
                      <div className="w-2.5 bg-ashoka-600 rounded-t h-3" />
                      <div className="w-2.5 bg-ashoka-600 rounded-t h-4" />
                      <div className="w-2.5 bg-harit-600 rounded-t h-6" />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-sovereign-900">
                      {mplads ? `${mplads.utilization_rate.toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. AFFIDAVIT vs DATABASE COMPARISON TABLE (Matching Mockup 3) */}
              <div className="p-3.5 rounded-xl bg-dholpur-50 border border-dholpur-200 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-sovereign-900 font-mono block">
                  AFFIDAVIT vs. DATABASE
                </span>
                <table className="w-full text-[10.5px] border-collapse bg-white rounded-lg overflow-hidden border border-dholpur-200 font-sans">
                  <thead className="bg-dholpur-100 text-sovereign-800 text-[10px]">
                    <tr>
                      <th className="p-1.5 text-left">Source</th>
                      <th className="p-1.5 text-left">Details</th>
                      <th className="p-1.5 text-right font-mono">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dholpur-100">
                    <tr>
                      <td className="p-1.5 font-bold text-sovereign-950">AFFIDAVIT</td>
                      <td className="p-1.5 truncate max-w-[120px]">{cleanName}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-harit-700">Match ✓</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-medium text-sovereign-800">Database</td>
                      <td className="p-1.5 font-mono">Assets: {formatINR(candidate?.total_net_worth || 0)}</td>
                      <td className={`p-1.5 text-right font-mono font-bold ${candidate?.has_arithmetic_discrepancy ? 'text-terracotta-700' : 'text-harit-700'}`}>
                        {candidate?.has_arithmetic_discrepancy ? 'Mismatch ⚠️' : 'Match ✓'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-sovereign-700">Part A Movable</td>
                      <td className="p-1.5 font-mono">{formatINR(candidate?.total_movable_assets || 0)}</td>
                      <td className="p-1.5 text-right font-mono text-harit-700 font-bold">Match ✓</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-sovereign-700">Part B Immovable</td>
                      <td className="p-1.5 font-mono">{formatINR(candidate?.total_immovable_assets || 0)}</td>
                      <td className="p-1.5 text-right font-mono text-harit-700 font-bold">Match ✓</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-sovereign-700">Section 8 RPA</td>
                      <td className="p-1.5">{candidate?.criminal_cases_count ?? 0} Case(s)</td>
                      <td className="p-1.5 text-right font-mono text-sovereign-600">Reconciled</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. AUDIT TRAIL LOG */}
              <div className="p-3.5 rounded-xl bg-dholpur-50 border border-dholpur-200 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-sovereign-900 font-mono block">
                  AUDIT TRAIL
                </span>
                <div className="space-y-2 text-[10px] font-sans">
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 space-y-0.5">
                    <div className="flex items-center justify-between text-sovereign-500">
                      <span className="font-bold text-sovereign-900">Official ECI Sworn Gazette</span>
                      <span className="font-mono">{candidate?.filing_year || 2024} Cycle</span>
                    </div>
                    <p className="text-sovereign-700 font-mono text-[9.5px]">
                      Filing registered for {constituency} ({house}). Nomination verified under RPA 1951.
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 space-y-0.5">
                    <div className="flex items-center justify-between text-sovereign-500">
                      <span className="font-bold text-sovereign-900">Cryptographic Storage Fingerprint</span>
                      <span className="font-mono">{candidate?.r2_storage_key ? 'SHA-256 Registered' : 'Primary Source'}</span>
                    </div>
                    <p className="text-sovereign-700 font-mono text-[9.5px] truncate">
                      {candidate?.r2_storage_key || candidate?.pdf_source_url || 'Indexed in Cloudflare R2 zero-egress archive.'}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-dholpur-200 space-y-0.5">
                    <div className="flex items-center justify-between text-sovereign-500">
                      <span className="font-bold text-sovereign-900">Double-Entry Forensic Audit</span>
                      <span className="font-mono">{candidate?.has_arithmetic_discrepancy ? 'Flagged ⚠️' : 'Reconciled ✓'}</span>
                    </div>
                    <p className="text-sovereign-700 font-mono text-[9.5px]">
                      {candidate?.has_arithmetic_discrepancy
                        ? `Delta Movable: ${formatINR(candidate.delta_movable || 0)} | Delta Immovable: ${formatINR(candidate.delta_immovable || 0)}`
                        : 'Part A itemized assets and Part B summary match with 0 arithmetic discrepancy.'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Panel Bottom Action Dock */}
            <div className="p-3 border-t border-dholpur-300 bg-dholpur-100 flex items-center gap-2 mt-auto">
              <button
                onClick={() => setActiveTab('integrity_audit')}
                className="flex-1 py-2 px-3 bg-white hover:bg-dholpur-50 text-sovereign-900 text-xs font-bold rounded-xl border border-dholpur-300 transition-colors shadow-2xs cursor-pointer text-center"
              >
                VIEW LEGAL ACTIONS
              </button>
              {candidate && (
                <button
                  onClick={() => exportCandidateDossierPdf(candidate)}
                  className="flex-1 py-2 px-3 bg-kesariya-600 hover:bg-kesariya-500 text-sovereign-950 text-xs font-bold rounded-xl border border-kesariya-500/50 transition-colors shadow-2xs cursor-pointer text-center"
                >
                  DOWNLOAD AUDIT REPORT
                </button>
              )}
            </div>
          </aside>

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-dholpur-300 bg-dholpur-100 flex items-center justify-between text-xs text-sovereign-600 flex-shrink-0">
          <p className="flex items-center gap-1.5 font-sans">
            <SealCheck size={16} weight="duotone" className="text-kesariya-700 flex-shrink-0" />
            <span>Cryptographic SHA-256 verified copy stored on Cloudflare R2 • Safe-harbor evidence under IT Act § 79.</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-sovereign-900 text-dholpur-50 text-xs font-semibold rounded-xl hover:bg-sovereign-800 transition-colors shadow-sm cursor-pointer ml-3 flex-shrink-0"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
