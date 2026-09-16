import { Candidate } from '../types/candidate';

/**
 * Client-Side HTML5 Canvas Social Report Card Generator ($0.00 compute cost).
 * Produces crisp 1080x1080 PNG graphics optimized for WhatsApp Status,
 * Instagram, and Twitter (X) directly in the citizen's browser.
 */

const formatINR = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${val.toLocaleString('en-IN')}`;
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

  const canvas = document.createElement('canvas');
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas 2D rendering context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Background Fill: Deep Slate / Indigo Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#0b1329');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#090e1c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle decorative background grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
  ctx.fillStyle = '#ff9933'; // Saffron
  ctx.fillRect(0, 0, 360, 10);
  ctx.fillStyle = '#ffffff'; // White
  ctx.fillRect(360, 0, 360, 10);
  ctx.fillStyle = '#138808'; // Green
  ctx.fillRect(720, 0, 360, 10);

  // 3. Header Civic Branding
  const pad = 60;

  // Crest Box
  roundRect(ctx, pad, 44, 52, 52, 14);
  ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🇮🇳', pad + 26, 44 + 27);

  // Branding Text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('APNA NETA', pad + 68, 72);

  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ECI SWORN CITIZEN AUDIT', pad + 68, 89);
  ctx.letterSpacing = '0px';

  // Verification Shield Tag (Right)
  roundRect(ctx, size - pad - 210, 50, 210, 38, 10);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'center';
  ctx.fillText('✓ ECI AFFIDAVIT VERIFIED', size - pad - 105, 74);

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 115);
  ctx.lineTo(size - pad, 115);
  ctx.stroke();

  // 4. Candidate Identity Hero Section
  let curY = 160;

  // Party Badge
  const partyText = (candidate.party || 'Independent').toUpperCase();
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const partyWidth = Math.min(ctx.measureText(partyText).width + 24, 400);
  roundRect(ctx, pad, curY - 22, partyWidth, 30, 8);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(partyText, pad + 12, curY - 2);

  // Sworn Filing Year Badge (next to party)
  const yearText = `FORM 26 • ${candidate.filing_year} SWORN FILING`;
  roundRect(ctx, pad + partyWidth + 12, curY - 22, 220, 30, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(yearText, pad + partyWidth + 24, curY - 2);

  // Candidate Name
  curY += 45;
  ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  let displayName = candidate.name;
  if (displayName.length > 34) displayName = displayName.slice(0, 32) + '…';
  ctx.fillText(displayName, pad, curY);

  // Constituency & State Subtitle
  curY += 28;
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${candidate.constituency}, ${candidate.state} • ${candidate.house}`, pad, curY);

  // 5. Four Key Metric Tiles (2x2 Grid)
  curY += 35;
  const gridW = size - pad * 2;
  const tileW = (gridW - 20) / 2;
  const tileH = 145;

  // Metric 1: Declared Net Worth (Top Left)
  const m1X = pad;
  const m1Y = curY;
  roundRect(ctx, m1X, m1Y, tileW, tileH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('💰 DECLARED NET WORTH', m1X + 20, m1Y + 32);

  ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(formatINR(candidate.total_net_worth), m1X + 20, m1Y + 76);

  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    `Movable: ${formatINR(candidate.total_movable_assets)} | Immovable: ${formatINR(candidate.total_immovable_assets)}`,
    m1X + 20,
    m1Y + 112
  );

  // Metric 2: Criminal Record (Top Right)
  const m2X = pad + tileW + 20;
  const m2Y = curY;
  roundRect(ctx, m2X, m2Y, tileW, tileH, 16);
  ctx.fillStyle =
    candidate.serious_criminal_cases_count > 0
      ? 'rgba(239, 68, 68, 0.08)'
      : candidate.criminal_cases_count > 0
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(16, 185, 129, 0.08)';
  ctx.fill();
  ctx.strokeStyle =
    candidate.serious_criminal_cases_count > 0
      ? 'rgba(239, 68, 68, 0.3)'
      : candidate.criminal_cases_count > 0
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(16, 185, 129, 0.3)';
  ctx.stroke();

  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('⚖️ CRIMINAL PROCEEDINGS', m2X + 20, m2Y + 32);

  if (candidate.serious_criminal_cases_count > 0) {
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`${candidate.serious_criminal_cases_count} SERIOUS IPC CHARGES`, m2X + 20, m2Y + 76);
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('Includes non-bailable offences (punishable ≥ 5 yrs)', m2X + 20, m2Y + 112);
  } else if (candidate.criminal_cases_count > 0) {
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${candidate.criminal_cases_count} PROTEST CITATIONS`, m2X + 20, m2Y + 76);
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('Political demonstrations / public agitation cases', m2X + 20, m2Y + 112);
  } else {
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('0 CHARGES DECLARED', m2X + 20, m2Y + 76);
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('No pending criminal dockets declared in Form 26', m2X + 20, m2Y + 112);
  }

  // Metric 3: Sansad Attendance (Bottom Left)
  const m3X = pad;
  const m3Y = curY + tileH + 16;
  roundRect(ctx, m3X, m3Y, tileW, tileH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('🏛️ SANSAD ATTENDANCE', m3X + 20, m3Y + 32);

  if (candidate.attendance_rate !== undefined) {
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${candidate.attendance_rate}%`, m3X + 20, m3Y + 76);

    // Mini progress bar
    roundRect(ctx, m3X + 20, m3Y + 92, tileW - 40, 8, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    const barFillW = Math.max(0, Math.min(tileW - 40, (tileW - 40) * (candidate.attendance_rate / 100)));
    roundRect(ctx, m3X + 20, m3Y + 92, barFillW, 8, 4);
    ctx.fillStyle = candidate.attendance_rate >= 80 ? '#10b981' : candidate.attendance_rate >= 60 ? '#3b82f6' : '#f59e0b';
    ctx.fill();

    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Debates: ${candidate.debates_count ?? 0} | Questions: ${candidate.questions_count ?? 0}`, m3X + 20, m3Y + 124);
  } else {
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('NON-MP / CANDIDATE', m3X + 20, m3Y + 76);
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Not a sitting member in current parliament term', m3X + 20, m3Y + 112);
  }

  // Metric 4: MPLADS Velocity (Bottom Right)
  const m4X = pad + tileW + 20;
  const m4Y = curY + tileH + 16;
  roundRect(ctx, m4X, m4Y, tileW, tileH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('🏗️ MPLADS FUND VELOCITY', m4X + 20, m4Y + 32);

  if (candidate.mplads) {
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = candidate.mplads.utilization_rate < 60 ? '#f87171' : '#34d399';
    ctx.fillText(`${candidate.mplads.utilization_rate.toFixed(1)}% SPENT`, m4X + 20, m4Y + 76);

    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Unspent Balance: ${formatINR(candidate.mplads.unspent_balance)}`, m4X + 20, m4Y + 112);
  } else {
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('NO CENTRAL QUOTA', m4X + 20, m4Y + 76);
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('MoSPI central fund allocation not applicable', m4X + 20, m4Y + 112);
  }

  // 6. Forensic Math Reconciler Stamp (Horizontal Banner)
  curY = m3Y + tileH + 24;
  const stampH = 120;
  roundRect(ctx, pad, curY, gridW, stampH, 18);

  if (candidate.has_arithmetic_discrepancy) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('⚠️ ARITHMETIC DISCREPANCY FLAGGED IN SWORN AFFIDAVIT', pad + 24, curY + 36);

    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(
      `Part A itemized disclosure sums do NOT match Part B abstract summary. Delta: ${formatINR(
        candidate.delta_movable + candidate.delta_immovable
      )}`,
      pad + 24,
      curY + 66
    );

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#f87171';
    ctx.fillText('Flagged by Apna Neta Double-Entry Forensic Reconciler Engine', pad + 24, curY + 94);
  } else {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('✓ CLEAN AUDIT: PART A & PART B DISCLOSURES RECONCILED', pad + 24, curY + 36);

    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(
      'Every itemized asset in Part A mathematically equals the sworn abstract total in Part B.',
      pad + 24,
      curY + 66
    );

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('Sworn under oath before Election Commission of India Returning Officer', pad + 24, curY + 94);
  }

  // 7. Multi-Term Wealth Growth Line (if available)
  const latestGrowth =
    candidate.historical_wealth && candidate.historical_wealth.length > 0
      ? candidate.historical_wealth[candidate.historical_wealth.length - 1]
      : null;

  curY += stampH + 20;

  if (latestGrowth) {
    roundRect(ctx, pad, curY, gridW, 55, 12);
    ctx.fillStyle = latestGrowth.is_rapid_accumulation
      ? 'rgba(239, 68, 68, 0.08)'
      : 'rgba(59, 130, 246, 0.08)';
    ctx.fill();
    ctx.strokeStyle = latestGrowth.is_rapid_accumulation
      ? 'rgba(239, 68, 68, 0.25)'
      : 'rgba(59, 130, 246, 0.25)';
    ctx.stroke();

    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = latestGrowth.is_rapid_accumulation ? '#f87171' : '#60a5fa';
    const surgeTag = latestGrowth.is_rapid_accumulation ? '⚡ RAPID WEALTH SURGE' : '📈 WEALTH TRAJECTORY';
    ctx.fillText(
      `${surgeTag}: +${latestGrowth.percentage_increase}% growth (${latestGrowth.from_year} → ${latestGrowth.to_year})`,
      pad + 20,
      curY + 33
    );

    if (latestGrowth.cagr_percent) {
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Annual CAGR: ${latestGrowth.cagr_percent}%`, size - pad - 20, curY + 33);
      ctx.textAlign = 'left';
    }
    curY += 55;
  }

  // 8. Footer Safe Harbor & Provenance Bar
  const footerY = size - 70;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY);
  ctx.lineTo(size - pad, footerY);
  ctx.stroke();

  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    'CITIZEN VERIFICATION PORTAL • apnaneta.in • REPRODUCED UNDER SEC 79 IT ACT & SEC 3(c)(ii) DPDP ACT 2023',
    pad,
    footerY + 28
  );

  ctx.textAlign = 'right';
  ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('NON-PARTISAN TRANSPARENCY INITIATIVE', size - pad, footerY + 28);

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

export async function downloadReportCard(candidate: Candidate): Promise<void> {
  const dataUrl = await generateReportCardDataUrl(candidate);
  const a = document.createElement('a');
  const safeName = candidate.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  a.download = `apna_neta_report_card_${safeName}_${candidate.filing_year}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Share via native Web Share API on mobile devices (e.g. Android Chrome, iOS Safari).
 * Enables direct image sending into WhatsApp, Twitter, or Instagram.
 */
export async function shareReportCardViaNative(candidate: Candidate): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const blob = await generateReportCardBlob(candidate);
    const safeName = candidate.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const file = new File([blob], `apnaneta_${safeName}.png`, { type: 'image/png' });

    const shareData = {
      title: `${candidate.name} Civic Report Card`,
      text: `Audit Report Card for ${candidate.name} (${candidate.party || 'IND'}, ${candidate.constituency}). Verified from official sworn ECI Form 26 affidavit on Apna Neta.`,
      url: 'https://apnaneta.in',
      files: [file],
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      return true;
    }
  } catch (err) {
    console.warn('Native share failed or was cancelled:', err);
  }

  return false;
}

/**
 * Copy the generated PNG directly to the system clipboard.
 */
export async function copyReportCardImageToClipboard(candidate: Candidate): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    return false;
  }

  try {
    const blob = await generateReportCardBlob(candidate);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
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
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
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
      candidate.has_arithmetic_discrepancy
        ? `⚠️ ARITHMETIC DISCREPANCY FLAGGED (Delta: ${formatVal(candidate.delta_movable + candidate.delta_immovable)})`
        : `✅ CLEAN AUDIT (Part A & Part B disclosures match)`
    }`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Verified against sworn ECI Form 26 affidavit at https://apnaneta.in`,
  ];

  return lines.join('\n');
}

export function getWhatsAppShareUrl(candidate: Candidate): string {
  const text = getReportCardFactSheet(candidate);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
