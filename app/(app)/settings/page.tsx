'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [company, setCompany] = useState('');

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="Manage your account and workspace preferences." />

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Profile</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update your personal information.
          </p>
          <Separator className="my-4" />
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {email.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">Change avatar</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="company">Company name</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Logistics" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast.success('Profile updated')}>Save changes</Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Notifications</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose what you want to be notified about.
          </p>
          <Separator className="my-4" />
          <div className="space-y-4">
            {[
              { label: 'New enquiries', desc: 'Get notified when a new enquiry is received' },
              { label: 'Shipment updates', desc: 'Status changes on your active shipments' },
              { label: 'Payment alerts', desc: 'Invoice payments and overdue notices' },
              { label: 'Weekly digest', desc: 'Summary of your operations every Monday' },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch defaultChecked={i < 2} />
              </div>
            ))}
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Appearance</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Customize how Bonzer looks on your device.
          </p>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Compact mode</p>
                <p className="text-xs text-muted-foreground">Reduce spacing for denser layouts</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reduced motion</p>
                <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20 p-6">
          <h3 className="font-display text-base font-semibold text-destructive">Danger Zone</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Irreversible actions. Proceed with caution.
          </p>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your workspace and all data.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => toast.error('Contact support to delete your account')}>
              Delete account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
