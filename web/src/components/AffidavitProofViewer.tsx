import React from 'react';
import { ArrowSquareOut, FilePdf, WarningCircle, X } from '@phosphor-icons/react';
import { BoundingBox, Candidate } from '../types/candidate';
import { useDialogAccessibility } from '../utils/useDialogAccessibility';

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

function officialPdfUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (url.protocol === 'https:' && (host === 'eci.gov.in' || host.endsWith('.eci.gov.in'))) {
      return url.href;
    }
  } catch {
    // A missing or malformed source is displayed as unavailable.
  }
  return null;
}

const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export const AffidavitProofViewer: React.FC<AffidavitProofViewerProps> = ({
  isOpen, onClose, candidateName, pdfUrl, fieldLabel, claimedValue, bbox, candidate,
}) => {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  if (!isOpen) return null;

  const sourceUrl = officialPdfUrl(pdfUrl);
  const page = bbox?.page && bbox.page > 0 ? Math.floor(bbox.page) : 1;
  const documentUrl = sourceUrl ? (() => {
    const url = new URL(sourceUrl);
    url.hash = `page=${page}`;
    return url.href;
  })() : null;
  const auditStatus = candidate?.affidavit_status === 'audited'
    ? candidate.has_arithmetic_discrepancy ? 'Arithmetic discrepancy recorded' : 'Arithmetic audit recorded without a discrepancy'
    : 'Arithmetic audit unavailable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sovereign-950/85 p-2 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="affidavit-proof-title"
        tabIndex={-1}
        className="flex h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-dholpur-50 shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-sovereign-700 bg-sovereign-950 p-4 text-white">
          <div>
            <h2 id="affidavit-proof-title" className="font-serif text-lg font-bold">Official affidavit source</h2>
            <p className="mt-1 text-sm text-dholpur-200">{candidateName} · {candidate?.constituency || 'Constituency unavailable'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close affidavit source" className="rounded-lg p-2 text-white hover:bg-sovereign-800">
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex min-h-0 flex-col bg-dholpur-100">
            {documentUrl ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dholpur-300 bg-white px-4 py-2 text-xs">
                  <span>ECI source document · page {page}</span>
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ashoka-700 underline">
                    Open at ECI <ArrowSquareOut size={14} />
                  </a>
                </div>
                <iframe title={`ECI affidavit for ${candidateName}`} src={documentUrl} className="min-h-[45vh] w-full flex-1" />
                <p className="border-t border-dholpur-300 bg-white px-4 py-2 text-xs text-sovereign-600">
                  If the ECI portal blocks embedded viewing, use “Open at ECI”. The source PDF is shown without alteration.
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sovereign-700">
                <WarningCircle size={32} />
                <p className="font-semibold">An official ECI PDF link is unavailable for this record.</p>
                <p className="max-w-md text-sm">No affidavit image or extracted text is generated as a substitute.</p>
              </div>
            )}
          </div>

          <aside className="overflow-y-auto border-t border-dholpur-300 bg-white p-5 md:border-l md:border-t-0">
            <h3 className="font-serif font-bold text-sovereign-950">Recorded field</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-sovereign-500">Field</dt><dd className="font-semibold">{fieldLabel}</dd></div>
              <div><dt className="text-sovereign-500">Stored value</dt><dd className="font-semibold">{claimedValue || 'Unavailable'}</dd></div>
              <div><dt className="text-sovereign-500">Audit status</dt><dd>{auditStatus}</dd></div>
              {candidate?.affidavit_status === 'audited' && (
                <div><dt className="text-sovereign-500">Movable asset delta</dt><dd>{formatINR(candidate.delta_movable)}</dd></div>
              )}
              {bbox && <div><dt className="text-sovereign-500">Recorded page</dt><dd>{page}; source coordinates are available but are not overlaid on this PDF.</dd></div>}
            </dl>
            <div className="mt-6 rounded-xl border border-kesariya-200 bg-kesariya-50 p-3 text-xs leading-relaxed text-sovereign-800">
              <FilePdf size={18} className="mb-2" />
              Source filings are governed by Form 26 and Rule 4A of the Conduct of Elections Rules, 1961. A displayed PDF link does not establish that every field has been independently verified.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
