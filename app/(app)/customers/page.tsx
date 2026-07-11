'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Download, Users, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/supabase';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    query.then(({ data }) => {
      setCustomers(data ?? []);
      setLoading(false);
    });
  }, [search]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Customers" description={`${customers.length} customers`}>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))
          : customers.length === 0 ? (
            <Card className="col-span-full flex h-64 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-base font-semibold">No customers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add customers to start managing your logistics relationships.
              </p>
            </Card>
          ) : (
            customers.map((c) => (
              <Card key={c.id} className="group p-5 transition-all hover:shadow-lg hover:shadow-foreground/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {c.company_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold leading-tight">{c.company_name}</p>
                      <p className="text-xs text-muted-foreground">{c.contact_name ?? '—'}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  {c.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </div>
                  )}
                  {(c.city || c.country) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {[c.city, c.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
      </div>
    </div>
  );
}
