import React from 'react';
import { MagnifyingGlass, Funnel, SquaresFour, Trophy } from '@phosphor-icons/react';
import { CivicEmblem } from './CivicEmblem';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedHouse: string;
  onHouseChange: (h: string) => void;
  activeView?: 'directory' | 'leaderboards';
  onViewChange?: (view: 'directory' | 'leaderboards') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedHouse,
  onHouseChange,
  activeView = 'directory',
  onViewChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Identity / Logo */}
          <div
            onClick={() => onViewChange && onViewChange('directory')}
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer group"
          >
            <CivicEmblem size={38} className="group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  Apna Neta
                </span>
                <span className="text-[9px] font-mono font-semibold uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                  LEDGER
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans tracking-wide">
                अपना नेता <span className="text-slate-600">•</span> Sovereign Civic Intelligence
              </p>
            </div>
          </div>

          {/* Center Search Input with ⌘K Badge */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                weight="light"
                className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by politician, constituency, or party..."
                className="w-full pl-10 pr-12 py-2 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all placeholder:text-slate-400 font-sans"
              />
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400 border border-slate-600">
                ⌘K
              </span>
            </div>
          </div>

          {/* View Mode Switcher (Directory vs Leaderboards) */}
          {onViewChange && (
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex-shrink-0">
              <button
                onClick={() => onViewChange('directory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'directory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Candidate & MP Directory"
              >
                <SquaresFour size={15} weight="duotone" />
                <span className="hidden md:inline">Directory</span>
              </button>
              <button
                onClick={() => onViewChange('leaderboards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'leaderboards'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Accountability Rankings & Leaderboards"
              >
                <Trophy size={15} weight="duotone" className="text-amber-400" />
                <span className="hidden md:inline">Leaderboards</span>
              </button>
            </div>
          )}

          {/* Right House Filter */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Funnel size={16} weight="duotone" className="text-slate-400 hidden sm:block" />
            <select
              value={selectedHouse}
              onChange={(e) => onHouseChange(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-200 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer hover:bg-slate-700/80 transition-colors"
            >
              <option value="ALL">All Houses</option>
              <option value="Lok Sabha">543 Lok Sabha</option>
              <option value="Rajya Sabha">Rajya Sabha</option>
              <option value="Vidhan Sabha">Vidhan Sabha</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

