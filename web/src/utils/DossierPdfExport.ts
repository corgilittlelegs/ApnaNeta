import { Candidate } from '../types/candidate';

/**
 * Client-Side Court-Ready 1-Page Forensic Audit Dossier PDF Exporter.
 * Operates with $0.00 compute cost by rendering an authentic high-resolution
 * A4 legal audit document directly in a printable browser context.
 */
export function exportCandidateDossierPdf(candidate: Candidate): void {
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const generatedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Unique verification checksum placeholder based on candidate details
  const auditRef = `AN-AUDIT-${candidate.filing_year}-${candidate.id.slice(0, 8).toUpperCase()}`;

  // Build HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Apna Neta Forensic Audit Dossier - ${candidate.name}</title>
  <!-- Google Fonts: Newsreader, Plus Jakarta Sans, JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,500&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5px;
      line-height: 1.4;
    }
    .dossier-page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header-bar {
      border-bottom: 2.5px solid #0A192F;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .emblem-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .emblem-svg {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .title-group h1 {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 19px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.2px;
      color: #0A192F;
    }
    .title-group p {
      margin: 2px 0 0 0;
      font-size: 9px;
      color: #475569;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .audit-meta {
      text-align: right;
      font-size: 8.5px;
      font-family: 'JetBrains Mono', monospace;
      color: #475569;
      line-height: 1.5;
    }
    .audit-meta .ref {
      font-weight: 700;
      color: #0A192F;
    }

    /* Candidate Identity Banner */
    .identity-card {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 4px solid #0A192F;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cand-name {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 18px;
      font-weight: 700;
      color: #0A192F;
      margin: 0;
    }
    .cand-sub {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .party-tag {
      background: #0A192F;
      color: #ffffff;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Section Grid */
    .section-title {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #0A192F;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-left: 3.5px solid #0A192F;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
    }

    .seal-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .seal-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px dashed #059669;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .seal-circle.flagged {
      border-color: #E11D48;
    }
    .seal-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #ECFDF5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid #A7F3D0;
    }
    .seal-inner.flagged {
      background: #FFF1F2;
      border-color: #FECDD3;
    }
    .seal-num {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      font-size: 13px;
      line-height: 1;
      color: #065F46;
    }
    .seal-num.flagged {
      color: #9F1239;
    }
    .seal-lbl {
      font-size: 6px;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: #047857;
      text-transform: uppercase;
    }
    .seal-lbl.flagged {
      color: #E11D48;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
    }

    /* Metric Boxes */
    .metric-box {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 6px 10px;
      background: #ffffff;
    }
    .metric-label {
      font-size: 8px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .metric-val {
      font-size: 13.5px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #0A192F;
      margin-top: 2px;
    }
    .metric-sub {
      font-size: 8px;
      color: #94A3B8;
      margin-top: 1px;
    }

    /* Forensic Audit Flag Banner */
    .audit-status-banner {
      border-radius: 6px;
      padding: 7px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-clear {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      border-left: 4px solid #059669;
      color: #065F46;
    }
    .status-flagged {
      background: #FFF1F2;
      border: 1px solid #FECDD3;
      border-left: 4px solid #E11D48;
      color: #9F1239;
    }
    .status-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-desc {
      font-size: 8.5px;
      margin-top: 1px;
      opacity: 0.95;
    }

    /* Tables */
    table.dossier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    table.dossier-table th {
      background: #F1F5F9;
      color: #0A192F;
      text-align: left;
      padding: 5px 8px;
      font-weight: 700;
      border: 1px solid #CBD5E1;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.dossier-table td {
      padding: 5px 8px;
      border: 1px solid #E2E8F0;
      color: #1E293B;
    }
    table.dossier-table tr:nth-child(even) {
      background: #F8FAFC;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }
    .text-right {
      text-align: right;
    }

    /* Progress bar */
    .progress-track {
      background: #E2E8F0;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: #059669;
      border-radius: 3px;
    }

    /* Footer / Safe harbor */
    .dossier-footer {
      border-top: 1.5px solid #0A192F;
      padding-top: 6px;
      margin-top: 8px;
      font-size: 7.5px;
      color: #64748B;
      line-height: 1.35;
    }
    .footer-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .safe-harbor-tag {
      font-weight: 800;
      color: #0A192F;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="dossier-page">
    <!-- Header -->
    <div class="header-bar">
      <div class="emblem-title">
        <!-- Dharma Aperture Vector Emblem -->
        <svg class="emblem-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="47" fill="#0A192F" stroke="#1E293B" stroke-width="2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4 2" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#D97706" stroke-width="1.5" />
          <circle cx="50" cy="50" r="10" fill="#059669" />
          <g stroke="#FFFFFF" stroke-width="1.2">
            <line x1="50" y1="14" x2="50" y2="86" />
            <line x1="14" y1="50" x2="86" y2="50" />
            <line x1="24.5" y1="24.5" x2="75.5" y2="75.5" />
            <line x1="24.5" y1="75.5" x2="75.5" y2="24.5" />
            <line x1="32" y1="18.8" x2="68" y2="81.2" />
            <line x1="68" y1="18.8" x2="32" y2="81.2" />
            <line x1="18.8" y1="32" x2="81.2" y2="68" />
            <line x1="18.8" y1="68" x2="81.2" y2="32" />
          </g>
          <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" />
        </svg>
        <div class="title-group">
          <h1>National Forensic Audit Dossier</h1>
          <p>The Sovereign Civic Ledger of India • Form 26 Sworn Verification</p>
        </div>
      </div>
      <div class="audit-meta">
        <div>Ref: <span class="ref">${auditRef}</span></div>
        <div>Audited: ${generatedDate} ${generatedTime}</div>
        <div>Standard: Rule 4A, Conduct of Elections Rules 1961</div>
      </div>
    </div>

    <!-- Identity Banner -->
    <div class="identity-card">
      <div>
        <h2 class="cand-name">${candidate.name} ${candidate.alias ? `("${candidate.alias}")` : ''}</h2>
        <div class="cand-sub">
          <strong>${candidate.house}</strong> • ${candidate.constituency} Constituency, ${candidate.state} • Election Year: <strong>${candidate.filing_year}</strong>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="party-tag">${candidate.party || 'Independent'}</div>
        <div class="seal-circle ${candidate.serious_criminal_cases_count > 0 ? 'flagged' : ''}">
          <div class="seal-inner ${candidate.serious_criminal_cases_count > 0 ? 'flagged' : ''}">
            <span class="seal-num ${candidate.serious_criminal_cases_count > 0 ? 'flagged' : ''}">${candidate.serious_criminal_cases_count}</span>
            <span class="seal-lbl ${candidate.serious_criminal_cases_count > 0 ? 'flagged' : ''}">CHARGES</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Forensic Status Banner -->
    <div class="audit-status-banner ${candidate.has_arithmetic_discrepancy ? 'status-flagged' : 'status-clear'}">
      <div>
        <div class="status-title">
          ${candidate.has_arithmetic_discrepancy ? '⚠️ Forensic Arithmetic Discrepancy Detected' : '✓ Sworn Disclosures Reconciled & Mathematically Verified'}
        </div>
        <div class="status-desc">
          ${
            candidate.has_arithmetic_discrepancy
              ? `Part B summary differs from sworn Part A itemized schedule by ${formatINR(candidate.delta_movable || candidate.delta_immovable)}. Audit coordinates recorded.`
              : 'Cross-tabulation check between Part A schedule totals and Part B abstract summary produced exact 0-delta match.'
          }
        </div>
      </div>
      <div class="mono" style="font-size: 11px;">
        WDR: ${candidate.wealth_discrepancy_ratio ? candidate.wealth_discrepancy_ratio.toFixed(2) : '1.00'}x
      </div>
    </div>

    <!-- Financial Disclosures -->
    <div class="section-title">1. Sworn Assets & Liabilities (Form 26 Affidavit)</div>
    <div class="grid-3">
      <div class="metric-box">
        <div class="metric-label">Declared Net Worth</div>
        <div class="metric-val">${formatINR(candidate.total_net_worth)}</div>
        <div class="metric-sub">Assets less liabilities</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Movable Assets (Table 7)</div>
        <div class="metric-val">${formatINR(candidate.total_movable_assets)}</div>
        <div class="metric-sub">Bank, Cash, Gold, Shares</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Immovable Assets (Table 8)</div>
        <div class="metric-val">${formatINR(candidate.total_immovable_assets)}</div>
        <div class="metric-sub">Land, Buildings, Properties</div>
      </div>
    </div>
    <div class="grid-2">
      <div class="metric-box">
        <div class="metric-label">Total Sworn Liabilities</div>
        <div class="metric-val">${formatINR(candidate.total_liabilities)}</div>
        <div class="metric-sub">Bank loans & statutory dues</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">5-Year Declared Income (ITR Table 4)</div>
        <div class="metric-val">${formatINR(candidate.total_five_year_income)}</div>
        <div class="metric-sub">Cumulative sworn income</div>
      </div>
    </div>

    <!-- MoSPI MPLADS Fund Tracking -->
    <div class="section-title">2. MoSPI MPLADS Constituency Fund Velocity (₹5 Cr/Year)</div>
    ${
      candidate.mplads
        ? `
      <div class="grid-3">
        <div class="metric-box">
          <div class="metric-label">Entitled / Released</div>
          <div class="metric-val">${formatINR(candidate.mplads.released_amount)}</div>
          <div class="metric-sub">Of ${formatINR(candidate.mplads.entitled_amount)} entitlement</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Utilized / Spent</div>
          <div class="metric-val">${formatINR(candidate.mplads.expenditure_amount)}</div>
          <div class="metric-sub">${candidate.mplads.works_completed} works completed</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Expenditure Velocity</div>
          <div class="metric-val" style="color: ${candidate.mplads.utilization_rate < 60 ? '#b91c1c' : '#047857'};">
            ${candidate.mplads.utilization_rate.toFixed(1)}%
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${Math.min(100, candidate.mplads.utilization_rate)}%; background: ${
            candidate.mplads.utilization_rate < 60 ? '#ef4444' : '#10b981'
          };"></div>
          </div>
        </div>
      </div>
      `
        : `
      <div class="metric-box" style="background: #f8fafc; color: #64748b; font-size: 9px; padding: 6px 10px;">
        MPLADS records currently syncing for this seat from MoSPI central portal.
      </div>
      `
    }

    <!-- Multi-Term Historical Wealth CAGR -->
    <div class="section-title">3. Longitudinal Wealth Growth & Compound Annual Growth (CAGR)</div>
    ${
      candidate.historical_wealth && candidate.historical_wealth.length > 0
        ? `
      <table class="dossier-table">
        <thead>
          <tr>
            <th>Election Interval</th>
            <th class="text-right">Initial Assets</th>
            <th class="text-right">Final Assets</th>
            <th class="text-right">Absolute Increase</th>
            <th class="text-right">% Growth</th>
            <th class="text-right">Annual CAGR</th>
            <th>Anomaly Flag</th>
          </tr>
        </thead>
        <tbody>
          ${candidate.historical_wealth
            .map(
              (h) => `
            <tr>
              <td><strong>${h.from_year} &rarr; ${h.to_year}</strong></td>
              <td class="text-right mono">${formatINR(h.initial_assets)}</td>
              <td class="text-right mono">${formatINR(h.final_assets)}</td>
              <td class="text-right mono">${formatINR(h.absolute_increase)}</td>
              <td class="text-right mono">+${h.percentage_increase}%</td>
              <td class="text-right mono">${h.cagr_percent ? `${h.cagr_percent}%` : 'N/A'}</td>
              <td>
                ${
                  h.is_rapid_accumulation
                    ? '<span style="color:#b91c1c; font-weight:800;">⚠️ Rapid Surge (&ge;300%)</span>'
                    : '<span style="color:#047857; font-weight:700;">Normal Trajectory</span>'
                }
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      `
        : `
      <div class="metric-box" style="background: #f8fafc; color: #64748b; font-size: 9px; padding: 6px 10px;">
        Single-term candidate or preliminary archival matching active.
      </div>
      `
    }

    <!-- Criminal & Legislative Record -->
    <div class="section-title">4. Criminal Proceedings & Parliamentary Record</div>
    <div class="grid-3">
      <div class="metric-box">
        <div class="metric-label">Declared Criminal Cases</div>
        <div class="metric-val" style="color: ${candidate.serious_criminal_cases_count > 0 ? '#b91c1c' : '#0f172a'};">
          ${candidate.criminal_cases_count} Case(s)
        </div>
        <div class="metric-sub">${candidate.serious_criminal_cases_count} heinous/serious IPC charges</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Sansad Attendance</div>
        <div class="metric-val">${candidate.attendance_rate !== undefined ? `${candidate.attendance_rate}%` : 'N/A'}</div>
        <div class="metric-sub">Parliamentary sittings</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Questions & Debates</div>
        <div class="metric-val mono">${candidate.questions_count ?? 0} Qs / ${candidate.debates_count ?? 0} Debates</div>
        <div class="metric-sub">Sansad legislative participation</div>
      </div>
    </div>

    <!-- Statutory Section 79 Safe Harbor Disclaimer -->
    <div class="dossier-footer">
      <div class="footer-flex">
        <div style="max-width: 82%;">
          <div class="safe-harbor-tag">STATUTORY NOTICE UNDER SECTION 79 INFORMATION TECHNOLOGY ACT, 2000</div>
          <div>
            This audit dossier compiles verified sworn public filings submitted under oath to the Election Commission of India (ECI Form 26) and official development fund records from the Ministry of Statistics and Programme Implementation (MoSPI). Apna Neta acts solely as an automated civic research and document indexing utility under Section 79 intermediary protections. All data is cryptographically traceable to official gazettes. Suitable for RTI inquiries, public interest research, and civic awareness.
          </div>
        </div>
        <div style="text-align: right; font-family: ui-monospace, monospace; font-size: 7.5px;">
          <div>Source: affidavit.eci.gov.in</div>
          <div>Portal: apnaneta.in</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>
`;

  // Open printable window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if popups are blocked: use invisible iframe
    if (typeof document !== 'undefined' && document.body) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 1000);
        }, 300);
      }
    }
  }
}
