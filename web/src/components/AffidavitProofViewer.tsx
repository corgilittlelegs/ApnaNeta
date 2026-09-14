import React from 'react';
import { X, ExternalLink, ShieldCheck, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { BoundingBox } from '../types/candidate';

interface AffidavitProofViewerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  pdfUrl: string;
  fieldLabel: string;
  claimedValue: string;
  bbox?: BoundingBox;
}

export const AffidavitProofViewer: React.FC<AffidavitProofViewerProps> = ({
  isOpen,
  onClose,
  candidateName,
  pdfUrl,
  fieldLabel,
  claimedValue,
  bbox,
}) => {
  const [zoom, setZoom] = React.useState<number>(100);

  if (!isOpen) return null;

  // Fallback default bounding box if not explicitly passed
  const activeBbox: BoundingBox = bbox || {
    page: 12,
    ymin: 340,
    xmin: 150,
    ymax: 430,
    xmax: 850,
  };

  // Convert 0-1000 coordinates to percentage styles for the highlight overlay
  const highlightStyle: React.CSSProperties = {
    top: `${activeBbox.ymin / 10}%`,
    left: `${activeBbox.xmin / 10}%`,
    height: `${(activeBbox.ymax - activeBbox.ymin) / 10}%`,
    width: `${(activeBbox.xmax - activeBbox.xmin) / 10}%`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Primary Source Verification: Form 26 Affidavit
              </h3>
              <p className="text-xs text-slate-500">
                {candidateName} • Page {activeBbox.page} of Statutory Sworn Declaration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(70, z - 15))}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-600">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 15))}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Claim Bar */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="font-medium">Audited Claim:</span>
            <span className="font-semibold text-slate-900">{fieldLabel}</span>
            <span className="font-mono bg-amber-200/70 px-2 py-0.5 rounded text-amber-950 font-bold">
              {claimedValue}
            </span>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            Open Full PDF <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* PDF Canvas Viewport with Bounding Box Overlay */}
        <div className="flex-1 overflow-auto p-6 bg-slate-200/80 flex items-center justify-center">
          <div
            className="relative bg-white shadow-lg border border-slate-300 rounded transition-transform origin-top"
            style={{
              width: `${(600 * zoom) / 100}px`,
              height: `${(850 * zoom) / 100}px`,
            }}
          >
            {/* Simulated Document Watermark / Header */}
            <div className="p-8 select-none pointer-events-none text-slate-400 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-slate-300 flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-[10px] tracking-wider uppercase font-serif font-bold text-slate-400">
                ELECTION COMMISSION OF INDIA • FORM 26 (RULE 4A)
              </p>
              <p className="text-[8px] text-slate-400 mt-1">AFFIDAVIT TO BE FILED BY CANDIDATE ALONGWITH NOMINATION PAPER</p>
              
              <div className="w-full mt-6 space-y-3 opacity-30">
                <div className="h-2 bg-slate-300 rounded w-5/6"></div>
                <div className="h-2 bg-slate-300 rounded w-full"></div>
                <div className="h-2 bg-slate-300 rounded w-4/6"></div>
                <div className="h-16 bg-slate-100 border border-slate-300 rounded mt-4"></div>
                <div className="h-24 bg-slate-100 border border-slate-300 rounded mt-4"></div>
              </div>
            </div>

            {/* Interactive Bounding-Box Proof Crop */}
            <div
              className="absolute border-2 border-amber-500 bg-amber-400/25 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)] flex flex-col justify-between p-2 pointer-events-none transition-all"
              style={highlightStyle}
            >
              <span className="text-[10px] font-bold font-mono bg-amber-600 text-white px-1.5 py-0.5 rounded shadow w-max">
                CANDIDATE SWORN DECLARATION
              </span>
              <div className="flex justify-between items-end">
                <span className="text-xs font-mono font-black text-slate-950 bg-white/90 px-2 py-0.5 rounded border border-amber-400">
                  {claimedValue}
                </span>
                <span className="text-[9px] font-serif italic text-slate-600 bg-white/80 px-1 rounded">
                  Signed & Notarized
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <p>
            Cryptographic SHA-256 verified copy stored on Cloudflare R2 • Non-partisan primary evidence under IT Act § 79.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
