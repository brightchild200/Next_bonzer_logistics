'use client';

import { useRouter } from 'next/navigation';
import { Menu, Search, Bell, Plus, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/components/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function Topbar({
  onMenuClick,
  onCmdOpen,
}: {
  onMenuClick: () => void;
  onCmdOpen: () => void;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const initials = (user?.email ?? 'BZ').slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search trigger */}
        <button
          onClick={onCmdOpen}
          className="group flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="hidden gap-1.5 sm:flex"
            onClick={() => router.push('/enquiries?new=true')}
          >
            <Plus className="h-4 w-4" />
            New Enquiry
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                <Badge variant="secondary" className="text-[10px]">3 new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-auto">
                {[
                  { t: 'Shipment SHP-1042 cleared customs', s: '2 min ago', c: 'text-success' },
                  { t: 'Invoice INV-2089 is overdue', s: '1 hour ago', c: 'text-destructive' },
                  { t: 'New enquiry from Maersk Logistics', s: '3 hours ago', c: 'text-primary' },
                ].map((n, i) => (
                  <DropdownMenuItem key={i} className="flex flex-col items-start gap-0.5 py-2.5">
                    <span className="text-sm">{n.t}</span>
                    <span className="text-[11px] text-muted-foreground">{n.s}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium">Account</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  toast.success('Signed out');
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
