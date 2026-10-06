'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, Bell, Check, ChevronDown, ClipboardList, Package, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar } from './sidebar';
import { useCs } from '@/lib/cs-store';
import { daysUntil } from '@/lib/date';
import { cn } from '@/lib/utils';

const titleMap: Record<string, string> = {
  '/cs/enquiries': 'All Enquiries',
  '/cs/quick-dsr': 'Quick DSR Update',
  '/cs/track': 'Live Shipment Tracking',
  '/cs/documents': 'Customer Documents',
};

function ConnectionStatus() {
  const { loading, loadError } = useCs();
  const state = loading ? 'loading' : loadError ? 'error' : 'ok';
  const label = { loading: 'Connecting…', error: 'Supabase error', ok: 'Supabase connected' }[state];
  return (
    <div
      title={loadError ?? label}
      className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 xl:flex"
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          state === 'ok' && 'bg-emerald-500',
          state === 'loading' && 'animate-pulse bg-amber-400',
          state === 'error' && 'bg-rose-500'
        )}
      />
      {label}
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const { enquiries, shipments } = useCs();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const enquiryHits = React.useMemo(
    () =>
      q
        ? enquiries
            .filter(
              (e) =>
                e.enquiryNo.toLowerCase().includes(q) ||
                e.customerName.toLowerCase().includes(q) ||
                e.commodity.toLowerCase().includes(q) ||
                e.shipper.toLowerCase().includes(q) ||
                e.consignee.toLowerCase().includes(q)
            )
            .slice(0, 5)
        : [],
    [q, enquiries]
  );
  const jobHits = React.useMemo(
    () =>
      q
        ? shipments
            .filter(
              (s) =>
                s.jobNo.toLowerCase().includes(q) ||
                s.hbl.toLowerCase().includes(q) ||
                s.mbl.toLowerCase().includes(q) ||
                s.invoiceNo.toLowerCase().includes(q) ||
                s.shipper.toLowerCase().includes(q) ||
                s.consignee.toLowerCase().includes(q)
            )
            .slice(0, 5)
        : [],
    [q, shipments]
  );

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && query.trim()) {
            if (jobHits.length > 0 && enquiryHits.length === 0) go(`/cs/track?q=${encodeURIComponent(query.trim())}`);
            else go(`/cs/enquiries?q=${encodeURIComponent(query.trim())}`);
          }
        }}
        placeholder="Search jobs, enquiries..."
        className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 lg:w-64"
      />
      {open && q && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {enquiryHits.length === 0 && jobHits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No enquiries or jobs match “{query}”.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {enquiryHits.length > 0 && (
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Enquiries
                </p>
              )}
              {enquiryHits.map((e) => (
                <button
                  key={`e${e.id}`}
                  onClick={() => go(`/cs/enquiries?q=${encodeURIComponent(e.enquiryNo === 'Draft' ? e.customerName : e.enquiryNo)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                >
                  <ClipboardList className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs font-semibold text-slate-800">{e.enquiryNo}</span>
                    <span className="block truncate text-xs text-slate-500">{e.customerName}</span>
                  </span>
                </button>
              ))}
              {jobHits.length > 0 && (
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jobs</p>
              )}
              {jobHits.map((s) => (
                <button
                  key={`j${s.id}`}
                  onClick={() => go(`/cs/track?q=${encodeURIComponent(s.jobNo)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                >
                  <Package className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs font-semibold text-slate-800">{s.jobNo}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {s.shipper} → {s.consignee}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { documents, enquiries } = useCs();

  const docAlerts = React.useMemo(
    () =>
      documents
        .map((d) => ({ doc: d, days: daysUntil(d.expiryDate) }))
        .filter((x): x is { doc: typeof x.doc; days: number } => x.days !== null && x.days < 15)
        .sort((a, b) => a.days - b.days),
    [documents]
  );
  const pending = enquiries.filter((e) => e.status === 'Pending').length;
  const total = docAlerts.length + (pending > 0 ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {total > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="font-heading text-sm font-bold text-slate-900">Notifications</p>
        </div>
        {total === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {pending > 0 && (
              <Link href="/cs/enquiries" className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{pending}</span> enquir{pending === 1 ? 'y is' : 'ies are'} pending confirmation
                </p>
              </Link>
            )}
            {docAlerts.map(({ doc, days }) => (
              <Link key={doc.id} href="/cs/documents" className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{doc.customerName}</span> — {doc.docType} {doc.docNumber}{' '}
                  {days < 0 ? `expired ${Math.abs(days)}d ago` : `expires in ${days}d`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function UserSwitcher() {
  const { salesPeople, currentUser, setCurrentUserId } = useCs();
  const initials = currentUser
    ? currentUser.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : '?';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left hover:bg-slate-100 sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-[10px] font-semibold text-white">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">
            {currentUser ? currentUser.name : 'Select user'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-slate-500">Working as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {salesPeople.length === 0 && <p className="px-2 py-1.5 text-sm text-slate-500">No sales persons found</p>}
        {salesPeople.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => setCurrentUserId(s.id)}>
            <Check className={cn('mr-2 h-4 w-4', currentUser?.id === s.id ? 'text-blue-600' : 'opacity-0')} />
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const title = titleMap[pathname] || 'Customer Service';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="font-heading text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ConnectionStatus />
          <GlobalSearch />
          <Notifications />
          <UserSwitcher />
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
