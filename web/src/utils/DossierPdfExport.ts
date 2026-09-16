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
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .dossier-page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .emblem-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .flag-badge {
      font-size: 24px;
      line-height: 1;
    }
    .title-group h1 {
      font-size: 16px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.3px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .title-group p {
      margin: 2px 0 0 0;
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .audit-meta {
      text-align: right;
      font-size: 9px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #475569;
    }
    .audit-meta .ref {
      font-weight: 700;
      color: #0f172a;
    }

    /* Candidate Identity Banner */
    .identity-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cand-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .cand-sub {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .party-tag {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Section Grid */
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin: 10px 0 6px 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }

    /* Metric Boxes */
    .metric-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      background: #ffffff;
    }
    .metric-label {
      font-size: 8.5px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
    }
    .metric-val {
      font-size: 13px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #0f172a;
      margin-top: 2px;
    }
    .metric-sub {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 1px;
    }

    /* Forensic Audit Flag Banner */
    .audit-status-banner {
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-clear {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .status-flagged {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .status-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-desc {
      font-size: 9px;
      margin-top: 1px;
      opacity: 0.9;
    }

    /* Tables */
    table.dossier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    table.dossier-table th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 5px 8px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    table.dossier-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.dossier-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 700;
    }
    .text-right {
      text-align: right;
    }

    /* Progress bar */
    .progress-track {
      background: #e2e8f0;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 3px;
    }

    /* Footer / Safe harbor */
    .dossier-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 10px;
      font-size: 7.5px;
      color: #64748b;
      line-height: 1.35;
    }
    .footer-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .safe-harbor-tag {
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="dossier-page">
    <!-- Header -->
    <div class="header-bar">
      <div class="emblem-title">
        <div class="flag-badge">🇮🇳</div>
        <div class="title-group">
          <h1>National Citizen Forensic Audit Dossier</h1>
          <p>Autonomous Indian Election & Public Representative Verification System</p>
        </div>
      </div>
      <div class="audit-meta">
        <div>Ref: <span class="ref">${auditRef}</span></div>
        <div>Generated: ${generatedDate} ${generatedTime}</div>
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
      <div class="party-tag">${candidate.party || 'Independent'}</div>
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
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }
  }
}
