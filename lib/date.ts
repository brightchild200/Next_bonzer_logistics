/** Local-time date helpers. Never use toISOString().slice(0,10) for calendar
 * dates: in IST (UTC+5:30) it shifts local midnight back a day. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDate(
  s: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  const d = parseISODate(s);
  return d ? d.toLocaleDateString('en-IN', opts) : '—';
}

export function daysUntil(s: string | null | undefined): number | null {
  const target = parseISODate(s);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Indian financial year label, e.g. 6 Oct 2026 -> "26-27"; 5 Feb 2027 -> "26-27". */
export function fiscalYearLabel(d: Date = new Date()): string {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const yy = (n: number) => String(n % 100).padStart(2, '0');
  return `${yy(start)}-${yy(start + 1)}`;
}
