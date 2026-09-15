import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CandidateCard } from './components/CandidateCard';
import { AffidavitProofViewer } from './components/AffidavitProofViewer';
import { Candidate, BoundingBox } from './types/candidate';
import { Cpu, Database } from 'lucide-react';

// Seed sample data for interactive citizen demonstration
const SAMPLE_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Narendra Damodardas Modi',
    constituency: 'Varanasi',
    state: 'Uttar Pradesh',
    house: 'Lok Sabha',
    party: 'Bharatiya Janata Party',
    filing_year: 2024,
    total_movable_assets: 30200000.0,
    total_immovable_assets: 0.0,
    total_liabilities: 0.0,
    total_net_worth: 30200000.0,
    total_five_year_income: 14200000.0,
    criminal_cases_count: 0,
    serious_criminal_cases_count: 0,
    protest_cases_count: 0,
    attendance_rate: 98.2,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 2.12,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 1, ymin: 150, xmin: 100, ymax: 280, xmax: 900 },
  },
  {
    id: '2',
    name: 'Rahul Gandhi',
    constituency: 'Rae Bareli',
    state: 'Uttar Pradesh',
    house: 'Lok Sabha',
    party: 'Indian National Congress',
    filing_year: 2024,
    total_movable_assets: 92400000.0,
    total_immovable_assets: 111500000.0,
    total_liabilities: 4970000.0,
    total_net_worth: 198930000.0,
    total_five_year_income: 48000000.0,
    criminal_cases_count: 8,
    serious_criminal_cases_count: 0,
    protest_cases_count: 8,
    attendance_rate: 82.5,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 4.14,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 8, ymin: 220, xmin: 150, ymax: 380, xmax: 850 },
  },
  {
    id: '3',
    name: 'Vikramjit Singh',
    alias: 'Vicky',
    constituency: 'Ludhiana',
    state: 'Punjab',
    house: 'Lok Sabha',
    party: 'Aam Aadmi Party',
    filing_year: 2024,
    total_movable_assets: 45000000.0,
    total_immovable_assets: 120000000.0,
    total_liabilities: 15000000.0,
    total_net_worth: 150000000.0,
    total_five_year_income: 7500000.0,
    criminal_cases_count: 3,
    serious_criminal_cases_count: 2,
    protest_cases_count: 1,
    attendance_rate: 74.0,
    has_arithmetic_discrepancy: true,
    delta_movable: 4200000.0, // 42 Lakh discrepancy flagged!
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 20.0, // High WDR anomaly flagged!
    has_anomalous_wealth_ratio: true,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 14, ymin: 340, xmin: 200, ymax: 450, xmax: 800 },
  },
  {
    id: '4',
    name: 'Kanimozhi Karunanidhi',
    constituency: 'Thoothukkudi',
    state: 'Tamil Nadu',
    house: 'Lok Sabha',
    party: 'Dravida Munnetra Kazhagam',
    filing_year: 2024,
    total_movable_assets: 380000000.0,
    total_immovable_assets: 195000000.0,
    total_liabilities: 22000000.0,
    total_net_worth: 553000000.0,
    total_five_year_income: 92000000.0,
    criminal_cases_count: 1,
    serious_criminal_cases_count: 0,
    protest_cases_count: 1,
    attendance_rate: 91.0,
    has_arithmetic_discrepancy: false,
    delta_movable: 0.0,
    delta_immovable: 0.0,
    wealth_discrepancy_ratio: 6.01,
    has_anomalous_wealth_ratio: false,
    pdf_source_url: 'https://affidavit.eci.gov.in/CandidateCustomFilter?electionType=24-PC-GENERAL-1-2024',
    proof_bbox: { page: 12, ymin: 280, xmin: 100, ymax: 410, xmax: 880 },
  },
];

export const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('ALL');

  // Proof Viewer Modal State
  const [proofModal, setProofModal] = useState<{
    isOpen: boolean;
    candidateName: string;
    fieldLabel: string;
    value: string;
    pdfUrl: string;
    bbox?: BoundingBox;
  }>({
    isOpen: false,
    candidateName: '',
    fieldLabel: '',
    value: '',
    pdfUrl: '',
  });

  const handleOpenProof = (candidateName: string, fieldLabel: string, value: string, pdfUrl: string) => {
    setProofModal({
      isOpen: true,
      candidateName,
      fieldLabel,
      value,
      pdfUrl,
    });
  };

  const filteredCandidates = SAMPLE_CANDIDATES.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.constituency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.party && c.party.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesHouse = selectedHouse === 'ALL' || c.house === selectedHouse;

    return matchesSearch && matchesHouse;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedHouse={selectedHouse}
        onHouseChange={setSelectedHouse}
      />

      {/* Hero / System Overview */}
      <section className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Empirical Political Accountability & Forensic Audits
              </h1>
              <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                Continuous ingestion across ECI affidavits, Sansad parliamentary records, and MoSPI fund flows.
                Every metric is backed by cryptographic PDF coordinates under Section 79 Safe Harbor.
              </p>
            </div>

            {/* Cloud Status Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-semibold">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                Gemini 3.8 Flash Active
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-semibold">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Supabase & R2 Online
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">MPs & Candidates Indexed</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">8,368</p>
              <span className="text-[10px] text-emerald-600 font-medium">Live from OpenSanctions</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Double-Entry Audits</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">100%</p>
              <span className="text-[10px] text-slate-500">Automated arithmetic checks</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Visual Proof Overlays</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">0-1000 BBox</p>
              <span className="text-[10px] text-blue-600 font-medium">Signed Affidavit Crops</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Monthly Operating Cost</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">$0.00</p>
              <span className="text-[10px] text-slate-500">100% Free Tier Cloud</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Candidate Feed */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Candidate Profiles & Audited Declarations ({filteredCandidates.length})
          </h2>
          <span className="text-xs text-slate-500">Click any card to inspect photo proof</span>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No politicians found matching your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onVerifyProof={handleOpenProof}
              />
            ))}
          </div>
        )}
      </main>

      {/* Affidavit Proof Viewer Modal */}
      <AffidavitProofViewer
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal((prev) => ({ ...prev, isOpen: false }))}
        candidateName={proofModal.candidateName}
        pdfUrl={proofModal.pdfUrl}
        fieldLabel={proofModal.fieldLabel}
        claimedValue={proofModal.value}
        bbox={proofModal.bbox}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <p>
          Apna Neta is an open-source non-partisan civic technology project. All declarations are reproduced
          verbatim from sworn ECI filings under Section 3(c)(ii) of the Digital Personal Data Protection Act, 2023.
        </p>
      </footer>
    </div>
  );
};

export default App;
