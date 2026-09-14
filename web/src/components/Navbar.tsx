import React from 'react';
import { Search, Shield, Filter } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedHouse: string;
  onHouseChange: (h: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedHouse,
  onHouseChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-white to-emerald-600 p-0.5 shadow-sm border border-slate-200 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <span className="text-xl">🇮🇳</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">Apna Neta</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded font-mono">
                  AUDIT
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Autonomous Political Accountability</p>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search candidate name, constituency, or party..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right House Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedHouse}
              onChange={(e) => onHouseChange(e.target.value)}
              className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">All Houses</option>
              <option value="Lok Sabha">Lok Sabha</option>
              <option value="Rajya Sabha">Rajya Sabha</option>
              <option value="Vidhan Sabha">Vidhan Sabha</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
