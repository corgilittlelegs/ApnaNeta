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
} from '@phosphor-icons/react';
import { CivicEmblem } from './CivicEmblem';
import { useViewMode } from '../context/ViewModeContext';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearching?: boolean;
  selectedHouse: string;
  onHouseChange: (h: string) => void;
  activeView?: 'directory' | 'leaderboards';
  onViewChange?: (view: 'directory' | 'leaderboards') => void;
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
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-slate-800/90 shadow-md">
      {/* TIER 1: Main Header (Identity, Spacious Search, Utility Actions) */}
      <div className="border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-6">
            {/* Brand Identity / Logo */}
            <div
              onClick={() => onViewChange && onViewChange('directory')}
              className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 cursor-pointer group"
            >
              <CivicEmblem size={30} className="sm:w-[34px] sm:h-[34px] group-hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                    Apna Neta
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-mono font-semibold uppercase bg-blue-500/20 text-blue-300 px-1 sm:px-1.5 py-0.5 rounded border border-blue-400/30">
                    LEDGER
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-sans tracking-wide hidden sm:block">
                  अपना नेता <span className="text-slate-600">•</span> Sovereign Civic Intelligence
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
                    className="text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
                  />
                ) : (
                  <MagnifyingGlass
                    size={16}
                    weight="light"
                    className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={
                    isCitizenMode
                      ? 'Search candidate name, constituency, or party...'
                      : 'Search by politician, constituency, or party...'
                  }
                  className="w-full pl-10 pr-12 py-2 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 text-white text-xs sm:text-sm rounded-xl border border-slate-700/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all placeholder:text-slate-400 font-sans shadow-inner"
                />
                <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400 border border-slate-600">
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
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-medium transition-all shadow-xs"
                  title="Open Citizen Guide & FAQ (नागरिक मार्गदर्शिका)"
                >
                  <BookOpen size={15} weight="duotone" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
              )}

              {/* House Filter Dropdown */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Funnel size={14} weight="duotone" className="text-slate-400 hidden sm:block" />
                <select
                  value={selectedHouse}
                  onChange={(e) => onHouseChange(e.target.value)}
                  className="text-xs bg-slate-800/90 border border-slate-700 rounded-xl px-2 sm:px-2.5 py-1.5 font-medium text-slate-200 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer hover:bg-slate-700/80 transition-colors max-w-[115px] sm:max-w-none"
                  aria-label="Filter by House"
                >
                  <option value="ALL">All Houses</option>
                  <option value="Lok Sabha">Lok Sabha</option>
                  <option value="Rajya Sabha">Rajya Sabha</option>
                  <option value="Vidhan Sabha">Vidhan Sabha</option>
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
                  className="text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
                />
              ) : (
                <MagnifyingGlass
                  size={15}
                  weight="light"
                  className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search candidate, constituency, or party..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-400 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: Sub-Navigation Bar (Page Tabs on Left, Mode Switcher on Right) */}
      <div className="bg-[#071322]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-between h-10 gap-2 sm:gap-3">
            {/* Left: View Tabs (Hidden on mobile; mobile uses sticky bottom dock) */}
            {onViewChange && (
              <nav className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => onViewChange('directory')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'directory'
                      ? 'bg-slate-800 text-white shadow-xs border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Candidate Directory"
                >
                  <SquaresFour size={15} weight={activeView === 'directory' ? 'fill' : 'duotone'} />
                  <span>Directory</span>
                </button>
                <button
                  onClick={() => onViewChange('leaderboards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'leaderboards'
                      ? 'bg-slate-800 text-white shadow-xs border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Accountability Rankings & Leaderboards"
                >
                  <Trophy
                    size={15}
                    weight={activeView === 'leaderboards' ? 'fill' : 'duotone'}
                    className="text-amber-400"
                  />
                  <span>Leaderboards</span>
                </button>
              </nav>
            )}

            {/* Right: Dual-Mode Toggle Switcher (Full width/centered on mobile) */}
            <div className="flex items-center justify-center gap-2 w-full md:w-auto">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Mode:
              </span>
              <div
                className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/90 shadow-xs w-full max-w-xs md:max-w-none"
                title={
                  isCitizenMode
                    ? 'Currently in Citizen Mode (Simple Language & Real-World Impact). Click to switch to Forensic Mode.'
                    : 'Currently in Forensic Mode (Statutory Citations & Coordinate Proof). Click to switch to Citizen Mode.'
                }
              >
                <button
                  onClick={() => setViewMode('citizen')}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isCitizenMode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users size={13} weight="bold" />
                  <span>Citizen Mode</span>
                </button>

                <button
                  onClick={() => setViewMode('forensic')}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    !isCitizenMode
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scales size={13} weight="bold" />
                  <span>Forensic Mode</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
