import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Bank,
  FileText,
  Scales,
  ShieldCheck,
  TrendUp,
  CaretDown,
  CaretUp,
  CheckCircle,
} from '@phosphor-icons/react';

interface CivicFaqDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FaqItem {
  id: string;
  icon: React.ReactNode;
  question: string;
  hindiQuestion: string;
  answer: string;
  keyPoints: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'mplads',
    icon: <Bank size={20} weight="duotone" className="text-kesariya-700" />,
    question: 'What is MPLADS (सांसद निधि) & can citizens suggest local works?',
    hindiQuestion: 'सांसद निधि क्या है और आम नागरिक विकास कार्य कैसे सुझा सकते हैं?',
    answer:
      'MPLADS (Member of Parliament Local Area Development Scheme) provides every Lok Sabha and Rajya Sabha MP with ₹5 Crore per year directly from the Central Government to fund local community development projects in their constituency.',
    keyPoints: [
      'Allowed works: Drinking water facilities, government school classrooms, rural roads, solar street lights, public health centers, and community halls.',
      'Citizen suggestion right: Under MoSPI guidelines, citizens and resident welfare associations (RWAs) can write directly to their MP recommending specific projects needed in their locality.',
      'Mandatory social reservation: At least 15% of the annual fund must be spent in Scheduled Caste (SC) inhabited areas and 7.5% in Scheduled Tribe (ST) areas.',
    ],
  },
  {
    id: 'form26',
    icon: <FileText size={20} weight="duotone" className="text-harit-700" />,
    question: 'What is Form 26 and why are false declarations a crime?',
    hindiQuestion: 'चुनावी हलफ़नामा (Form 26) क्या है और इसमें गलत जानकारी देना अपराध क्यों है?',
    answer:
      'Form 26 is a sworn legal affidavit that every candidate must sign under oath before a Notary or Magistrate when filing election nomination papers. It lists their complete bank balances, jewelry, real estate, debts, education, and criminal charges.',
    keyPoints: [
      'Constitutional right: Established by Supreme Court in ADR vs Union of India (2002) to guarantee voters have the right to know who they are voting for.',
      'Criminal penalty: Concealing assets or lying in Form 26 is punishable with up to 6 months imprisonment and fines under Section 125A of the Representation of the People Act, 1951.',
      'Apna Neta verification: We match the declared figures directly with the scanned government papers with pixel-accurate bounding box proof.',
    ],
  },
  {
    id: 'crime',
    icon: <Scales size={20} weight="duotone" className="text-terracotta-700" />,
    question: 'What is the difference between serious criminal charges and protest cases?',
    hindiQuestion: 'गंभीर आपराधिक मामलों और राजनीतिक प्रदर्शन के मुकदमों में क्या अंतर है?',
    answer:
      'Not all court cases are equal. Many elected leaders face FIRs for democratic protests, peaceful assemblies, or civil disobedience (e.g., Section 144 violations). Apna Neta clearly differentiates these from heinous offenses.',
    keyPoints: [
      'Protest cases: Public assembly, traffic obstruction during rallies, slogan-raising, or political agitation.',
      'Serious criminal cases: Heinous offenses under IPC / BNS such as murder, extortion, fraud, corruption (Prevention of Corruption Act), violence, or crimes against women.',
      'Disqualification (RPA Section 8): Lawmakers convicted of serious offenses with a prison sentence of 2 years or more are immediately disqualified from holding office.',
    ],
  },
  {
    id: 'wealth',
    icon: <TrendUp size={20} weight="duotone" className="text-kesariya-700" />,
    question: 'What is the Wealth Discrepancy Ratio (WDR)?',
    hindiQuestion: 'संपत्ति-आय अनुपात (WDR) क्या दर्शाता है?',
    answer:
      'WDR calculates the relationship between a candidate’s total declared net worth and the cumulative taxable income they reported in their Income Tax Returns (ITR) over the preceding 5 years.',
    keyPoints: [
      'Normal growth: Wealth accumulation funded by steady business income, investments, or inheritance with matching tax filings.',
      'Anomalous growth: Net worth rising 5x to 10x higher than declared taxable earnings, indicating disproportionate assets.',
      'Multi-term CAGR: Evaluates asset growth rates across consecutive 5-year election terms to flag sudden spikes (>300%).',
    ],
  },
  {
    id: 'verification',
    icon: <ShieldCheck size={20} weight="duotone" className="text-ashoka-700" />,
    question: 'How does Apna Neta guarantee zero synthetic or biased data?',
    hindiQuestion: 'अपना नेता निष्पक्षता और 100% सही डेटा की गारंटी कैसे देता है?',
    answer:
      'Apna Neta is completely non-partisan and relies strictly on official gazettes. Every single number, name, and court case displayed on the platform links directly to primary government source documents.',
    keyPoints: [
      'Primary sources: Election Commission of India (ECI), Parliament of India (sansad.in), MoSPI (e-SAKSHI), Ministry of Corporate Affairs (MCA21), and National Judicial Data Grid (eCourts).',
      'Zero placeholder policy: Where official records are not provided by authorities, the field is explicitly marked unverified or null.',
      'Open audits: Any citizen, journalist, or election agent can click "Verify Source" to view the exact page and row of the government document.',
    ],
  },
];

export const CivicFaqDrawer: React.FC<CivicFaqDrawerProps> = ({ isOpen, onClose }) => {
  const [expandedId, setExpandedId] = useState<string | null>('mplads');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-sovereign-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-dholpur-50 h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-kesariya-600/30">
        {/* Top Tiranga Accent Line */}
        <div className="tiranga-accent-bar" />

        {/* Drawer Header */}
        <div className="p-5 bg-sovereign-950 text-white border-b border-sovereign-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-kesariya-500/20 text-kesariya-400 rounded-xl border border-kesariya-500/30">
              <BookOpen size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-white">
                Citizen Guide • नागरिक मार्गदर्शिका
              </h2>
              <p className="text-xs text-dholpur-300">
                Understanding public records, candidate affidavits, and citizen rights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dholpur-400 hover:text-white hover:bg-sovereign-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close guide"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* FAQ Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-dholpur-100/60">
          <div className="p-3.5 bg-dholpur-50 border border-kesariya-500/30 rounded-2xl text-xs text-sovereign-950 flex items-start gap-2.5 mb-2 shadow-2xs">
            <CheckCircle size={18} weight="fill" className="text-kesariya-700 flex-shrink-0 mt-0.5" />
            <p className="font-sans leading-relaxed">
              This guide explains the key civic metrics used on Apna Neta in plain language so you
              can hold your elected representatives accountable with confidence.
            </p>
          </div>

          {FAQ_ITEMS.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="sandstone-card rounded-2xl border border-dholpur-300 shadow-2xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-dholpur-100/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-dholpur-100 rounded-lg flex-shrink-0 mt-0.5 border border-dholpur-200">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sovereign-950 text-sm leading-snug">
                        {item.question}
                      </h3>
                      <p className="text-[11px] text-sovereign-600 mt-0.5 font-medium">
                        {item.hindiQuestion}
                      </p>
                    </div>
                  </div>
                  <div className="text-sovereign-500 flex-shrink-0 mt-1">
                    {isExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-sovereign-700 border-t border-dholpur-200 space-y-2.5">
                    <p className="leading-relaxed font-sans text-sovereign-800">{item.answer}</p>
                    <div className="p-3 bg-dholpur-50 rounded-xl space-y-1.5 border border-dholpur-200/80">
                      <span className="font-semibold text-[11px] text-sovereign-900 uppercase tracking-wide block">
                        Key takeaways:
                      </span>
                      <ul className="space-y-1 text-[11.5px] text-sovereign-700 list-disc list-inside">
                        {item.keyPoints.map((pt, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-dholpur-100 border-t border-dholpur-300 text-center text-xs text-sovereign-600 font-sans">
          <p>
            Democratizing governance data for 1.4 Billion citizens •{' '}
            <strong className="text-sovereign-900 font-serif">Apna Neta (अपना नेता)</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

