import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { rows, sheetName, fileName } = await request.json();
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows ?? []);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, String(sheetName || 'Sheet1').slice(0, 31));
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${String(fileName || 'export.xlsx').replace(/[\"\r\n]/g, '')}"`,
    },
  });
}
