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
import { useLanguage } from '../context/LanguageContext';

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
  hindiAnswer?: string;
  keyPoints: string[];
  hindiKeyPoints?: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'mplads',
    icon: <Bank size={20} weight="duotone" className="text-kesariya-700" />,
    question: 'What is MPLADS & can citizens suggest local works?',
    hindiQuestion: 'सांसद निधि क्या है और आम नागरिक विकास कार्य कैसे सुझा सकते हैं?',
    answer:
      'MPLADS (Member of Parliament Local Area Development Scheme) provides every Lok Sabha and Rajya Sabha MP with ₹5 Crore per year directly from the Central Government to fund local community development projects in their constituency.',
    hindiAnswer:
      'सांसद स्थानीय क्षेत्र विकास योजना (MPLADS) के तहत प्रत्येक लोकसभा और राज्यसभा सांसद को उनके निर्वाचन क्षेत्र में स्थानीय विकास कार्यों के लिए केंद्र सरकार से प्रति वर्ष ₹5 करोड़ की निधि मिलती है।',
    keyPoints: [
      'Allowed works: Drinking water facilities, government school classrooms, rural roads, solar street lights, public health centers, and community halls.',
      'Citizen suggestion right: Under MoSPI guidelines, citizens and resident welfare associations (RWAs) can write directly to their MP recommending specific projects needed in their locality.',
      'Mandatory social reservation: At least 15% of the annual fund must be spent in Scheduled Caste (SC) inhabited areas and 7.5% in Scheduled Tribe (ST) areas.',
    ],
    hindiKeyPoints: [
      'अनुमत कार्य: पेयजल व्यवस्था, सरकारी स्कूल भवन, ग्रामीण सड़कें, सोलर स्ट्रीट लाइटें, प्राथमिक स्वास्थ्य केंद्र व सामुदायिक भवन।',
      'नागरिक सुझाव अधिकार: सांख्यिकी मंत्रालय (MoSPI) के दिशानिर्देशों के तहत नागरिक व RWA अपने सांसद को क्षेत्र के आवश्यक कार्यों की लिखित अनुशंसा भेज सकते हैं।',
      'अनिवार्य सामाजिक आरक्षण: वार्षिक निधि का कम से कम 15% अनुसूचित जाति (SC) और 7.5% अनुसूचित जनजाति (ST) बाहुल्य क्षेत्रों में खर्च होना अनिवार्य है।',
    ],
  },
  {
    id: 'form26',
    icon: <FileText size={20} weight="duotone" className="text-harit-700" />,
    question: 'What is Form 26 and why are false declarations a crime?',
    hindiQuestion: 'चुनावी हलफ़नामा (Form 26) क्या है और इसमें गलत जानकारी देना अपराध क्यों है?',
    answer:
      'Form 26 is a sworn legal affidavit that every candidate must sign under oath before a Notary or Magistrate when filing election nomination papers. It lists their complete bank balances, jewelry, real estate, debts, education, and criminal charges.',
    hindiAnswer:
      'प्रपत्र 26 (Form 26) एक कानूनी शपथपत्र है जिसे प्रत्येक प्रत्याशी को चुनाव नामांकन के समय नोटरी या मजिस्ट्रेट के समक्ष शपथपूर्वक दाखिल करना होता है। इसमें बैंक बैलेंस, संपत्ति, देनदारियां, शिक्षा और मुकदमों का पूरा ब्योरा होता है।',
    keyPoints: [
      'Constitutional right: Established by Supreme Court in ADR vs Union of India (2002) to guarantee voters have the right to know who they are voting for.',
      'Criminal penalty: Concealing assets or lying in Form 26 is punishable with up to 6 months imprisonment and fines under Section 125A of the Representation of the People Act, 1951.',
      'Apna Neta verification: We match the declared figures directly with the scanned government papers with pixel-accurate bounding box proof.',
    ],
    hindiKeyPoints: [
      'संवैधानिक अधिकार: सुप्रीम कोर्ट ने ADR बनाम भारत संघ (2002) मामले में मतदाताओं के जानने के अधिकार को मौलिक अधिकार माना।',
      'आपराधिक दंड: प्रपत्र 26 में संपत्ति छिपाना या झूठ बोलना जनप्रतिनिधित्व कानून 1951 की धारा 125A के तहत 6 माह तक के कारावास व जुर्माने से दंडनीय है।',
      'सत्यापन: अपना नेता पर प्रत्येक आंकड़े को मूल सरकारी स्कैन कॉपी से सत्यापित कर दिखाया जाता है।',
    ],
  },
  {
    id: 'crime',
    icon: <Scales size={20} weight="duotone" className="text-terracotta-700" />,
    question: 'What is the difference between serious criminal charges and protest cases?',
    hindiQuestion: 'गंभीर आपराधिक मामलों और राजनीतिक प्रदर्शन के मुकदमों में क्या अंतर है?',
    answer:
      'Not all court cases are equal. Many elected leaders face FIRs for democratic protests, peaceful assemblies, or civil disobedience (e.g., Section 144 violations). Apna Neta clearly differentiates these from heinous offenses.',
    hindiAnswer:
      'सभी मुकदमे एक समान नहीं होते। कई जनप्रतिनिधियों पर लोकतांत्रिक प्रदर्शन, धरना या धारा 144 उल्लंघन के मामले दर्ज होते हैं। अपना नेता इन्हें जघन्य अपराधों से स्पष्ट रूप से अलग करता है।',
    keyPoints: [
      'Protest cases: Public assembly, traffic obstruction during rallies, slogan-raising, or political agitation.',
      'Serious criminal cases: Heinous offenses under IPC / BNS such as murder, extortion, fraud, corruption (Prevention of Corruption Act), violence, or crimes against women.',
      'Disqualification (RPA Section 8): Lawmakers convicted of serious offenses with a prison sentence of 2 years or more are immediately disqualified from holding office.',
    ],
    hindiKeyPoints: [
      'प्रदर्शन मामले: जनसभा, रैली में यातायात अवरोध, नारेबाजी या शांतिपूर्ण राजनीतिक आंदोलन।',
      'गंभीर मामले: हत्या, फिरौती, धोखाधड़ी, भ्रष्टाचार, हिंसा या महिलाओं के विरुद्ध अपराध जैसे जघन्य मामले।',
      'अयोग्यता (धारा 8 RPA): 2 वर्ष या अधिक की सजा होने पर सांसद/विधायक तुरंत पद से अयोग्य हो जाते हैं।',
    ],
  },
  {
    id: 'wealth',
    icon: <TrendUp size={20} weight="duotone" className="text-kesariya-700" />,
    question: 'What is the Wealth Discrepancy Ratio (WDR)?',
    hindiQuestion: 'संपत्ति-आय अनुपात (WDR) क्या दर्शाता है?',
    answer:
      'WDR calculates the relationship between a candidate’s total declared net worth and the cumulative taxable income they reported in their Income Tax Returns (ITR) over the preceding 5 years.',
    hindiAnswer:
      'WDR किसी प्रत्याशी की कुल घोषित संपत्ति और पिछले 5 वर्षों में उनके द्वारा दाखिल आयकर रिटर्न (ITR) की कुल कर योग्य आय के बीच का अनुपात निकालता है।',
    keyPoints: [
      'Normal growth: Wealth accumulation funded by steady business income, investments, or inheritance with matching tax filings.',
      'Anomalous growth: Net worth rising 5x to 10x higher than declared taxable earnings, indicating disproportionate assets.',
      'Multi-term CAGR: Evaluates asset growth rates across consecutive 5-year election terms to flag sudden spikes (>300%).',
    ],
    hindiKeyPoints: [
      'सामान्य वृद्धि: कारोबार, निवेश या पैतृक संपत्ति से होने वाली ऐसी वृद्धि जो आयकर विवरण से मेल खाती हो।',
      'असामान्य वृद्धि: जब कुल संपत्ति घोषित कर योग्य आय से 5 से 10 गुना अधिक तेज़ी से बढ़ती है।',
      'दीर्घकालिक CAGR: लगातार चुनावी कार्यकालों में संपत्ति की वृद्धि दर का आकलन कर 300% से अधिक के उछाल को चिन्हित करना।',
    ],
  },
  {
    id: 'verification',
    icon: <ShieldCheck size={20} weight="duotone" className="text-ashoka-700" />,
    question: 'How does Apna Neta guarantee zero synthetic or biased data?',
    hindiQuestion: 'अपना नेता निष्पक्षता और 100% सही डेटा की गारंटी कैसे देता है?',
    answer:
      'Apna Neta is completely non-partisan and relies strictly on official gazettes. Every single number, name, and court case displayed on the platform links directly to primary government source documents.',
    hindiAnswer:
      'अपना नेता पूरी तरह गैर-पक्षपाती है और केवल आधिकारिक राजपत्रों पर निर्भर करता है। मंच पर प्रदर्शित प्रत्येक आंकड़ा, नाम और मुकदमा सीधे सरकारी दस्तावेज़ से जुड़ा है।',
    keyPoints: [
      'Primary sources: Election Commission of India (ECI), Parliament of India (sansad.in), MoSPI (e-SAKSHI), Ministry of Corporate Affairs (MCA21), and National Judicial Data Grid (eCourts).',
      'Zero placeholder policy: Where official records are not provided by authorities, the field is explicitly marked unverified or null.',
      'Open audits: Any citizen, journalist, or election agent can click "Verify Source" to view the exact page and row of the government document.',
    ],
    hindiKeyPoints: [
      'प्राथमिक स्रोत: भारतीय चुनाव आयोग (ECI), भारतीय संसद (sansad.in), सांख्यिकी मंत्रालय (e-SAKSHI), कॉर्पोरेट कार्य मंत्रालय (MCA21) व ई-कोर्ट्स।',
      'शून्य कृत्रिम डेटा नीति: यदि सरकारी रिकॉर्ड उपलब्ध नहीं है, तो उसे स्पष्ट रूप से खाली या असत्यापित दिखाया जाता है।',
      'खुली पड़ताल: कोई भी नागरिक या पत्रकार "जाँच करें" पर क्लिक कर मूल सरकारी दस्तावेज़ का संबंधित पृष्ठ देख सकता है।',
    ],
  },
];

export const CivicFaqDrawer: React.FC<CivicFaqDrawerProps> = ({ isOpen, onClose }) => {
  const [expandedId, setExpandedId] = useState<string | null>('mplads');
  const { isHindi } = useLanguage();

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
                {isHindi ? 'नागरिक मार्गदर्शिका' : 'Citizen Guide'}
              </h2>
              <p className="text-xs text-dholpur-300">
                {isHindi
                  ? 'सार्वजनिक रिकॉर्ड्स, हलफ़नामे एवं नागरिक अधिकारों की सरल समझ'
                  : 'Understanding public records, candidate affidavits, and citizen rights'}
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
              {isHindi
                ? 'यह मार्गदर्शिका अपना नेता पर उपयोग किए जाने वाले प्रमुख नागरिक मानकों को सरल भाषा में समझाती है ताकि आप आत्मविश्वास से अपने सांसदों से जवाबदेही मांग सकें।'
                : 'This guide explains the key civic metrics used on Apna Neta in plain language so you can hold your elected representatives accountable with confidence.'}
            </p>
          </div>

          {FAQ_ITEMS.map((item) => {
            const isExpanded = expandedId === item.id;
            const currentQuestion = isHindi ? item.hindiQuestion : item.question;
            const currentAnswer = isHindi && item.hindiAnswer ? item.hindiAnswer : item.answer;
            const currentKeyPoints = isHindi && item.hindiKeyPoints ? item.hindiKeyPoints : item.keyPoints;

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
                        {currentQuestion}
                      </h3>
                    </div>
                  </div>
                  <div className="text-sovereign-500 flex-shrink-0 mt-1">
                    {isExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-sovereign-700 border-t border-dholpur-200 space-y-2.5">
                    <p className="leading-relaxed font-sans text-sovereign-800">{currentAnswer}</p>
                    <div className="p-3 bg-dholpur-50 rounded-xl space-y-1.5 border border-dholpur-200/80">
                      <span className="font-semibold text-[11px] text-sovereign-900 uppercase tracking-wide block">
                        {isHindi ? 'मुख्य बिंदु:' : 'Key takeaways:'}
                      </span>
                      <ul className="space-y-1 text-[11.5px] text-sovereign-700 list-disc list-inside">
                        {currentKeyPoints.map((pt, idx) => (
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
            {isHindi
              ? '1.4 अरब नागरिकों के लिए शासन संबंधी डेटा का लोकतंत्रीकरण • '
              : 'Democratizing governance data for 1.4 Billion citizens • '}
            <strong className="text-sovereign-900 font-serif">
              {isHindi ? 'अपना नेता' : 'Apna Neta'}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
};

