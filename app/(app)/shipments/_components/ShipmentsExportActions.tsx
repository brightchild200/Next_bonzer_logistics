'use client';

import { useState } from 'react';
import { ExportActions } from '@/components/export-actions';
import { exportShipments } from '@/lib/actions/shipments';
import { downloadWorkbook, formatDateForFile, openPrintWindow } from '@/lib/export-utils';

interface ShipmentsExportActionsProps {
  search: string;
  exportLabel?: string;
  printLabel?: string;
  disableExport?: boolean;
  disablePrint?: boolean;
}

export function ShipmentsExportActions({
  search,
  exportLabel = 'Export',
  printLabel = 'Print',
  disableExport = false,
  disablePrint = false,
}: ShipmentsExportActionsProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async ({ from, to }: { from?: string; to?: string }) => {
    setBusy(true);
    try {
      const result = await exportShipments({
        search: search || undefined,
        from,
        to,
      });

      if (!result.success) {
        console.error('Export failed:', result.error);
        return;
      }

      const rows = result.rows.map((s) => ({
        Reference: s.reference,
        Customer: s.customer_name ?? '',
        Origin: s.origin ?? '',
        Destination: s.destination ?? '',
        Mode: s.mode,
        Carrier: s.carrier ?? '',
        Status: s.status,
        ETA: s.eta ?? '',
        Currency: s.currency,
        Value: s.value,
      }));

      await downloadWorkbook(rows, 'Shipments', `shipments_${formatDateForFile(from || 'all')}_${formatDateForFile(to || 'all')}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async ({ from, to }: { from?: string; to?: string }) => {
    setBusy(true);
    try {
      const result = await exportShipments({
        search: search || undefined,
        from,
        to,
      });

      if (!result.success) {
        console.error('Print failed:', result.error);
        return;
      }

      const tableHtml = `
        <table>
          <thead><tr><th>Ref</th><th>Customer</th><th>Route</th><th>Mode</th><th>Status</th><th>ETA</th></tr></thead>
          <tbody>
            ${result.rows
              .map(
                (s) =>
                  `<tr><td>${s.reference}</td><td>${s.customer_name ?? ''}</td><td>${s.origin ?? ''} → ${s.destination ?? ''}</td><td>${s.mode}</td><td>${s.status}</td><td>${s.eta ? new Date(s.eta).toLocaleDateString() : ''}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>`;

      const win = openPrintWindow({ title: 'Shipments', subtitle: `From ${from || 'start'} to ${to || 'now'}`, tableHtml });
      win?.print();
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ExportActions
      exportLabel={exportLabel}
      printLabel={printLabel}
      disableExport={disableExport || busy}
      disablePrint={disablePrint || busy}
      onExport={handleExport}
      onPrint={handlePrint}
    />
  );
}
