import { Candidate } from '../types/candidate';

/** Escape database text before inserting it into a printable HTML document. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

function eciSourceUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'eci.gov.in' || host.endsWith('.eci.gov.in')) ? url.href : null;
  } catch {
    return null;
  }
}

/** Create a source-attributed summary that the browser can print or save as PDF. */
export function exportCandidateDossierPdf(candidate: Candidate): void {
  const sourceUrl = eciSourceUrl(candidate.pdf_source_url);
  const financialValue = (amount: number) => candidate.affidavit_status === 'audited' ? formatINR(amount) : 'Unavailable';
  const auditStatus = candidate.affidavit_status === 'audited'
    ? candidate.has_arithmetic_discrepancy ? 'Arithmetic discrepancy recorded' : 'Arithmetic audit recorded without a discrepancy'
    : candidate.affidavit_status === 'source_only' ? 'Source indexed; arithmetic audit unavailable' : 'Affidavit unavailable';
  const caseStatus = candidate.criminal_record_status === 'declared'
    ? `${candidate.criminal_cases_count} case(s) recorded in this filing; ${candidate.serious_criminal_cases_count} marked serious`
    : 'Case disclosure unavailable';
  const conflictStatus = candidate.has_section_9a_conflict
    ? 'Reviewed Section 9A finding recorded; inspect the underlying source'
    : 'No reviewed finding recorded. This does not establish that no contracts exist.';
  const date = new Date().toLocaleDateString('en-IN');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Apna Neta source summary - ${escapeHtml(candidate.name)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: system-ui, sans-serif; color: #0a192f; margin: 0; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 22px 0 8px; }
  .muted { color: #526071; font-size: 12px; } .banner { border-bottom: 3px solid #d97706; padding-bottom: 14px; }
  .notice { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; margin: 18px 0; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 8px 5px; vertical-align: top; }
  th { width: 42%; color: #526071; font-weight: 600; }
  a { color: #075985; overflow-wrap: anywhere; }
  footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #526071; }
</style></head><body>
<header class="banner"><h1>Apna Neta · Candidate record summary</h1>
<div class="muted">Generated ${escapeHtml(date)} · Based on indexed public records · Not an official Form 26 copy or legal finding</div></header>
<h2>${escapeHtml(candidate.name)}</h2>
<div class="muted">${escapeHtml(candidate.house)} · ${escapeHtml(candidate.constituency)}, ${escapeHtml(candidate.state)} · Filing year: ${candidate.filing_year || 'Unavailable'}</div>
<div class="notice"><strong>Evidence status:</strong> ${escapeHtml(auditStatus)}. Open the original ECI document before relying on a figure.</div>
<h2>Financial disclosure</h2><table>
<tr><th>Net worth</th><td>${financialValue(candidate.total_net_worth)}</td></tr>
<tr><th>Movable assets</th><td>${financialValue(candidate.total_movable_assets)}</td></tr>
<tr><th>Immovable assets</th><td>${financialValue(candidate.total_immovable_assets)}</td></tr>
<tr><th>Liabilities</th><td>${financialValue(candidate.total_liabilities)}</td></tr>
<tr><th>Five-year declared income</th><td>${financialValue(candidate.total_five_year_income)}</td></tr>
</table>
<h2>Other indexed records</h2><table>
<tr><th>Criminal cases</th><td>${escapeHtml(caseStatus)}</td></tr>
<tr><th>Parliamentary attendance</th><td>${candidate.attendance_rate == null ? 'Unavailable' : `${candidate.attendance_rate}%`}</td></tr>
<tr><th>Questions / debates</th><td>${candidate.questions_count == null || candidate.debates_count == null ? 'Unavailable' : `${candidate.questions_count} / ${candidate.debates_count}`}</td></tr>
<tr><th>MPLADS utilization</th><td>${candidate.mplads ? `${candidate.mplads.utilization_rate}% (${escapeHtml(candidate.mplads.term_years || 'term unavailable')})` : 'Unavailable'}</td></tr>
<tr><th>Section 9A review</th><td>${escapeHtml(conflictStatus)}</td></tr>
</table>
<h2>Source</h2>
${sourceUrl ? `<p><a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>` : '<p>Official ECI source link unavailable.</p>'}
${candidate.affidavit_sha256 ? `<p class="muted">Indexed SHA-256: ${escapeHtml(candidate.affidavit_sha256)}</p>` : ''}
<footer>Form 26 is filed under Rule 4A of the Conduct of Elections Rules, 1961. This summary distinguishes available records from unreviewed or missing data; it is not a reproduced affidavit or a determination under the Representation of the People Act, 1951.</footer>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.opener = null;
}
