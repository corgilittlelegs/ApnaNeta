import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';

export type CivicTermKey =
  | 'MPLADS'
  | 'FORM_26'
  | 'WDR'
  | 'SECTION_9A'
  | 'SECTION_8'
  | 'CAGR'
  | 'DIVISION_VOTING'
  | 'GHOST_PROJECT'
  | 'ARITHMETIC_CHECK';

interface TermDefinition {
  title: string;
  hindiTitle: string;
  acronym?: string;
  simpleExplanation: string;
  whyItMatters: string;
  sourceAuthority: string;
}

export const CIVIC_DICTIONARY: Record<CivicTermKey, TermDefinition> = {
  MPLADS: {
    title: 'Constituency Development Fund',
    hindiTitle: 'सांसद निधि (MPLADS)',
    acronym: 'MPLADS (Member of Parliament Local Area Development Scheme)',
    simpleExplanation:
      'Every MP receives ₹5 Crore per year from the central government directly allocated for development works in their local constituency (such as building roads, installing street lights, drinking water pumps, and local schools).',
    whyItMatters:
      'Shows whether your elected representative is actively investing public funds to solve local community issues or letting millions of rupees sit unspent.',
    sourceAuthority: 'Ministry of Statistics & Programme Implementation (MoSPI)',
  },
  FORM_26: {
    title: 'Sworn Election Affidavit',
    hindiTitle: 'चुनावी हलफ़नामा (Form 26)',
    acronym: 'ECI Form 26 Affidavit',
    simpleExplanation:
      'A legally binding sworn statement submitted by every election candidate declaring their complete assets, liabilities, education, and any criminal charges before an authorized magistrate or notary.',
    whyItMatters:
      'Supreme Court mandates this so citizens know exactly who they are voting for. Concealing or falsifying information is a punishable criminal offense under the RPA, 1951.',
    sourceAuthority: 'Election Commission of India (ECI)',
  },
  WDR: {
    title: 'Wealth vs. Income Discrepancy',
    hindiTitle: 'संपत्ति-आय अनुपात (WDR)',
    acronym: 'Wealth Discrepancy Ratio (WDR)',
    simpleExplanation:
      'Compares the candidate’s declared total net worth with their declared 5-year taxable income from official Income Tax Returns (ITR).',
    whyItMatters:
      'Highlights when a politician’s wealth has grown drastically faster than their legal, reported tax earnings can reasonably explain.',
    sourceAuthority: 'Central Board of Direct Taxes (CBDT) & ECI Filings',
  },
  SECTION_9A: {
    title: 'Government Contract Conflict',
    hindiTitle: 'सरकारी ठेका विवाद (Section 9A)',
    acronym: 'Section 9A, Representation of the People Act, 1951',
    simpleExplanation:
      'A constitutional rule that bars individuals or their commercial entities from holding active business contracts with the government while serving as an elected lawmaker.',
    whyItMatters:
      'Prevents politicians from awarding lucrative public tenders and government contracts to their own businesses or family firms.',
    sourceAuthority: 'Representation of the People Act, 1951 & MCA21',
  },
  SECTION_8: {
    title: 'Electoral Disqualification for Crime',
    hindiTitle: 'अपराध के कारण अयोग्यता (Section 8 RPA)',
    acronym: 'Section 8, Representation of the People Act, 1951',
    simpleExplanation:
      'Disqualifies any lawmaker from contesting elections or holding office if convicted of serious criminal offenses and sentenced to imprisonment of 2 years or more.',
    whyItMatters:
      'Ensures individuals with verified serious criminal convictions cannot make laws in Parliament or State Assemblies.',
    sourceAuthority: 'Supreme Court of India & National Judicial Data Grid',
  },
  CAGR: {
    title: 'Annual Wealth Growth Rate',
    hindiTitle: 'सालाना संपत्ति वृद्धि (CAGR)',
    acronym: 'Compound Annual Growth Rate',
    simpleExplanation:
      'The steady annual percentage rate at which a politician’s declared assets grew between consecutive election terms (e.g. from 2019 to 2024).',
    whyItMatters:
      'Helps citizens identify rapid wealth accumulation (>300% surge) over their tenure in public office.',
    sourceAuthority: 'Multi-Term Sworn Nomination Filings',
  },
  DIVISION_VOTING: {
    title: 'Recorded Parliament Voting',
    hindiTitle: 'संसदीय मत विभाजन (Division Voting)',
    acronym: 'Sansad Division Voting',
    simpleExplanation:
      'An electronic record of how your MP voted (Aye / No / Abstain) on major national bills and legislative amendments in the Parliament floor.',
    whyItMatters:
      'Shows whether your MP voted in favor of public interest and constituency priorities on landmark national policies.',
    sourceAuthority: 'Lok Sabha & Rajya Sabha Secretariat (sansad.in)',
  },
  GHOST_PROJECT: {
    title: 'GIS Location Anomaly Alert',
    hindiTitle: 'कागज़ी / संदिग्ध परियोजना (GIS Anomaly)',
    acronym: 'e-SAKSHI Geotagging Audit',
    simpleExplanation:
      'An alert triggered when government-funded work coordinates point to impossible locations (like open oceans, outside constituency borders, or duplicate coordinates).',
    whyItMatters:
      'Protects tax rupees from being siphoned into fake "ghost" projects that exist only on paper.',
    sourceAuthority: 'e-SAKSHI MoSPI Geotagged Portal',
  },
  ARITHMETIC_CHECK: {
    title: 'Affidavit Mathematical Audit',
    hindiTitle: 'हलफ़नामे का गणित (Double-Entry Audit)',
    acronym: 'Schedule Part A vs Part B Cross-Check',
    simpleExplanation:
      'An automated mathematical audit comparing the item-by-item asset list against the total summary amount declared on the candidate’s official affidavit.',
    whyItMatters:
      'Detects hidden discrepancies, calculation errors, or understated totals in sworn election paperwork.',
    sourceAuthority: 'Election Commission of India Form 26',
  },
};

interface CivicTermProps {
  term: CivicTermKey;
  children?: React.ReactNode;
  showIconOnly?: boolean;
  className?: string;
}

interface PopoverCoords {
  top?: number;
  bottom?: number;
  left: number;
  arrowLeft: number;
  placeAbove: boolean;
}

export const CivicTerm: React.FC<CivicTermProps> = ({
  term,
  children,
  showIconOnly = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isHindi } = useLanguage();
  const definition = CIVIC_DICTIONARY[term];

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 12;
    const popoverWidth = Math.min(320, window.innerWidth - margin * 2);
    const estimatedHeight = 280;

    // Center horizontally on trigger button
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - popoverWidth / 2;

    // Clamp horizontally so it never clips off the left or right screen edge
    const minLeft = margin;
    const maxLeft = window.innerWidth - popoverWidth - margin;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Arrow always points to the trigger button center
    const arrowLeft = Math.max(16, Math.min(triggerCenter - left, popoverWidth - 16));

    // Vertical placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight + margin && rect.top > estimatedHeight + margin;

    const top = placeAbove ? undefined : rect.bottom + 8;
    const bottom = placeAbove ? window.innerHeight - rect.top + 8 : undefined;

    setCoords({ top, bottom, left, arrowLeft, placeAbove });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  if (!definition) return <>{children}</>;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children && <span>{children}</span>}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-dholpur-200/80 hover:bg-kesariya-100 text-sovereign-600 hover:text-kesariya-800 transition-colors cursor-pointer text-[10px] flex-shrink-0"
        aria-label={`Explain ${definition.title}`}
        aria-expanded={isOpen}
      >
        <Info size={11} weight="bold" />
      </button>

      {/* Floating Explainer Popover (Portal to body to escape all container overflow/clip) */}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            className="fixed z-[9999] w-[320px] max-w-[calc(100vw-24px)] bg-[#0A192F] text-white rounded-2xl p-4 shadow-2xl border border-kesariya-500/40 text-xs animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${coords.left}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            }}
          >
            {/* Popover Arrow */}
            {coords.arrowLeft !== undefined && (
              <div
                className={`absolute w-3 h-3 bg-[#0A192F] border-kesariya-500/40 ${
                  coords.placeAbove ? 'bottom-[-6px] border-r border-b' : 'top-[-6px] border-l border-t'
                }`}
                style={{
                  left: `${coords.arrowLeft}px`,
                  transform: 'translateX(-50%) rotate(45deg)',
                }}
              />
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-sovereign-800 relative z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-kesariya-400 font-semibold block">
                  {isHindi ? 'सरल शब्दावली' : 'Civic Explainer'}
                </span>
                <h4 className="font-serif font-bold text-sm text-white">
                  {isHindi ? definition.hindiTitle : definition.title}
                </h4>
                {definition.acronym && (
                  <p className="text-[11px] text-dholpur-300 font-mono mt-0.5">{definition.acronym}</p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-dholpur-400 hover:text-white p-1 rounded-lg hover:bg-sovereign-800 transition-colors cursor-pointer"
                aria-label="Close explainer"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Simple Explanation */}
            <div className="py-2.5 space-y-2 text-dholpur-100 leading-relaxed font-sans relative z-10">
              <p>{definition.simpleExplanation}</p>

              <div className="p-2 bg-sovereign-900/90 rounded-xl border border-sovereign-800">
                <span className="text-[10px] font-bold text-harit-400 uppercase tracking-wide block mb-0.5">
                  {isHindi ? '💡 यह आपके लिए क्यों आवश्यक है:' : '💡 Why this matters to you:'}
                </span>
                <p className="text-[11px] text-dholpur-200">{definition.whyItMatters}</p>
              </div>
            </div>

            {/* Footer Authority */}
            <div className="pt-2 border-t border-sovereign-800 text-[10px] text-dholpur-400 flex items-center justify-between font-mono relative z-10">
              <span>{isHindi ? 'आधिकारिक स्रोत:' : 'Source:'} {definition.sourceAuthority}</span>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};
