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

  // 1. Background Fill: Sovereign Navy Deep Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#06101E');
  bgGrad.addColorStop(0.5, '#0A192F');
  bgGrad.addColorStop(1, '#050D1A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle decorative background grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  for (let x = 40; x < size; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 40; y < size; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // 2. Top Indian National Tricolor Accent Bar
  ctx.fillStyle = '#FF9933'; // Saffron
  ctx.fillRect(0, 0, 360, 10);
  ctx.fillStyle = '#FFFFFF'; // White
  ctx.fillRect(360, 0, 360, 10);
  ctx.fillStyle = '#138808'; // Green
  ctx.fillRect(720, 0, 360, 10);

  const pad = 60;

  // 3. Header: Dharma Aperture & Brand
  const cx = pad + 30;
  const cy = 68;

  // Draw Gold Ashoka Chakra / Dharma Aperture Emblem
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#0A192F';
  ctx.fill();
  ctx.strokeStyle = '#D4AF37'; // Gold
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#059669'; // Jade
  ctx.fill();

  // 24 Spokes in Gold
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6);
    ctx.lineTo(cx + Math.cos(angle) * 27, cy + Math.sin(angle) * 27);
    ctx.stroke();
  }

  // Title text: APNA NETA | THE CIVIC LEDGER
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#D4AF37'; // Gold
  ctx.fillText('APNA NETA', pad + 76, 78);

  ctx.font = '300 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#D4AF37';
  ctx.fillText('|', pad + 300, 77);

  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('THE CIVIC LEDGER', pad + 322, 78);

  // Green VERIFIED Pill Badge on Right
  const badgeW = 160;
  const badgeH = 44;
  const badgeX = size - pad - badgeW;
  const badgeY = 46;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
  ctx.fillStyle = '#059669';
  ctx.fill();

  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('✓ VERIFIED', badgeX + badgeW / 2, badgeY + 28);
  ctx.textAlign = 'left';

  // 4. Candidate Identity Hero Card
  let curY = 135;
  const candCardW = size - pad * 2;
  const candCardH = 145;
  roundRect(ctx, pad, curY, candCardW, candCardH, 20);
  ctx.fillStyle = 'rgba(13, 32, 61, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#C89D3C'; // Gold Border
  ctx.lineWidth = 2;
  ctx.stroke();

  // Circular Avatar Container on Left
  const avX = pad + 65;
  const avY = curY + candCardH / 2;
  const avR = 48;

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
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fillStyle = '#1E3A5F';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Silhouette inside Avatar
    ctx.beginPath();
    ctx.arc(avX, avY - 10, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#D4AF37';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avX, avY + 36, 32, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#D4AF37';
    ctx.fill();
  }

  // Candidate Details
  const candTextX = pad + 135;
  ctx.font = 'bold 36px "Newsreader", Georgia, serif';
  ctx.fillStyle = '#FFFFFF';
  let nameText = candidate.name;
  if (nameText.length > 28) nameText = nameText.substring(0, 26) + '...';
  ctx.fillText(nameText, candTextX, curY + 54);

  // Constituency Subtitle in Gold/Ochre
  ctx.font = '500 20px "Newsreader", Georgia, serif';
  ctx.fillStyle = '#E5B842';
  const subTitle = `Member of Parliament, ${candidate.constituency} Constituency (${candidate.state})`;
  ctx.fillText(subTitle, candTextX, curY + 88);

  // Party Tag & Filing Year Tag
  ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    `${(candidate.party || 'Independent').toUpperCase()} • FORM 26 SWORN FILING (${candidate.filing_year})`,
    candTextX,
    curY + 118
  );

  // 5. Four High-Impact Metric Cards (2x2 Grid) with Gold Header Caps
  curY += candCardH + 30;
  const tileW = (candCardW - 24) / 2;
  const tileH = 240;
  const capH = 48;

  function drawMetricCard(
    x: number,
    y: number,
    title: string,
    valueText: string,
    valueColor: string,
    subText: string,
    subColor?: string
  ) {
    // Outer card
    roundRect(ctx!, x, y, tileW, tileH, 18);
    ctx!.fillStyle = '#081426';
    ctx!.fill();
    ctx!.strokeStyle = '#C89D3C'; // Gold Border
    ctx!.lineWidth = 2;
    ctx!.stroke();

    // Gold Header Cap
    ctx!.save();
    ctx!.beginPath();
    roundRect(ctx!, x, y, tileW, tileH, 18);
    ctx!.clip();

    ctx!.fillStyle = '#C89D3C'; // Solid Gold Header
    ctx!.fillRect(x, y, tileW, capH);

    ctx!.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx!.fillStyle = '#0A192F'; // Dark Sovereign text on Gold
    ctx!.fillText(title, x + 24, y + 32);
    ctx!.restore();

    // Value text
    ctx!.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
    ctx!.fillStyle = valueColor;
    ctx!.fillText(valueText, x + 24, y + capH + 75);

    // Subtext
    ctx!.font = '500 17px "Plus Jakarta Sans", sans-serif';
    ctx!.fillStyle = subColor || '#94A3B8';
    ctx!.fillText(subText, x + 24, y + capH + 125);
  }

  // Card 1: Declared Net Worth (Top-Left)
  drawMetricCard(
    pad,
    curY,
    'Declared Net Worth',
    formatINR(candidate.total_net_worth),
    '#FEF08A', // Warm Cream/Gold
    `Movable: ${formatINR(candidate.total_movable_assets)} | Immovable: ${formatINR(candidate.total_immovable_assets)}`,
    '#93C5FD'
  );

  // Card 2: Criminal Proceedings (Top-Right)
  const m2X = pad + tileW + 24;
  const crimText =
    candidate.serious_criminal_cases_count > 0
      ? `${candidate.serious_criminal_cases_count} Serious Charges`
      : candidate.criminal_cases_count > 0
      ? `${candidate.criminal_cases_count} Protest Cases`
      : '0 Charges Declared';
  const crimColor =
    candidate.serious_criminal_cases_count > 0
      ? '#F87171'
      : candidate.criminal_cases_count > 0
      ? '#FBBF24'
      : '#34D399';
  const crimSub =
    candidate.serious_criminal_cases_count > 0
      ? 'Includes heinous IPC non-bailable charges'
      : 'Clean Form 26 Sworn Affidavit on ECI Record';

  drawMetricCard(
    m2X,
    curY,
    'Criminal Proceedings',
    crimText,
    crimColor,
    crimSub,
    crimColor === '#34D399' ? '#A7F3D0' : '#FECDD3'
  );

  // Row 2
  const row2Y = curY + tileH + 24;

  // Card 3: Parliamentary Attendance (Bottom-Left)
  const attVal = candidate.attendance_rate !== undefined ? `${candidate.attendance_rate}%` : 'N/A';
  const attSub =
    candidate.attendance_rate !== undefined
      ? `${candidate.debates_count ?? 0} Debates • ${candidate.questions_count ?? 0} Questions in Sansad`
      : 'Non-sitting candidate in current Lok Sabha';
  drawMetricCard(
    pad,
    row2Y,
    'Parliamentary Attendance',
    attVal,
    '#34D399',
    attSub,
    '#CBD5E1'
  );

  // Card 4: Local Development Funds (Bottom-Right)
  const mpladsVal = candidate.mplads ? `${candidate.mplads.utilization_rate.toFixed(1)}% Spent` : 'N/A';
  const mpladsSub = candidate.mplads
    ? `Unspent Balance: ${formatINR(candidate.mplads.unspent_balance)}`
    : 'Central MoSPI quota not applicable';
  drawMetricCard(
    m2X,
    row2Y,
    'Local Development Funds',
    mpladsVal,
    '#34D399',
    mpladsSub,
    '#CBD5E1'
  );

  // 6. Bottom Reconciler Banner
  const bannerY = row2Y + tileH + 28;
  const bannerH = 68;
  roundRect(ctx, pad, bannerY, candCardW, bannerH, 16);

  if (candidate.is_rpa_section_8_disqualified) {
    ctx.fillStyle = '#E11D48'; // Crimson
    ctx.fill();
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ DISQUALIFIED CANDIDATE UNDER SECTION 8 RPA 1951', size / 2, bannerY + 42);
  } else if (candidate.has_section_9a_conflict) {
    ctx.fillStyle = '#BE123C'; // Rose-700
    ctx.fill();
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ SECTION 9A RPA COMMERCIAL CONFLICT OF INTEREST DETECTED', size / 2, bannerY + 42);
  } else if (candidate.has_arithmetic_discrepancy) {
    ctx.fillStyle = '#E11D48'; // Crimson
    ctx.fill();
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ARITHMETIC DISCREPANCY DETECTED IN SWORN FORM 26', size / 2, bannerY + 42);
  } else {
    ctx.fillStyle = '#D4AF37'; // Solid Gold
    ctx.fill();
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0A192F'; // Dark Navy text on Gold
    ctx.textAlign = 'center';
    ctx.fillText('DOUBLE-ENTRY AUDIT: SWORN DISCLOSURES RECONCILED', size / 2, bannerY + 42);
  }
  ctx.textAlign = 'left';

  // 7. Safe Harbor Footer & Legal Attribution
  const footY = size - 30;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748B';
  const photoNote = candidate.photo_attribution ? ` • Photo: ${candidate.photo_attribution}` : '';
  ctx.fillText(
    `CITIZEN VERIFICATION PORTAL • apnaneta.in • SEC 79 IT ACT & DPDPA 2023${photoNote}`,
    pad,
    footY
  );

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
  const safeName = candidate.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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
    const blob = await generateReportCardBlob(candidate);
    const safeName = candidate.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const file = new File([blob], `apnaneta_${safeName}.png`, { type: 'image/png' });

    const shareData = {
      title: `${candidate.name} Civic Report Card`,
      text: `Audit Report Card for ${candidate.name} (${candidate.party || 'IND'}, ${candidate.constituency}). Verified from official sworn ECI Form 26 affidavit on Apna Neta.`,
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
  const formatVal = (val: number) => {
    const num = Number(val || 0);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const lines = [
    `🇮🇳 *APNA NETA CITIZEN REPORT CARD* 🇮🇳`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Name:* ${candidate.name}`,
    `🏛️ *Seat:* ${candidate.constituency}, ${candidate.state} (${candidate.house})`,
    `🗳️ *Party:* ${candidate.party || 'Independent'}`,
    `📅 *Filing Year:* ${candidate.filing_year}`,
    ``,
    `💰 *Declared Net Worth:* ${formatVal(candidate.total_net_worth)}`,
    `   • Movable Assets: ${formatVal(candidate.total_movable_assets)}`,
    `   • Immovable Assets: ${formatVal(candidate.total_immovable_assets)}`,
    `   • Liabilities: ${formatVal(candidate.total_liabilities)}`,
    ``,
    `⚖️ *Criminal Charges:* ${
      candidate.serious_criminal_cases_count > 0
        ? `⚠️ ${candidate.serious_criminal_cases_count} Serious IPC Cases`
        : candidate.criminal_cases_count > 0
        ? `⚖️ ${candidate.criminal_cases_count} Protest/Demonstration Cases`
        : `✅ 0 Declared Cases`
    }`,
    ``,
    candidate.attendance_rate !== undefined
      ? `🏛️ *Sansad Attendance:* ${candidate.attendance_rate}% (Debates: ${candidate.debates_count ?? 0}, Questions: ${candidate.questions_count ?? 0})`
      : `🏛️ *Sansad Attendance:* N/A (Candidate / Non-MP)`,
    ``,
    candidate.mplads
      ? `🏗️ *MPLADS Velocity:* ${candidate.mplads.utilization_rate.toFixed(1)}% Spent (${formatVal(candidate.mplads.unspent_balance)} unspent)`
      : `🏗️ *MPLADS Velocity:* N/A (No central quota)`,
    ``,
    `🔍 *Audit Verdict:* ${
      candidate.is_rpa_section_8_disqualified
        ? `⚠️ DISQUALIFIED UNDER SECTION 8 RPA 1951`
        : candidate.has_section_9a_conflict
        ? `⚠️ SECTION 9A RPA COMMERCIAL CONFLICT OF INTEREST FLAGGED`
        : candidate.has_arithmetic_discrepancy
        ? `⚠️ ARITHMETIC DISCREPANCY FLAGGED (Delta: ${formatVal((candidate.delta_movable || 0) + (candidate.delta_immovable || 0))})`
        : `✅ CLEAN AUDIT (Part A & Part B disclosures match)`
    }`,
    candidate.defection_count ? `🔄 *Political Mobility:* ${candidate.defection_count} Career Party Transitions` : '',
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Verified against sworn ECI Form 26 affidavit at ${getAppBaseUrl()}`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function getWhatsAppShareUrl(candidate: Candidate): string {
  const text = getReportCardFactSheet(candidate);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getTwitterShareUrl(candidate: Candidate): string {
  const safeParty = candidate.party ? ` (${candidate.party})` : '';
  const netWorth = formatINR(candidate.total_net_worth);
  const auditVerdict = candidate.is_rpa_section_8_disqualified
    ? '⚠️ Disqualified (RPA Sec 8)'
    : candidate.has_section_9a_conflict
    ? '⚠️ Conflict Flagged (RPA Sec 9A)'
    : candidate.has_arithmetic_discrepancy
    ? '⚠️ Discrepancy Flagged'
    : '✅ 100% Clean Audit';
  
  const text = `Official ECI sworn affidavit audit report for ${candidate.name}${safeParty} from ${candidate.constituency}, ${candidate.state}.\n\n💰 Declared Net Worth: ${netWorth}\n⚖️ Audit Verdict: ${auditVerdict}\n\nInspect verified court proofs on Apna Neta:`;
  const url = getAppBaseUrl();
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=ApnaNeta,Transparency,ECI`;
}
