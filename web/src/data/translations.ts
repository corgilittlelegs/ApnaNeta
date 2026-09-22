export type Language = 'en' | 'hi';

export interface Translations {
  // Brand & Navigation
  brandName: string;
  brandTagline: string;
  searchPlaceholderCitizen: string;
  searchPlaceholderForensic: string;
  guideButton: string;
  guideButtonMobile: string;
  guideTooltip: string;
  filterByHouse: string;
  allHouses: string;
  lokSabha: string;
  rajyaSabha: string;
  vidhanSabha: string;
  tabDirectory: string;
  tabLeaderboards: string;
  tabVerification: string;
  modeLabel: string;
  modeCitizen: string;
  modeForensic: string;
  modeCitizenTooltip: string;
  modeForensicTooltip: string;

  // National Overview Masthead
  overviewBadgeCitizen: string;
  overviewBadgeForensic: string;
  overviewGazetteCitizen: string;
  overviewGazetteForensic: string;
  overviewTitleCitizen: string;
  overviewSubtitleCitizen: string;
  overviewTitleForensic: string;
  overviewDescCitizen: string;
  overviewDescForensic: string;

  // Telemetry Cards
  telemetryTotalMps: string;
  telemetryLiveSupabase: string;
  telemetryVerifiedOpenRecords: string;
  telemetryAssetsTotal: string;
  telemetryAssetsSubtitle: string;
  telemetryCriminalCases: string;
  telemetryCriminalSubtitle: string;
  telemetryMpladsRate: string;

  // Constituency & Forensic Filter Dock
  filterDockTitle: string;
  filterDockSubtitle: string;
  matchingMps: (count: number) => string;
  resetAllFilters: string;
  quickFilterLabel: string;
  pillAllSeats: string;
  pillDiscrepancies: string;
  pillWealthSurge: string;
  pillDeclaredCharges: string;
  labelState: string;
  labelConstituency: string;
  labelParty: string;
  labelAuditFlag: string;
  labelNetWorth: string;
  allStates: (count: number) => string;
  allConstituencies: (count: number) => string;
  allParties: (count: number) => string;
  optAllCandidates: string;
  optDiscrepancies: string;
  optHighWdr: string;
  optCriminalCharges: string;
  optLowMplads: string;
  optWealthSurge: string;
  optAllWealthTiers: string;
  optWealth100CrPlus: string;
  optWealth10CrTo100Cr: string;
  optWealth1CrTo10Cr: string;
  optWealthUnder1Cr: string;

  // Candidate Directory Feed
  profilesHeading: (count: number) => string;
  inspectHint: string;
  searchingDatabase: string;
  connecting: string;
  dbNotConnectedTitle: string;
  dbNotConnectedDesc: string;
  noParliamentariansFound: string;
  loadMoreRemaining: (remaining: number) => string;
  loadMoreTotal: (showing: number, total: number) => string;
  loadingMore: string;

  // Candidate Card
  verifiedForm26: string;
  compareBtn: string;
  addedBtn: string;
  summaryLabel: string;
  cardCrime: string;
  cardMplads: string;
  cardAttendance: string;
  cardExpense: string;
  cardWealth: string;
  cleanRecord: string;
  protestCases: string;
  seriousCases: (n: number) => string;
  barredByLaw: string;
  zeroCharges: string;
  casesCount: (n: number) => string;
  statusMajor: string;
  statusAgitation: string;
  statusClean: string;
  notAnMp: string;
  unspentBalance: (amount: string) => string;
  mpladsGood: string;
  mpladsModerate: string;
  mpladsLagging: string;
  attendanceActive: string;
  attendanceBelowAvg: string;
  questionsAsked: (n: number) => string;
  sessionParticipation: string;
  expenseFiledOnTime: string;
  expenseOverBudget: string;
  expenseWithinLimit: string;
  expenseNonCompliant: string;
  expenseNotReported: string;
  wealthSurgeAlert: string;
  wealthStable: string;
  labelNetWorthCard: string;
  labelCriminalRecordCard: string;
  labelPartySwitchCard: string;
  labelMpladsCard: string;
  labelAttendanceCard: string;
  verifiedCivicStamp: string;
  viewAffidavitBtn: string;
  dossierPdfBtn: string;
  reportCardBtn: string;

  // Comparison & Drawers
  compareDrawerLabel: string;
  compareSideBySide: string;
  compareClear: string;
  mobileTabDirectory: string;
  mobileTabLeaderboards: string;
  mobileTabGuide: string;

  // Civic Explainer
  civicExplainerTitle: string;
  whyItMatters: string;
  sourceAuthority: string;

  // Affidavit Proof Viewer Modal
  proofModalTitle: string;
  proofEvidenceTag: string;
  proofTabTranscript: string;
  proofTabIntegrity: string;
  proofTabMplads: string;
  proofTabWealth: string;
  proofTabRawPdf: string;
  proofViewerTitle: string;
  proofVerifyAffidavit: string;
  proofAffidavitVerified: string;
  proofViewLegalActions: string;
  proofDownloadAuditReport: string;
  proofFilingSections: string;
  proofFourParts: string;
  proofPart1Title: string;
  proofPart1Sub: string;
  proofPart2Title: string;
  proofPart2Sub: string;
  proofPart3Title: string;
  proofPart3Sub: string;
  proofPart4Title: string;
  proofPart4Sub: string;
  proofDocPart1Header: string;
  proofDocPart2Header: string;
  proofDocPart3Header: string;
  proofDocPart4Header: string;
  proofAuditTraceTitle: string;
  proofAuditTraceSub: string;
  proofCloseProof: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Brand & Navigation
    brandName: 'Apna Neta',
    brandTagline: 'The Sovereign Civic Ledger of Bharat',
    searchPlaceholderCitizen: 'Search candidate name, constituency, or party...',
    searchPlaceholderForensic: 'Search politician, constituency, or ECI docket...',
    guideButton: 'Civic Guide',
    guideButtonMobile: 'Guide',
    guideTooltip: 'Open Citizen Guide & FAQ',
    filterByHouse: 'Filter by House',
    allHouses: 'All Houses',
    lokSabha: 'Lok Sabha',
    rajyaSabha: 'Rajya Sabha',
    vidhanSabha: 'Vidhan Sabha',
    tabDirectory: 'Directory',
    tabLeaderboards: 'Leaderboards',
    tabVerification: 'Verification',
    modeLabel: 'Mode:',
    modeCitizen: 'Citizen',
    modeForensic: 'Forensic',
    modeCitizenTooltip: 'Currently in Citizen Mode (Plain Language & Practical Impact). Click to switch to Forensic Mode.',
    modeForensicTooltip: 'Currently in Forensic Mode (Statutory Citations & Coordinate Proof). Click to switch to Citizen Mode.',

    // National Overview Masthead
    overviewBadgeCitizen: 'Sovereign Citizen Transparency',
    overviewBadgeForensic: 'Section 79 Evidentiary Safe Harbor',
    overviewGazetteCitizen: 'Official Government Gazettes',
    overviewGazetteForensic: 'ECI Form 26 Sworn Disclosures',
    overviewTitleCitizen: 'National Overview',
    overviewSubtitleCitizen: 'Parliamentary Transparency & Public Fund Audit',
    overviewTitleForensic: 'Empirical Political Accountability & Forensic Audits',
    overviewDescCitizen:
      'Inspect your Member of Parliament (MP): their local development fund (MPLADS) utilization, declared wealth growth rate, and parliamentary attendance & questions. Every fact is verified against official sworn affidavits.',
    overviewDescForensic:
      'Automated civic intelligence cross-referencing ECI affidavits, Sansad parliamentary participation, and MoSPI public fund flows. Every metric is bound to cryptographic PDF coordinates.',

    // Telemetry Cards
    telemetryTotalMps: 'Total MPs Tracked',
    telemetryLiveSupabase: 'Live Database',
    telemetryVerifiedOpenRecords: 'Verified Records',
    telemetryAssetsTotal: 'Declared Assets Total',
    telemetryAssetsSubtitle: 'Movable + Immovable',
    telemetryCriminalCases: 'Pending Criminal Cases',
    telemetryCriminalSubtitle: 'ECI Sworn Dockets',
    telemetryMpladsRate: 'MPLADS Fund Utilization Rate',

    // Constituency & Forensic Filter Dock
    filterDockTitle: 'Constituency & Forensic Filter Dock',
    filterDockSubtitle: "Audit across India's 543 Lok Sabha seats, sworn Form 26 disclosures, and algorithmic checks",
    matchingMps: (count: number) => `${count.toLocaleString()} matching MP${count === 1 ? '' : 's'}`,
    resetAllFilters: 'Reset All',
    quickFilterLabel: 'Quick Filters:',
    pillAllSeats: 'All 543 Lok Sabha',
    pillDiscrepancies: 'Discrepancies',
    pillWealthSurge: 'Wealth Surge (≥300%)',
    pillDeclaredCharges: 'Declared Charges',
    labelState: 'State / UT',
    labelConstituency: 'Constituency',
    labelParty: 'Political Party',
    labelAuditFlag: 'Audit Flag',
    labelNetWorth: 'Net Worth',
    allStates: (count: number) => `All States / UTs (${count})`,
    allConstituencies: (count: number) => `All Constituencies (${count})`,
    allParties: (count: number) => `All Parties (${count})`,
    optAllCandidates: 'All Candidates',
    optDiscrepancies: 'Discrepancies (Math Variance)',
    optHighWdr: 'High Wealth-to-Income',
    optCriminalCharges: 'Criminal Charges',
    optLowMplads: 'Low Fund Usage (<60%)',
    optWealthSurge: 'Wealth Surge (≥300%)',
    optAllWealthTiers: 'All Wealth Tiers',
    optWealth100CrPlus: '₹100 Cr+ (Ultra Wealthy)',
    optWealth10CrTo100Cr: '₹10 Cr – ₹100 Cr',
    optWealth1CrTo10Cr: '₹1 Cr – ₹10 Cr',
    optWealthUnder1Cr: 'Under ₹1 Cr',

    // Candidate Directory Feed
    profilesHeading: (count: number) => `Parliamentary Profiles & Audited Declarations (${count.toLocaleString()})`,
    inspectHint: 'Click any card to inspect photo proof or export dossier',
    searchingDatabase: 'Searching database...',
    connecting: 'Connecting...',
    dbNotConnectedTitle: 'Live Database Not Connected',
    dbNotConnectedDesc:
      'ApnaNeta operates strictly on authentic government data with zero synthetic placeholders under the Strict Zero-Synthetic-Data Invariant. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to query verified records.',
    noParliamentariansFound: 'No parliamentarians found matching your selected filters.',
    loadMoreRemaining: (remaining: number) => `Load More Parliamentarians (${remaining} remaining in view)`,
    loadMoreTotal: (showing: number, total: number) => `Load More from Database (Showing ${showing} of ${total})`,
    loadingMore: 'Loading more parliamentarians...',

    // Candidate Card
    verifiedForm26: 'ECI Form 26 Verified',
    compareBtn: 'Compare',
    addedBtn: 'Added',
    summaryLabel: 'Summary',
    cardCrime: 'Crime',
    cardMplads: 'MPLADS Funds',
    cardAttendance: 'Attendance',
    cardExpense: 'Expense',
    cardWealth: 'Wealth',
    cleanRecord: 'Clean Record',
    protestCases: 'Protest / Agitation',
    seriousCases: (n: number) => `${n} Serious Case${n === 1 ? '' : 's'}`,
    barredByLaw: 'Barred by Law',
    zeroCharges: '0 Charges Filed',
    casesCount: (n: number) => `${n} Case${n === 1 ? '' : 's'}`,
    statusMajor: '🔴 Major',
    statusAgitation: '🟡 Agitation',
    statusClean: '🟢 Clean',
    notAnMp: 'Not an MP',
    unspentBalance: (amount: string) => `Unspent: ${amount}`,
    mpladsGood: '🟢 Good Spend',
    mpladsModerate: '🟡 Moderate',
    mpladsLagging: '🔴 Lagging',
    attendanceActive: 'Active',
    attendanceBelowAvg: 'Below Average',
    questionsAsked: (n: number) => `${n} Questions Asked`,
    sessionParticipation: 'Session Participation',
    expenseFiledOnTime: 'Filed On-Time',
    expenseOverBudget: 'Over Budget',
    expenseWithinLimit: 'Within Limit',
    expenseNonCompliant: 'Non-Compliant',
    expenseNotReported: 'Not Reported',
    wealthSurgeAlert: '⚠️ Rapid Accumulation',
    wealthStable: 'Stable Growth',
    labelNetWorthCard: 'Declared Net Worth',
    labelCriminalRecordCard: 'Criminal Record',
    labelPartySwitchCard: 'Party Switch',
    labelMpladsCard: 'MP Local Fund:',
    labelAttendanceCard: 'Sansad Attendance:',
    verifiedCivicStamp: 'Verified Civic Record • RPA 1951 Sworn Affidavit',
    viewAffidavitBtn: 'Form 26 Proof',
    dossierPdfBtn: 'Dossier PDF',
    reportCardBtn: 'Report Card',

    // Comparison & Drawers
    compareDrawerLabel: 'Compare:',
    compareSideBySide: 'Side-by-Side',
    compareClear: 'Clear',
    mobileTabDirectory: 'Directory',
    mobileTabLeaderboards: 'Leaderboards',
    mobileTabGuide: 'Guide',

    // Civic Explainer
    civicExplainerTitle: 'Civic Explainer',
    whyItMatters: 'Why It Matters:',
    sourceAuthority: 'Source Authority:',

    // Affidavit Proof Viewer Modal
    proofModalTitle: 'Forensic Affidavit Verification & Legal Audit',
    proofEvidenceTag: 'Section 79 Evidence',
    proofTabTranscript: 'Form 26 Transcript',
    proofTabIntegrity: 'Integrity & Conflicts',
    proofTabMplads: 'MPLADS Works',
    proofTabWealth: '10-Yr Wealth',
    proofTabRawPdf: 'Raw ECI PDF',
    proofViewerTitle: 'ILLUMINATED CONSTITUTIONAL DOCUMENT VIEWER',
    proofVerifyAffidavit: 'VERIFY AFFIDAVIT',
    proofAffidavitVerified: 'AFFIDAVIT VERIFIED ✓',
    proofViewLegalActions: 'VIEW LEGAL ACTIONS',
    proofDownloadAuditReport: 'DOWNLOAD AUDIT REPORT',
    proofFilingSections: 'FILING SECTIONS',
    proofFourParts: '4 Parts',
    proofPart1Title: 'Part 1: Sworn Identity & Oath',
    proofPart1Sub: 'ECI Form 26 Preamble',
    proofPart2Title: 'Part 2: PAN & 5-Yr Income',
    proofPart2Sub: 'ITR Assessment',
    proofPart3Title: 'Part 3: Movable & Immovable',
    proofPart3Sub: 'Asset Reconciler',
    proofPart4Title: 'Part 4: Judicial Dockets',
    proofPart4Sub: 'Notary Verification',
    proofDocPart1Header: 'PART 1: SWORN IDENTITY & PREAMBLE',
    proofDocPart2Header: 'PART 2: PAN & 5-YEAR INCOME TAX RETURNS',
    proofDocPart3Header: 'PART 3: MOVABLE & IMMOVABLE ASSETS',
    proofDocPart4Header: 'PART 4: JUDICIAL DOCKETS & NOTARY VERIFICATION',
    proofAuditTraceTitle: 'AUTOMATED ALGORITHMIC AUDIT TRACE',
    proofAuditTraceSub: 'Real-time Forensic Verification',
    proofCloseProof: 'Close Proof',
  },

  hi: {
    // Brand & Navigation
    brandName: 'अपना नेता',
    brandTagline: 'भारत का संप्रभु नागरिक बहीखाता',
    searchPlaceholderCitizen: 'सांसद, निर्वाचन क्षेत्र या दल खोजें...',
    searchPlaceholderForensic: 'जनप्रतिनिधि, निर्वाचन क्षेत्र या चुनाव आयोग दस्तावेज़ खोजें...',
    guideButton: 'मार्गदर्शिका',
    guideButtonMobile: 'गाइड',
    guideTooltip: 'नागरिक मार्गदर्शिका एवं सामान्य प्रश्न खोलें',
    filterByHouse: 'सदन अनुसार फ़िल्टर',
    allHouses: 'सभी सदन',
    lokSabha: 'लोक सभा',
    rajyaSabha: 'राज्य सभा',
    vidhanSabha: 'विधान सभा',
    tabDirectory: 'निर्देशिका',
    tabLeaderboards: 'रैंकिंग',
    tabVerification: 'सत्यापन',
    modeLabel: 'मोड:',
    modeCitizen: 'नागरिक',
    modeForensic: 'विधिक',
    modeCitizenTooltip: 'वर्तमान में नागरिक मोड (सरल भाषा एवं व्यावहारिक प्रभाव)। विधिक मोड में बदलने के लिए क्लिक करें।',
    modeForensicTooltip: 'वर्तमान में विधिक मोड (वैधानिक संदर्भ एवं दस्तावेज़ी साक्ष्य)। नागरिक मोड में बदलने के लिए क्लिक करें।',

    // National Overview Masthead
    overviewBadgeCitizen: 'संप्रभु नागरिक पारदर्शिता',
    overviewBadgeForensic: 'धारा 79 साक्ष्य सुरक्षा मानक',
    overviewGazetteCitizen: 'आधिकारिक सरकारी राजपत्र',
    overviewGazetteForensic: 'चुनाव आयोग प्रपत्र 26 शपथपत्र',
    overviewTitleCitizen: 'राष्ट्रीय अवलोकन',
    overviewSubtitleCitizen: 'संसदीय पारदर्शिता एवं सार्वजनिक कोष लेखापरीक्षण',
    overviewTitleForensic: 'संसदीय जवाबदेही एवं विधि सम्मत विश्लेषण',
    overviewDescCitizen:
      'अपने सांसद (MP) का विवरण देखें: उनके स्थानीय क्षेत्र विकास कोष (सांसद निधि) का उपयोग, घोषित संपत्ति की वृद्धि दर, और संसद में उपस्थिति व प्रश्न। हर तथ्य आधिकारिक शपथपत्रों से सत्यापित है।',
    overviewDescForensic:
      'चुनाव आयोग के शपथपत्रों, संसद में भागीदारी और सांसद निधि के आधिकारिक आंकड़ों का स्वचालित विश्लेषण। प्रत्येक तथ्य मूल सरकारी दस्तावेज़ से प्रमाणित है।',

    // Telemetry Cards
    telemetryTotalMps: 'कुल सांसद',
    telemetryLiveSupabase: 'लाइव डेटाबेस',
    telemetryVerifiedOpenRecords: 'सत्यापित रिकॉर्ड्स',
    telemetryAssetsTotal: 'कुल घोषित संपत्ति',
    telemetryAssetsSubtitle: 'चल + अचल संपत्ति',
    telemetryCriminalCases: 'लंबित आपराधिक मामले',
    telemetryCriminalSubtitle: 'शपथपत्र में दर्ज मामले',
    telemetryMpladsRate: 'सांसद निधि उपयोग दर',

    // Constituency & Forensic Filter Dock
    filterDockTitle: 'संसदीय क्षेत्र एवं जांच फ़िल्टर',
    filterDockSubtitle: 'देश की 543 लोकसभा सीटों, प्रपत्र 26 शपथपत्रों एवं आधिकारिक रिकॉर्ड्स की पड़ताल',
    matchingMps: (count: number) => `${count.toLocaleString()} संबंधित सांसद`,
    resetAllFilters: 'पुनः सेट करें',
    quickFilterLabel: 'त्वरित फ़िल्टर:',
    pillAllSeats: 'सभी 543 सीटें',
    pillDiscrepancies: 'विसंगतियाँ',
    pillWealthSurge: 'त्वरित संपत्ति वृद्धि (≥300%)',
    pillDeclaredCharges: 'आपराधिक आरोप',
    labelState: 'राज्य / केंद्र शासित प्रदेश',
    labelConstituency: 'निर्वाचन क्षेत्र',
    labelParty: 'राजनीतिक दल',
    labelAuditFlag: 'ऑडिट फ़्लैग',
    labelNetWorth: 'कुल संपत्ति',
    allStates: (count: number) => `सभी राज्य / केंद्र शासित प्रदेश (${count})`,
    allConstituencies: (count: number) => `सभी निर्वाचन क्षेत्र (${count})`,
    allParties: (count: number) => `सभी दल (${count})`,
    optAllCandidates: 'सभी प्रत्याशी',
    optDiscrepancies: 'गणितीय विसंगतियाँ',
    optHighWdr: 'आय से अधिक संपत्ति',
    optCriminalCharges: 'आपराधिक मामले',
    optLowMplads: 'कम निधि खर्च (<60%)',
    optWealthSurge: 'तीव्र संपत्ति वृद्धि (≥300%)',
    optAllWealthTiers: 'सभी संपत्ति वर्ग',
    optWealth100CrPlus: '₹100 करोड़+ (अति समृद्ध)',
    optWealth10CrTo100Cr: '₹10 करोड़ – ₹100 करोड़',
    optWealth1CrTo10Cr: '₹1 करोड़ – ₹10 करोड़',
    optWealthUnder1Cr: '₹1 करोड़ से कम',

    // Candidate Directory Feed
    profilesHeading: (count: number) => `संसदीय प्रोफ़ाइल एवं सत्यापित घोषणाएं (${count.toLocaleString()})`,
    inspectHint: 'प्रमाण देखने या रिपोर्ट डाउनलोड करने के लिए किसी भी कार्ड पर क्लिक करें',
    searchingDatabase: 'डेटाबेस में खोज जारी...',
    connecting: 'कनेक्ट हो रहा है...',
    dbNotConnectedTitle: 'लाइव डेटाबेस कनेक्टेड नहीं है',
    dbNotConnectedDesc:
      'अपना नेता केवल प्रामाणिक सरकारी आंकड़ों पर कार्य करता है। डेटाबेस से जुड़ने के लिए कृपया VITE_SUPABASE_URL एवं VITE_SUPABASE_ANON_KEY कॉन्फ़िगर करें।',
    noParliamentariansFound: 'चुने गए फ़िल्टर के अनुसार कोई सांसद नहीं मिला।',
    loadMoreRemaining: (remaining: number) => `और सांसद लोड करें (${remaining} शेष)`,
    loadMoreTotal: (showing: number, total: number) => `डेटाबेस से और लोड करें (${showing}/${total})`,
    loadingMore: 'और सांसद लोड हो रहे हैं...',

    // Candidate Card
    verifiedForm26: 'प्रपत्र 26 सत्यापित',
    compareBtn: 'तुलना करें',
    addedBtn: 'जोड़ा गया',
    summaryLabel: 'सारांश',
    cardCrime: 'आपराधिक मामले',
    cardMplads: 'सांसद निधि',
    cardAttendance: 'संसद उपस्थिति',
    cardExpense: 'चुनावी खर्च',
    cardWealth: 'संपत्ति वृद्धि',
    cleanRecord: 'स्वच्छ छवि',
    protestCases: 'प्रदर्शन / आंदोलन',
    seriousCases: (n: number) => `${n} गंभीर मामले`,
    barredByLaw: 'कानूनी अयोग्यता',
    zeroCharges: 'कोई मामला नहीं',
    casesCount: (n: number) => `${n} मामले दर्ज`,
    statusMajor: '🔴 गंभीर',
    statusAgitation: '🟡 आंदोलन',
    statusClean: '🟢 स्वच्छ',
    notAnMp: 'सांसद नहीं',
    unspentBalance: (amount: string) => `अखर्च शेष: ${amount}`,
    mpladsGood: '🟢 उत्कृष्ट खर्च',
    mpladsModerate: '🟡 संतोषजनक',
    mpladsLagging: '🔴 धीमी प्रगति',
    attendanceActive: 'सक्रिय',
    attendanceBelowAvg: 'औसत से कम',
    questionsAsked: (n: number) => `${n} सवाल पूछे`,
    sessionParticipation: 'सत्र भागीदारी',
    expenseFiledOnTime: 'समय पर दाखिल',
    expenseOverBudget: 'सीमा से अधिक',
    expenseWithinLimit: 'सीमा के भीतर',
    expenseNonCompliant: 'अनियमित',
    expenseNotReported: 'विवरण उपलब्ध नहीं',
    wealthSurgeAlert: '⚠️ तीव्र संपत्ति वृद्धि',
    wealthStable: 'स्थिर विकास',
    labelNetWorthCard: 'कुल घोषित संपत्ति',
    labelCriminalRecordCard: 'आपराधिक रिकॉर्ड',
    labelPartySwitchCard: 'दल परिवर्तन',
    labelMpladsCard: 'सांसद निधि:',
    labelAttendanceCard: 'संसद हाजिरी:',
    verifiedCivicStamp: 'सत्यापित नागरिक रिकॉर्ड • जनप्रतिनिधित्व कानून 1951',
    viewAffidavitBtn: 'शपथपत्र प्रमाण',
    dossierPdfBtn: 'दस्तावेज़ PDF',
    reportCardBtn: 'रिपोर्ट कार्ड',

    // Comparison & Drawers
    compareDrawerLabel: 'तुलना:',
    compareSideBySide: 'तुलनात्मक समीक्षा',
    compareClear: 'हटाएं',
    mobileTabDirectory: 'निर्देशिका',
    mobileTabLeaderboards: 'रैंकिंग',
    mobileTabGuide: 'मार्गदर्शिका',

    // Civic Explainer
    civicExplainerTitle: 'सरल शब्दावली',
    whyItMatters: 'यह क्यों महत्वपूर्ण है:',
    sourceAuthority: 'आधिकारिक स्रोत:',

    // Affidavit Proof Viewer Modal
    proofModalTitle: 'प्रमाण सत्यापन एवं विधिक संपरीक्षा',
    proofEvidenceTag: 'धारा 79 विधिक साक्ष्य',
    proofTabTranscript: 'प्रपत्र 26 प्रतिलिपि',
    proofTabIntegrity: 'सत्यनिष्ठा एवं विधिक विवाद',
    proofTabMplads: 'सांसद निधि कार्य',
    proofTabWealth: '10-वर्षीय संपत्ति वृद्धि',
    proofTabRawPdf: 'मूल चुनाव आयोग दस्तावेज़',
    proofViewerTitle: 'संवैधानिक दस्तावेज़ दर्शक',
    proofVerifyAffidavit: 'शपथपत्र सत्यापित करें',
    proofAffidavitVerified: 'शपथपत्र सत्यापित ✓',
    proofViewLegalActions: 'विधिक कार्रवाई देखें',
    proofDownloadAuditReport: 'ऑडिट रिपोर्ट डाउनलोड करें',
    proofFilingSections: 'दस्तावेज़ खंड',
    proofFourParts: '4 खंड',
    proofPart1Title: 'भाग 1: शपथ एवं पहचान',
    proofPart1Sub: 'प्रपत्र 26 प्रस्तावना',
    proofPart2Title: 'भाग 2: पैन एवं 5-वर्षीय आय',
    proofPart2Sub: 'आयकर विवरणी आकलन',
    proofPart3Title: 'भाग 3: चल एवं अचल संपत्ति',
    proofPart3Sub: 'संपत्ति मिलान',
    proofPart4Title: 'भाग 4: विधिक मामले एवं सत्यापन',
    proofPart4Sub: 'नोटरी सत्यापन',
    proofDocPart1Header: 'भाग 1: शपथ एवं पहचान',
    proofDocPart2Header: 'भाग 2: पैन एवं आयकर विवरणी',
    proofDocPart3Header: 'भाग 3: चल एवं अचल संपत्ति',
    proofDocPart4Header: 'भाग 4: विधिक मामले एवं सत्यापन',
    proofAuditTraceTitle: 'स्वचालित एल्गोरिथम ऑडिट विवरण',
    proofAuditTraceSub: 'स्वचालित एल्गोरिथम ऑडिट पड़ताल',
    proofCloseProof: 'बंद करें',
  },
};
