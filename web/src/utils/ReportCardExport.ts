import { Candidate } from '../types/candidate';

/**
 * Client-Side HTML5 Canvas Social Report Card Generator ($0.00 compute cost).
 * Produces crisp 1080x1080 PNG graphics optimized for WhatsApp Status,
 * Instagram, and Twitter (X) directly in the citizen's browser.
 */

const formatINR = (val: number) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Draw a rounded rectangle on a 2D canvas context.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateReportCardCanvas(candidate: Candidate): Promise<HTMLCanvasElement> {
  // Ensure custom or system fonts are ready
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-blocking fallback
    }
  }

  // Pre-load candidate profile photo if present
  let photoImg: HTMLImageElement | null = null;
  if (candidate.photo_url) {
    try {
      photoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = candidate.photo_url!;
      });
    } catch {
      photoImg = null;
    }
  }

  const canvas = document.createElement('canvas');
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas 2D rendering context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clean candidate name (strip leading dots, dashes, bullets or honorific artifacts)
  const cleanName = (candidate.name || '')
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || candidate.name;

  // 1. Background Fill: Sovereign Navy Deep Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#06101E');
  bgGrad.addColorStop(0.5, '#0A192F');
  bgGrad.addColorStop(1, '#050D18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle Ashoka Chakra Watermark in Background
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.035)';
  ctx.lineWidth = 2;
  const wmR = 340;
  ctx.beginPath();
  ctx.arc(0, 0, wmR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, wmR * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, wmR * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const ang = (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * (wmR * 0.25), Math.sin(ang) * (wmR * 0.25));
    ctx.lineTo(Math.cos(ang) * wmR, Math.sin(ang) * wmR);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Top Indian National Tricolor Accent Bar (12px height)
  ctx.fillStyle = '#FF9933'; // Saffron
  ctx.fillRect(0, 0, 360, 12);
  ctx.fillStyle = '#FFFFFF'; // White
  ctx.fillRect(360, 0, 360, 12);
  ctx.fillStyle = '#138808'; // Green
  ctx.fillRect(720, 0, 360, 12);

  const pad = 60;

  // 3. Header: Sovereign Emblem & Brand (Y: 34 to 105)
  const cx = pad + 32;
  const cy = 72;

  // Draw Authentic 24-Spoke Ashoka Chakra Emblem with Gold Rim & Concentric Rings
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#0A192F';
  ctx.fill();
  ctx.strokeStyle = '#D4AF37'; // Royal Gold
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Outer Saffron Ring
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 153, 51, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner Navy Ring
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Center Harit Green Hub
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#138808';
  ctx.fill();

  // 24 Spokes in Gold
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6);
    ctx.lineTo(cx + Math.cos(angle) * 25, cy + Math.sin(angle) * 25);
    ctx.stroke();
  }

  // Title text: APNA NETA • अपना नेता
  ctx.font = 'bold 34px "Cinzel", "Newsreader", Georgia, serif';
  ctx.fillStyle = '#D4AF37'; // Royal Gold
  ctx.fillText('APNA NETA', pad + 78, 68);

  ctx.font = 'bold 22px "Noto Serif Devanagari", "Tiro Devanagari Hindi", serif';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('• अपना नेता', pad + 275, 68);

  // Subtitle
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('THE SOVEREIGN CIVIC LEDGER OF BHARAT • संप्रभु नागरिक बहीखाता', pad + 80, 92);

  // Indelible Voter-Ink Purple Seal on Right
  const badgeW = 210;
  const badgeH = 46;
  const badgeX = size - pad - badgeW;
  const badgeY = 48;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 23);
  ctx.fillStyle = '#3B0764'; // Deep Voter-Ink Purple
  ctx.fill();
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Small indelible ink dot
  ctx.beginPath();
  ctx.arc(badgeX + 24, badgeY + badgeH / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#A855F7';
  ctx.fill();

  ctx.font = 'bold 15px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FAF5FF';
  ctx.textAlign = 'center';
  ctx.fillText('सत्यापित • ECI Form 26', badgeX + badgeW / 2 + 8, badgeY + 29);
  ctx.textAlign = 'left';

  // 4. Candidate Identity Hero Card (Y: 125, H: 155, W: 960)
  let curY = 125;
  const candCardW = size - pad * 2;
  const candCardH = 155;
  roundRect(ctx, pad, curY, candCardW, candCardH, 22);
  ctx.fillStyle = 'rgba(13, 31, 58, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'; // Subtle Gold Border
  ctx.lineWidth = 2;
  ctx.stroke();

  // Circular Avatar Container on Left
  const avX = pad + 72;
  const avY = curY + candCardH / 2;
  const avR = 52;

  if (photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoImg, avX - avR, avY - avR, avR * 2, avR * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fillStyle = '#172E4C';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Monogram Initials
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || cleanName.slice(0, 2).toUpperCase();

    ctx.font = 'bold 36px "Newsreader", Georgia, serif';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.fillText(initials, avX, avY + 12);
    ctx.textAlign = 'left';
  }

  // Candidate Details
  const candTextX = pad + 145;
  ctx.font = 'bold 36px "Newsreader", "Noto Serif Devanagari", Georgia, serif';
  ctx.fillStyle = '#FFFFFF';
  let nameText = cleanName;
  if (nameText.length > 28) nameText = nameText.substring(0, 26) + '...';
  ctx.fillText(nameText, candTextX, curY + 50);

  // Designation & Constituency Subtitle in Warm Kesariya Gold
  ctx.font = '600 18px "Newsreader", "Noto Serif Devanagari", Georgia, serif';
  ctx.fillStyle = '#E5B842';
  const houseLabel = candidate.house || 'Lok Sabha';
  const subTitle = `${houseLabel} (${candidate.constituency || 'Seat'}, ${candidate.state || 'India'}) • संसद सदस्य`;
  ctx.fillText(subTitle, candTextX, curY + 82);

  // Party Tag & Sworn Filing Pill
  ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    `${(candidate.party || 'Independent').toUpperCase()} • SWORN ECI FORM 26 DISCLOSURES (${candidate.filing_year})`,
    candTextX,
    curY + 116
  );

  // 5. Four High-Impact Metric Cards (2x2 Grid) with Refined Color Accents (Y: 305 to 815)
  curY += candCardH + 24;
  const tileW = (candCardW - 24) / 2;
  const tileH = 240;

  function drawMetricCard(
    x: number,
    y: number,
    titleBilingual: string,
    accentColor: string,
    valueText: string,
    valueColor: string,
    subText: string,
    subColor?: string,
    badgeText?: string
  ) {
    // Outer card body with glassmorphism
    roundRect(ctx!, x, y, tileW, tileH, 20);
    ctx!.fillStyle = 'rgba(10, 25, 47, 0.92)';
    ctx!.fill();
    ctx!.strokeStyle = 'rgba(212, 175, 55, 0.35)'; // Refined Gold Border
    ctx!.lineWidth = 1.8;
    ctx!.stroke();

    // Top Accent Border Line
    ctx!.save();
    ctx!.beginPath();
    roundRect(ctx!, x, y, tileW, tileH, 20);
    ctx!.clip();
    ctx!.fillStyle = accentColor;
    ctx!.fillRect(x, y, tileW, 5);

    // Header Background Strip
    ctx!.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx!.fillRect(x, y + 5, tileW, 46);

    // Bilingual Header Label
    ctx!.font = 'bold 18px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx!.fillStyle = '#FAF7F2';
    ctx!.fillText(titleBilingual, x + 22, y + 36);

    // Optional Badge in Header
    if (badgeText) {
      ctx!.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx!.fillStyle = accentColor;
      ctx!.textAlign = 'right';
      ctx!.fillText(badgeText, x + tileW - 22, y + 36);
      ctx!.textAlign = 'left';
    }
    ctx!.restore();

    // Value text
    ctx!.font = 'bold 42px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx!.fillStyle = valueColor;
    ctx!.fillText(valueText, x + 22, y + 124);

    // Subtext
    ctx!.font = '500 16.5px "Plus Jakarta Sans", sans-serif';
    ctx!.fillStyle = subColor || '#CBD5E1';
    ctx!.fillText(subText, x + 22, y + 172);

    // Subtle bottom rule and audit stamp
    ctx!.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx!.fillRect(x + 22, y + 196, tileW - 44, 1);
  }

  // Card 1: Declared Net Worth (Top-Left)
  drawMetricCard(
    pad,
    curY,
    'कुल संपत्ति • Declared Net Worth',
    '#FF9933', // Kesariya Accent
    formatINR(candidate.total_net_worth),
    '#FEF08A', // Warm Gold
    `चल (Movable): ${formatINR(candidate.total_movable_assets)} | अचल: ${formatINR(candidate.total_immovable_assets)}`,
    '#93C5FD',
    `देयता: ${formatINR(candidate.total_liabilities)}`
  );

  // Card 2: Criminal Proceedings (Top-Right)
  const m2X = pad + tileW + 24;
  const hasSerious = candidate.serious_criminal_cases_count > 0;
  const hasProtest = candidate.criminal_cases_count > 0 && !hasSerious;
  const crimTitle = 'आपराधिक मामले • Crime Record';
  const crimText = hasSerious
    ? `${candidate.serious_criminal_cases_count} Serious Charges`
    : hasProtest
    ? `${candidate.criminal_cases_count} Protest Cases`
    : '0 Charges Declared';
  const crimColor = hasSerious ? '#F87171' : hasProtest ? '#FBBF24' : '#34D399';
  const crimAccent = hasSerious ? '#DC2626' : hasProtest ? '#D97706' : '#138808';
  const crimSub = hasSerious
    ? '⚠️ गंभीर गैर-जमानती मामले • Heinous IPC charges filed'
    : hasProtest
    ? 'राजनीतिक प्रदर्शन मामले • Protest/Agitation charges'
    : '✓ स्वच्छ छवि • Clean Form 26 Sworn Affidavit on Record';

  drawMetricCard(
    m2X,
    curY,
    crimTitle,
    crimAccent,
    crimText,
    crimColor,
    crimSub,
    hasSerious ? '#FECDD3' : hasProtest ? '#FEF08A' : '#A7F3D0',
    candidate.is_rpa_section_8_disqualified ? 'DISQUALIFIED' : hasSerious ? 'HEINOUS' : 'CLEAN'
  );

  // Row 2
  const row2Y = curY + tileH + 24;

  // Card 3: Parliamentary Attendance (Bottom-Left)
  const attVal = candidate.attendance_rate !== undefined ? `${candidate.attendance_rate}%` : 'N/A';
  const attSub =
    candidate.attendance_rate !== undefined
      ? `${candidate.debates_count ?? 0} Debates • ${candidate.questions_count ?? 0} Questions in Parliament`
      : 'Non-sitting candidate in current Lok Sabha';
  drawMetricCard(
    pad,
    row2Y,
    'संसद हाजिरी • Sansad Attendance',
    '#3B82F6', // Ashoka Blue Accent
    attVal,
    '#60A5FA',
    attSub,
    '#CBD5E1',
    candidate.attendance_rate !== undefined ? `${candidate.attendance_rate >= 75 ? 'ACTIVE' : 'BELOW AVG'}` : 'CANDIDATE'
  );

  // Card 4: Local Development Funds (Bottom-Right)
  const mpladsVal = candidate.mplads ? `${candidate.mplads.utilization_rate.toFixed(1)}% Spent` : 'N/A';
  const mpladsSub = candidate.mplads
    ? `बकाया (Unspent): ${formatINR(candidate.mplads.unspent_balance)}`
    : 'Central MoSPI quota not applicable';
  const mpladsColor = candidate.mplads
    ? candidate.mplads.utilization_rate < 60
      ? '#F87171'
      : '#34D399'
    : '#94A3B8';
  drawMetricCard(
    m2X,
    row2Y,
    'सांसद निधि • MPLADS Funds',
    '#138808', // Harit Green Accent
    mpladsVal,
    mpladsColor,
    mpladsSub,
    '#CBD5E1',
    candidate.mplads ? `${candidate.mplads.works_completed ?? 0} WORKS` : 'NO QUOTA'
  );

  // 6. Bottom Reconciler Banner (Y: 825, H: 70, W: 960)
  const bannerY = row2Y + tileH + 26;
  const bannerH = 70;
  roundRect(ctx, pad, bannerY, candCardW, bannerH, 18);

  if (candidate.is_rpa_section_8_disqualified) {
    ctx.fillStyle = '#991B1B'; // Terracotta Red
    ctx.fill();
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 22px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ अयोग्य घोषित • DISQUALIFIED CANDIDATE UNDER SECTION 8 RPA 1951', size / 2, bannerY + 43);
  } else if (candidate.has_section_9a_conflict) {
    ctx.fillStyle = '#991B1B'; // Terracotta Red
    ctx.fill();
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 22px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ सरकारी अनुबंध विवाद • SECTION 9A RPA COMMERCIAL CONFLICT OF INTEREST DETECTED', size / 2, bannerY + 43);
  } else if (candidate.has_arithmetic_discrepancy) {
    ctx.fillStyle = '#991B1B'; // Terracotta Red
    ctx.fill();
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 22px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ अंकगणितीय विसंगति • ARITHMETIC DISCREPANCY DETECTED IN SWORN FORM 26', size / 2, bannerY + 43);
  } else {
    // Clean Reconciled Audit: Deep Harit Green with Royal Gold Border
    const greenGrad = ctx.createLinearGradient(pad, bannerY, pad + candCardW, bannerY);
    greenGrad.addColorStop(0, '#064E3B');
    greenGrad.addColorStop(0.5, '#0A5C36');
    greenGrad.addColorStop(1, '#064E3B');
    ctx.fillStyle = greenGrad;
    ctx.fill();
    ctx.strokeStyle = '#D4AF37'; // Royal Gold Border
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 21px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('✓ द्वि-प्रविष्टि सत्यापन: शपथपत्र सत्यापित • DOUBLE-ENTRY AUDIT RECONCILED', size / 2, bannerY + 43);
  }
  ctx.textAlign = 'left';

  // 7. Safe Harbor Footer & Legal Attribution (Y: 960 to 1050)
  const footY = size - 30;
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748B';
  const photoNote = candidate.photo_attribution ? ` • Photo: ${candidate.photo_attribution}` : '';
  ctx.fillText(
    `CITIZEN CIVIC PORTAL • apnaneta.in • SEC 79 IT ACT & DPDPA 2023 COMPLIANT${photoNote}`,
    pad,
    footY
  );

  ctx.font = '600 13px "Noto Serif Devanagari", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#D4AF37';
  ctx.textAlign = 'right';
  ctx.fillText('भारत का संप्रभु नागरिक बहीखाता • Verified Government Open Records', size - pad, footY);
  ctx.textAlign = 'left';

  return canvas;
}

export async function generateReportCardDataUrl(candidate: Candidate): Promise<string> {
  const canvas = await generateReportCardCanvas(candidate);
  return canvas.toDataURL('image/png', 1.0);
}

export async function generateReportCardBlob(candidate: Candidate): Promise<Blob> {
  const canvas = await generateReportCardCanvas(candidate);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas blob generation failed'));
    }, 'image/png', 1.0);
  });
}

export async function downloadReportCard(candidate: Candidate, existingDataUrl?: string): Promise<void> {
  const dataUrl = existingDataUrl || (await generateReportCardDataUrl(candidate));
  const a = document.createElement('a');
  const cleanName = (candidate.name || '')
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || candidate.name;
  const safeName = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  a.download = `apna_neta_report_card_${safeName}_${candidate.filing_year}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export type NativeShareResult = 'shared' | 'cancelled' | 'unsupported';

export const getAppBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://apnaneta.in';
};

/**
 * Share via native Web Share API on mobile devices (e.g. Android Chrome, iOS Safari).
 * Enables direct image sending into WhatsApp, Twitter, or Instagram.
 */
export async function shareReportCardViaNative(candidate: Candidate): Promise<NativeShareResult> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return 'unsupported';
  }

  try {
    const cleanName = (candidate.name || '')
      .replace(/^[\s.·•\-_]+/, '')
      .replace(/\s+/g, ' ')
      .trim() || candidate.name;
    const blob = await generateReportCardBlob(candidate);
    const safeName = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const file = new File([blob], `apnaneta_${safeName}.png`, { type: 'image/png' });

    const shareData = {
      title: `${cleanName} Civic Report Card • नागरिक रिपोर्ट कार्ड`,
      text: `🇮🇳 Apna Neta Audit Report Card for ${cleanName} (${candidate.party || 'IND'}, ${candidate.constituency}). Verified against sworn ECI Form 26 disclosures under RPA 1951.`,
      url: getAppBaseUrl(),
      files: [file],
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      return 'shared';
    }
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || String(err).includes('abort'))) {
      return 'cancelled';
    }
    console.warn('Native share failed:', err);
  }

  return 'unsupported';
}

/**
 * Copy the generated PNG directly to the system clipboard.
 * Uses Promise.resolve(blob) to support WebKit/Safari and Blink/Chrome.
 */
export async function copyReportCardImageToClipboard(candidate: Candidate): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    return false;
  }

  try {
    const blob = await generateReportCardBlob(candidate);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': Promise.resolve(blob),
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('Clipboard image write failed:', err);
    return false;
  }
}

/**
 * Plain-text fact-sheet summary for WhatsApp or text copying.
 */
export function getReportCardFactSheet(candidate: Candidate): string {
  const cleanName = (candidate.name || '')
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || candidate.name;

  const formatVal = (val: number) => {
    const num = Number(val || 0);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const lines = [
    `🇮🇳 *APNA NETA • अपना नेता नागरिक रिपोर्ट कार्ड* 🇮🇳`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Name / नाम:* ${cleanName}`,
    `🏛️ *Seat / निर्वाचन क्षेत्र:* ${candidate.constituency}, ${candidate.state} (${candidate.house})`,
    `🗳️ *Party / राजनीतिक दल:* ${candidate.party || 'Independent'}`,
    `📅 *Filing Year / शपथपत्र वर्ष:* ${candidate.filing_year}`,
    ``,
    `💰 *Declared Net Worth / कुल संपत्ति:* ${formatVal(candidate.total_net_worth)}`,
    `   • चल संपत्ति (Movable): ${formatVal(candidate.total_movable_assets)}`,
    `   • अचल संपत्ति (Immovable): ${formatVal(candidate.total_immovable_assets)}`,
    `   • देयताएं (Liabilities): ${formatVal(candidate.total_liabilities)}`,
    ``,
    `⚖️ *Criminal Charges / आपराधिक मामले:* ${
      candidate.serious_criminal_cases_count > 0
        ? `⚠️ ${candidate.serious_criminal_cases_count} गंभीर गैर-जमानती मामले (Serious IPC Cases)`
        : candidate.criminal_cases_count > 0
        ? `⚖️ ${candidate.criminal_cases_count} राजनीतिक प्रदर्शन मामले (Protest Cases)`
        : `✅ 0 मामले (Clean Sworn Affidavit on ECI Record)`
    }`,
    ``,
    candidate.attendance_rate !== undefined
      ? `🏛️ *Sansad Attendance / संसद हाजिरी:* ${candidate.attendance_rate}% (${candidate.debates_count ?? 0} Debates, ${candidate.questions_count ?? 0} Questions)`
      : `🏛️ *Sansad Attendance / संसद हाजिरी:* N/A (Candidate / Non-MP)`,
    ``,
    candidate.mplads
      ? `🏗️ *MPLADS Velocity / सांसद निधि:* ${candidate.mplads.utilization_rate.toFixed(1)}% Spent (बकाया: ${formatVal(candidate.mplads.unspent_balance)})`
      : `🏗️ *MPLADS Velocity / सांसद निधि:* N/A (No central quota)`,
    ``,
    `🔍 *Audit Verdict / सत्यापन निष्कर्ष:* ${
      candidate.is_rpa_section_8_disqualified
        ? `⚠️ DISQUALIFIED UNDER SECTION 8 RPA 1951`
        : candidate.has_section_9a_conflict
        ? `⚠️ SECTION 9A RPA COMMERCIAL CONFLICT OF INTEREST FLAGGED`
        : candidate.has_arithmetic_discrepancy
        ? `⚠️ ARITHMETIC DISCREPANCY FLAGGED (Delta: ${formatVal((candidate.delta_movable || 0) + (candidate.delta_immovable || 0))})`
        : `✅ CLEAN AUDIT (Part A & Part B disclosures match)`
    }`,
    candidate.defection_count ? `🔄 *Political Mobility:* ${candidate.defection_count} Career Party Transitions` : '',
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Verified against sworn ECI Form 26 disclosures at ${getAppBaseUrl()}`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function getWhatsAppShareUrl(candidate: Candidate): string {
  const text = getReportCardFactSheet(candidate);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getTwitterShareUrl(candidate: Candidate): string {
  const cleanName = (candidate.name || '')
    .replace(/^[\s.·•\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim() || candidate.name;
  const safeParty = candidate.party ? ` (${candidate.party})` : '';
  const netWorth = formatINR(candidate.total_net_worth);
  const auditVerdict = candidate.is_rpa_section_8_disqualified
    ? '⚠️ Disqualified (RPA Sec 8)'
    : candidate.has_section_9a_conflict
    ? '⚠️ Conflict Flagged (RPA Sec 9A)'
    : candidate.has_arithmetic_discrepancy
    ? '⚠️ Discrepancy Flagged'
    : '✅ 100% Clean Audit';
  
  const text = `Official ECI sworn affidavit audit report for ${cleanName}${safeParty} from ${candidate.constituency}, ${candidate.state}.\n\n💰 Declared Net Worth: ${netWorth}\n⚖️ Audit Verdict: ${auditVerdict}\n\nInspect verified court proofs on Apna Neta:`;
  const url = getAppBaseUrl();
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=ApnaNeta,Transparency,ECI`;
}
