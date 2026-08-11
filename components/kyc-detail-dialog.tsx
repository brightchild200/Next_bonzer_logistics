'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Clock, RotateCcw, FileText, Building2, Mail, Phone, MapPin, User, ShieldCheck, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { KycRecord } from '@/lib/actions/kyc/types';

interface KycDetailDialogProps {
  record: KycRecord | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onStatusChange: (record: KycRecord, newStatus: KycRecord['kyc_status']) => void;
}

export function KycDetailDialog({
  record,
  open,
  setOpen,
  onStatusChange,
}: KycDetailDialogProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  if (!record) return null;

  const handleStatusChange = (newStatus: KycRecord['kyc_status']) => {
    if (record.kyc_status === newStatus) return;
    setUpdatingStatus(record.id);
    onStatusChange(record, newStatus);
    setTimeout(() => setUpdatingStatus(null), 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle>KYC Record Details</DialogTitle>
          <DialogDescription>
            Review and update KYC status. Customer data is read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-11rem)] overflow-y-auto pr-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Company Info */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Company Name</p>
              </div>
              <p className="font-medium ml-6">{record.company_name}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reference</p>
              </div>
              <p className="font-mono text-sm ml-6">{record.customer_ref}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">KYC Status</p>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <StatusBadge status={record.kyc_status} size="md" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Contact Person</p>
              </div>
              <p className="text-sm ml-6">{record.contact_person || '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Email</p>
              </div>
              <p className="text-sm ml-6">{record.email || '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Phone</p>
              </div>
              <p className="text-sm ml-6">{record.phone || '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">City</p>
              </div>
              <p className="text-sm ml-6">{record.city || '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">State</p>
              </div>
              <p className="text-sm ml-6">{record.state || '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Last Updated</p>
              </div>
              <p className="text-sm ml-6">{new Date(record.updated_at).toLocaleDateString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
              <p className="text-sm ml-6">{new Date(record.created_at).toLocaleDateString()}</p>
            </div>

            {/* Enquiry Info */}
            <div className="space-y-1 sm:col-span-2 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Enquiry Summary</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Enquiries</p>
                  <p className="font-medium">{record.enquiry_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Latest Enquiry</p>
                  <p className="font-mono text-xs">{record.latest_enquiry_ref || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={updatingStatus === record.id}>
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {record.kyc_status !== 'verified' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('verified')}
                  disabled={updatingStatus === record.id}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                  Mark Verified
                </DropdownMenuItem>
              )}
              {record.kyc_status !== 'rejected' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('rejected')}
                  disabled={updatingStatus === record.id}
                  className="text-destructive focus:text-destructive"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Mark Rejected
                </DropdownMenuItem>
              )}
              {record.kyc_status !== 'submitted' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('submitted')}
                  disabled={updatingStatus === record.id}
                >
                  <FileText className="mr-2 h-4 w-4 text-info" />
                  Mark Submitted
                </DropdownMenuItem>
              )}
              {record.kyc_status !== 'pending' && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange('pending')}
                  disabled={updatingStatus === record.id}
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-warning" />
                  Mark Pending
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}