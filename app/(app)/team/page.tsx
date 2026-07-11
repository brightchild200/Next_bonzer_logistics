'use client';

import { useEffect, useState } from 'react';
import { Plus, Mail, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import type { TeamMember } from '@/lib/supabase';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMembers(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Team" description={`${members.length} team members`}>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))
          : members.length === 0 ? (
            <Card className="col-span-full flex h-64 flex-col items-center justify-center p-8 text-center">
              <p className="text-base font-semibold">No team members yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite your team to collaborate on logistics operations.
              </p>
            </Card>
          ) : (
            members.map((m) => (
              <Card key={m.id} className="group p-5 transition-all hover:shadow-lg hover:shadow-foreground/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        style={{ backgroundColor: m.avatar_color }}
                        className="font-semibold text-white"
                      >
                        {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.role ?? '—'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit role</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {m.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {m.email}
                    </div>
                  )}
                  <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {m.status}
                  </Badge>
                </div>
              </Card>
            ))
          )}
      </div>
    </div>
  );
}
