import React from 'react';
import {
  MagnifyingGlass,
  Funnel,
  SquaresFour,
  Trophy,
  Users,
  Scales,
  BookOpen,
  SpinnerGap,
  ShieldCheck,
} from '@phosphor-icons/react';
import { CivicEmblem } from './CivicEmblem';
import { useViewMode } from '../context/ViewModeContext';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearching?: boolean;
  selectedHouse: string;
  onHouseChange: (h: string) => void;
  activeView?: 'directory' | 'leaderboards' | 'verification';
  onViewChange?: (view: 'directory' | 'leaderboards' | 'verification') => void;
  onOpenCivicGuide?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  isSearching = false,
  selectedHouse,
  onHouseChange,
  activeView = 'directory',
  onViewChange,
  onOpenCivicGuide,
}) => {
  const { viewMode, setViewMode, isCitizenMode } = useViewMode();

  return (
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-sovereign-800 shadow-md">
      {/* Top Sovereign Tiranga Accent Line */}
      <div className="tiranga-accent-bar w-full" />

      {/* TIER 1: Main Header (Identity, Spacious Search, Utility Actions) */}
      <div className="border-b border-sovereign-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-6">
            {/* Brand Identity / Logo */}
            <div
              onClick={() => onViewChange && onViewChange('directory')}
              className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group"
            >
              <CivicEmblem size={32} className="sm:w-[36px] sm:h-[36px] group-hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-kesariya-200 transition-colors">
                    Apna Neta
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-mono font-semibold uppercase bg-kesariya-500/20 text-kesariya-300 px-1.5 py-0.5 rounded border border-kesariya-500/30">
                    LEDGER
                  </span>
                </div>
                <p className="text-[9.5px] text-dholpur-300 font-sans tracking-wide hidden sm:block">
                  <span className="font-devanagari font-semibold text-kesariya-400">अपना नेता</span>{' '}
                  <span className="text-dholpur-400/60">•</span> The Sovereign Civic Ledger of Bharat
                </p>
              </div>
            </div>

            {/* Center: Spacious Search Omnibar (Desktop) */}
            <div className="flex-1 max-w-xl mx-2 hidden md:block">
              <div className="relative">
                {isSearching ? (
                  <SpinnerGap
                    size={16}
                    weight="bold"
                    className="text-kesariya-400 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
                  />
                ) : (
                  <MagnifyingGlass
                    size={16}
                    weight="light"
                    className="text-dholpur-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={
                    isCitizenMode
                      ? 'Search candidate name, constituency, or party (उदा. सांसद, दल या क्षेत्र)...'
                      : 'Search politician, constituency, or ECI docket...'
                  }
                  className="w-full pl-10 pr-12 py-2 bg-sovereign-900/90 hover:bg-sovereign-900 focus:bg-sovereign-950 text-white text-xs sm:text-sm rounded-xl border border-sovereign-700/80 focus:border-kesariya-400 focus:ring-1 focus:ring-kesariya-400 outline-none transition-all placeholder:text-dholpur-400 font-sans shadow-inner"
                />
                <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-sovereign-800 text-dholpur-400 border border-sovereign-700">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Right Utilities: Guide & House Filter */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Citizen Guide FAQ Button */}
              {onOpenCivicGuide && (
                <button
                  onClick={onOpenCivicGuide}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-kesariya-500/15 hover:bg-kesariya-500/25 text-kesariya-300 hover:text-kesariya-200 border border-kesariya-500/30 rounded-xl text-xs font-semibold transition-all shadow-xs"
                  title="Open Citizen Guide & FAQ (नागरिक मार्गदर्शिका)"
                >
                  <BookOpen size={15} weight="duotone" />
                  <span className="hidden sm:inline">Guide • मार्गदर्शिका</span>
                  <span className="sm:hidden">Guide</span>
                </button>
              )}

              {/* House Filter Dropdown */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Funnel size={14} weight="duotone" className="text-dholpur-400 hidden sm:block" />
                <select
                  value={selectedHouse}
                  onChange={(e) => onHouseChange(e.target.value)}
                  className="text-xs bg-sovereign-900/90 border border-sovereign-700 rounded-xl px-2 sm:px-2.5 py-1.5 font-medium text-dholpur-200 outline-none focus:ring-1 focus:ring-kesariya-400 cursor-pointer hover:bg-sovereign-800 transition-colors max-w-[125px] sm:max-w-none"
                  aria-label="Filter by House"
                >
                  <option value="ALL">All Houses (सभी सदन)</option>
                  <option value="Lok Sabha">Lok Sabha (लोक सभा)</option>
                  <option value="Rajya Sabha">Rajya Sabha (राज्य सभा)</option>
                  <option value="Vidhan Sabha">Vidhan Sabha (विधान सभा)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Search Bar (under header on small screens) */}
          <div className="pb-3 md:hidden">
            <div className="relative">
              {isSearching ? (
                <SpinnerGap
                  size={15}
                  weight="bold"
                  className="text-kesariya-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
                />
              ) : (
                <MagnifyingGlass
                  size={15}
                  weight="light"
                  className="text-dholpur-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search candidate, constituency (उदा. सांसद या दल)..."
                className="w-full pl-9 pr-4 py-2 bg-sovereign-900/90 text-white text-xs sm:text-sm rounded-xl border border-sovereign-700 focus:border-kesariya-400 outline-none placeholder:text-dholpur-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: Sub-Navigation Bar (Page Tabs on Left, Mode Switcher on Right) */}
      <div className="bg-[#071322]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-between h-10 gap-2 sm:gap-3">
            {/* Left: View Tabs */}
            {onViewChange && (
              <nav className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => onViewChange('directory')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'directory'
                      ? 'bg-sovereign-800 text-kesariya-300 shadow-xs border border-kesariya-500/30'
                      : 'text-dholpur-400 hover:text-dholpur-200 hover:bg-sovereign-800/50'
                  }`}
                  title="Candidate Directory"
                >
                  <SquaresFour size={15} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
                  <span>Directory • निर्देशिका</span>
                </button>
                <button
                  onClick={() => onViewChange('leaderboards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === 'leaderboards'
                      ? 'bg-sovereign-800 text-kesariya-300 shadow-xs border border-kesariya-500/30'
                      : 'text-dholpur-400 hover:text-dholpur-200 hover:bg-sovereign-800/50'
                  }`}
                  title="Accountability Rankings & Leaderboards"
                >
                  <Trophy
                    size={15}
                    weight={activeView === 'leaderboards' ? 'fill' : 'duotone'}
                    className="text-kesariya-400"
                  />
                  <span>Leaderboards • रैंकिंग</span>
                </button>
                <button
                  onClick={() => onViewChange('verification')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === 'verification'
                      ? 'bg-sovereign-800 text-kesariya-300 shadow-xs border border-kesariya-500/30'
                      : 'text-dholpur-400 hover:text-dholpur-200 hover:bg-sovereign-800/50'
                  }`}
                  title="Forensic Affidavit Verification & Legal Audit"
                >
                  <ShieldCheck
                    size={15}
                    weight={activeView === 'verification' ? 'fill' : 'duotone'}
                    className="text-harit-400"
                  />
                  <span>Verification • सत्यापन</span>
                </button>
              </nav>
            )}

            {/* Right: Dual-Mode Toggle Switcher */}
            <div className="flex items-center justify-center gap-2 w-full md:w-auto">
              <span className="text-[11px] text-dholpur-400 font-medium hidden sm:inline">
                Mode:
              </span>
              <div
                className="flex items-center bg-sovereign-900/90 p-0.5 rounded-xl border border-sovereign-700 shadow-xs w-full max-w-xs md:max-w-none"
                title={
                  isCitizenMode
                    ? 'Currently in Citizen Mode (Simple Language & Real-World Impact). Click to switch to Forensic Mode.'
                    : 'Currently in Forensic Mode (Statutory Citations & Coordinate Proof). Click to switch to Citizen Mode.'
                }
              >
                <button
                  onClick={() => setViewMode('citizen')}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isCitizenMode
                      ? 'bg-harit-700 text-white shadow-xs border border-harit-500/40'
                      : 'text-dholpur-400 hover:text-white'
                  }`}
                >
                  <Users size={13} weight="bold" />
                  <span>Citizen • नागरिक</span>
                </button>

                <button
                  onClick={() => setViewMode('forensic')}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    !isCitizenMode
                      ? 'bg-ashoka-700 text-white shadow-xs border border-ashoka-500/40'
                      : 'text-dholpur-400 hover:text-white'
                  }`}
                >
                  <Scales size={13} weight="bold" />
                  <span>Forensic • विधिक</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
