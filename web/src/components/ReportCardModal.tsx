import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Candidate } from '../types/candidate';
import {
  generateReportCardDataUrl,
  downloadReportCard,
  shareReportCardViaNative,
  copyReportCardImageToClipboard,
  getReportCardFactSheet,
  getWhatsAppShareUrl,
  getTwitterShareUrl,
} from '../utils/ReportCardExport';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (!isOpen || !candidate) {
      setDataUrl(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    generateReportCardDataUrl(candidate)
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate report card:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const handleDownload = async () => {
    if (!candidate) return;
    await downloadReportCard(candidate, dataUrl || undefined);
  };

  const handleShareWhatsApp = async () => {
    if (!candidate) return;
    // Attempt native file share on mobile first
    const shareResult = await shareReportCardViaNative(candidate);
    if (shareResult === 'unsupported') {
      // Fallback to WhatsApp URL intent
      const url = getWhatsAppShareUrl(candidate);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    // If shareResult === 'cancelled', user dismissed the OS share sheet - do not force popup
  };

  const handleShareTwitter = () => {
    if (!candidate) return;
    const url = getTwitterShareUrl(candidate);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyImage = async () => {
    if (!candidate) return;
    const success = await copyReportCardImageToClipboard(candidate);
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } else {
      // If image copy isn't supported, fall back to downloading
      await handleDownload();
    }
  };

  const handleCopyFactSheet = () => {
    if (!candidate) return;
    const text = getReportCardFactSheet(candidate);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-sovereign-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-dholpur-50 rounded-2xl shadow-2xl border border-kesariya-600/30 w-full max-w-2xl max-h-[92dvh] sm:max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Tiranga Accent Line */}
        <div className="tiranga-accent-bar" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-sovereign-800 bg-sovereign-950 text-white flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-kesariya-500/20 border border-kesariya-500/30 flex items-center justify-center text-kesariya-400 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-serif font-bold text-white truncate">
                Citizen Report Card Graphic • नागरिक रिपोर्ट कार्ड
              </h2>
              <p className="text-[11px] sm:text-xs text-dholpur-300 truncate">1080x1080 PNG • Ready for WhatsApp & Social</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dholpur-400 hover:text-white hover:bg-sovereign-800 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Graphic Preview */}
        <div className="p-3 sm:p-6 bg-sovereign-900/95 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[380px] max-h-[50vh] overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-dholpur-200">
              <Loader2 className="w-8 h-8 animate-spin text-kesariya-400" />
              <p className="text-xs font-mono">Generating high-contrast audit graphic...</p>
            </div>
          ) : dataUrl ? (
            <div className="relative group max-w-xs sm:max-w-md w-full shadow-2xl rounded-2xl overflow-hidden border border-kesariya-600/30 max-h-[45vh] sm:max-h-[55vh] flex items-center justify-center">
              <img
                src={dataUrl}
                alt={`${candidate.name} Civic Report Card`}
                className="w-full max-h-[45vh] sm:max-h-[55vh] object-contain select-none"
              />
            </div>
          ) : (
            <p className="text-xs text-terracotta-400">Failed to render graphic preview.</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:p-5 bg-dholpur-100 border-t border-dholpur-300 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-kesariya-600 hover:bg-kesariya-700 text-sovereign-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-harit-600 hover:bg-harit-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Post to X */}
            <button
              onClick={handleShareTwitter}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-sovereign-900 hover:bg-sovereign-800 text-dholpur-50 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
              title="Share Report Card on X (Twitter)"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Post to X</span>
            </button>

            {/* Copy Image */}
            <button
              onClick={handleCopyImage}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-dholpur-200 hover:bg-dholpur-300 text-sovereign-900 text-xs font-semibold rounded-xl border border-dholpur-300 transition-all cursor-pointer"
            >
              {copiedImage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-harit-700" />
                  <span className="text-harit-800 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            {/* Copy Fact Sheet */}
            <button
              onClick={handleCopyFactSheet}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-dholpur-200 hover:bg-dholpur-300 text-sovereign-900 text-xs font-semibold rounded-xl border border-dholpur-300 transition-all cursor-pointer col-span-2 sm:col-span-1"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-harit-700" />
                  <span className="text-harit-800 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-sovereign-600 text-center font-sans">
            Zero server computation. Rendered directly in your browser with official ECI Form 26 disclosures.
          </p>
        </div>
      </div>
    </div>
  );
};

