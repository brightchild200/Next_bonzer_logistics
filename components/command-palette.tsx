'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { navItems } from '@/lib/nav';
import {
  Search,
  Plus,
  FileText,
  Package,
  Users,
  Receipt,
  Moon,
  Sun,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { signOut } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search anything or run a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => run(() => router.push(item.href))}
                className="gap-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => run(() => router.push('/enquiries?new=true'))}
            className="gap-2"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            New Enquiry
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push('/shipments?new=true'))}
            className="gap-2"
          >
            <Package className="h-4 w-4 text-muted-foreground" />
            New Shipment
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push('/customers?new=true'))}
            className="gap-2"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            New Customer
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push('/quotations?new=true'))}
            className="gap-2"
          >
            <Receipt className="h-4 w-4 text-muted-foreground" />
            New Quotation
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences">
          <CommandItem onSelect={() => run(() => setTheme('light'))} className="gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme('dark'))} className="gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            Dark mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/settings'))} className="gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() =>
              run(async () => {
                await signOut();
                toast.success('Signed out');
              })
            }
            className="gap-2"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
