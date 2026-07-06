// Client-side report export — no extra deps.
// CSV: build text and download. PDF: render an HTML view and open the print
// dialog (the user "saves as PDF"), which keeps the bundle lean.

export interface ReportSection {
  heading: string;
  rows: { label: string; value: string | number }[];
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadReportCSV(title: string, sections: ReportSection[]) {
  const lines: string[] = [title, ''];
  for (const s of sections) {
    lines.push(s.heading);
    for (const r of s.rows) lines.push(`${csvCell(r.label)},${csvCell(r.value)}`);
    lines.push('');
  }
  const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
  triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function printReportPDF(title: string, sections: ReportSection[]) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return;
  const body = sections
    .map(
      s => `
        <h2>${s.heading}</h2>
        <table>
          ${s.rows.map(r => `<tr><td>${r.label}</td><td class="v">${r.value}</td></tr>`).join('')}
        </table>`
    )
    .join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;color:#0f172a;padding:32px;max-width:720px;margin:0 auto}
      h1{font-size:22px;margin:0 0 4px}
      .sub{color:#64748b;font-size:13px;margin:0 0 24px}
      h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:14px}
      td{padding:6px 8px;border-bottom:1px solid #f1f5f9}
      td.v{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
    </style></head><body>
    <h1>${title}</h1>
    <p class="sub">Generado el ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    ${body}
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  w.document.close();
}
