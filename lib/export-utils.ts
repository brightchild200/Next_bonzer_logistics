import * as XLSX from 'xlsx';

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export function buildWorkbook(rows: ExportRow[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');
  return workbook;
}

export function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}

export function formatDateForFile(date: string) {
  return date.replaceAll('-', '');
}

export function openPrintWindow({
  title,
  subtitle,
  tableHtml,
}: {
  title: string;
  subtitle?: string;
  tableHtml: string;
}) {
  const win = window.open('', '_blank', 'width=1200,height=900');
  if (!win) return null;

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
          .page { padding: 28px; }
          .letterhead {
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 20px;
          }
          .brand { font-size: 28px; font-weight: 700; letter-spacing: 0.02em; }
          .sub { color: #6b7280; font-size: 12px; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          .meta { margin: 0 0 18px; color: #374151; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .footer { margin-top: 18px; font-size: 11px; color: #6b7280; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="letterhead">
            <div>
              <div class="brand">Bonzer Logistics</div>
              <div class="sub">ERP Workbench</div>
            </div>
            <div class="sub">Generated ${new Date().toLocaleString()}</div>
          </div>
          <h1>${title}</h1>
          ${subtitle ? `<p class="meta">${subtitle}</p>` : ''}
          ${tableHtml}
          <div class="footer">Use Print to save this document as PDF.</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  return win;
}
