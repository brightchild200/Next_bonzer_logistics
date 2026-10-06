type Cell = string | number | null | undefined;

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  const esc = (c: Cell) => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
