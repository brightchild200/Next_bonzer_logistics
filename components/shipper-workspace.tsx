'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Edit,
  Mail,
  Plus,
  Search,
  Users,
  X,
  Trash2,
  Eye,
  Printer,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Building2,
} from 'lucide-react';

import { toast } from 'sonner';

import { createShipper } from '@/lib/actions/shippers/create-shipper';
import { deleteShipper } from '@/lib/actions/shippers/delete-shipper';
import { updateShipper } from '@/lib/actions/shippers/update-shipper';
import { searchShippers, type ShipperSearchResult } from '@/lib/actions/shippers/search-shippers';
import type {
  Shipper,
  ShipperInput,
  CreateShipperPartyResult,
  UpdateShipperInput,
} from '@/lib/actions/shippers/types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { listShippers } from '@/lib/actions/shippers/list-shippers';
import { createClient } from '@/lib/db/client';
const supabase = createClient();

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;


function validatePanFormat(pan: string | null | undefined): string | null {
  if (!pan) return null;
  const upper = pan.toUpperCase();
  if (!PAN_REGEX.test(upper)) {
    return 'Invalid PAN format. Expected: AAAAA9999A';
  }
  return null;
}

function validateGstinFormat(gstin: string | null | undefined): string | null {
  if (!gstin) return null;
  const upper = gstin.toUpperCase();
  if (!GSTIN_REGEX.test(upper)) {
    return 'Invalid GSTIN format. Expected 15-character GSTIN';
  }
  return null;
}

function validatePanGstMatch(pan: string | null | undefined, gstin: string | null | undefined): string | null {
  if (!pan || !gstin) return null;
  const panUpper = pan.toUpperCase();
  const gstinUpper = gstin.toUpperCase();
  const panInGstin = gstinUpper.substring(2, 12);
  if (panInGstin !== panUpper) {
    return 'PAN in GSTIN (positions 3-12) does not match provided PAN';
  }
  return null;
}

function validateEmailFormat(email: string | null | undefined): string | null {
  if (!email) return null;
  if (!EMAIL_REGEX.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

function validatePhoneFormat(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Invalid phone number. Expected 10-15 digits';
  }
  return null;
}

function validatePincodeFormat(pincode: string | null | undefined): string | null {
  if (!pincode) return null;
  if (!PINCODE_REGEX.test(pincode)) {
    return 'Invalid pincode. Expected 6 digits';
  }
  return null;
}


export function ShipperWorkspace() {
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'company_name' | 'shipper_ref' | 'city' | 'state' | 'created_at'>('company_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const loadShippers = useCallback(async (searchTerm: string = '', pageNum: number = 0) => {
    setLoading(true);
    setError('');

    const result = await listShippers({
      search: searchTerm,
      page: pageNum,
      pageSize,
      sortBy,
      sortOrder: sortDir,
    });

    if (!result.success) {
      setShippers([]);
      setError(result.error);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setShippers(result.shippers);
    setTotalCount(result.totalCount);
    setLoading(false);
  }, [pageSize, sortBy, sortDir]);

  const searchParams = useSearchParams();
  const shipperIdParam = searchParams.get('shipperId');
  const viewShipperParam = searchParams.get('view') === 'true';

  useEffect(() => {
    if (shipperIdParam && !editDialogOpen && !detailsDialogOpen) {
      const shipper = shippers.find(s => s.id === shipperIdParam);
      if (shipper) {
        if (viewShipperParam) {
          openDetailsDialog(shipper);
        } else {
          openEditDialog(shipper);
        }
      }
    }
  }, [shipperIdParam, shippers, detailsDialogOpen, editDialogOpen, viewShipperParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
      void loadShippers(search, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadShippers]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
    void loadShippers(debouncedSearch, 0);
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingShipperId, setDeletingShipperId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingShipper, setEditingShipper] = useState<Shipper | null>(null);

  const [shipperForm, setShipperForm] = useState<ShipperInput>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    gst_number: '',
    pan_number: '',
  });

  const [checkingIdentifier, setCheckingIdentifier] = useState(false);

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ShipperInput, string>>>({});

  function updateShipperForm(field: keyof ShipperInput, value: string | boolean) {
    setShipperForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof ShipperInput, string>> = {};

    if (!shipperForm.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }

    const emailError = validateEmailFormat(shipperForm.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhoneFormat(shipperForm.phone);
    if (phoneError) errors.phone = phoneError;

    const panError = validatePanFormat(shipperForm.pan_number);
    if (panError) errors.pan_number = panError;

    const gstinError = validateGstinFormat(shipperForm.gst_number);
    if (gstinError) errors.gst_number = gstinError;

    const panGstError = validatePanGstMatch(shipperForm.pan_number, shipperForm.gst_number);
    if (panGstError) {
      errors.pan_number = panGstError;
      errors.gst_number = panGstError;
    }

    const pincodeError = validatePincodeFormat(shipperForm.pincode);
    if (pincodeError) errors.pincode = pincodeError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetShipperForm() {
    setShipperForm({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      gst_number: '',
      pan_number: '',
    });
    setFormErrors({});
    setEditingShipper(null);
    setCheckingIdentifier(false);
  }

  async function validateIdentifierConflict(): Promise<boolean> {
    const gstValue = shipperForm.gst_number?.trim();
    const panValue = shipperForm.pan_number?.trim();
    const currentShipperId = editingShipper?.id;

    if (!gstValue && !panValue) return true;

    setCheckingIdentifier(true);

    try {
      if (gstValue) {
        const { data, error } = await supabase
          .from('shippers')
          .select('id, shipper_ref, company_name')
          .eq('gst_number', gstValue)
          .maybeSingle();

        if (error) {
          toast.error('Failed to validate GST number', { position: 'top-center' });
          return false;
        }
        if (data && data.id !== currentShipperId) {
          toast.error(
            `This GST no. is invalid because it already belongs to ${data.company_name} (${data.shipper_ref})`,
            { position: 'top-center' }
          );
          return false;
        }
      }

      if (panValue) {
        const { data, error } = await supabase
          .from('shippers')
          .select('id, shipper_ref, company_name')
          .eq('pan_number', panValue)
          .maybeSingle();

        if (error) {
          toast.error('Failed to validate PAN', { position: 'top-center' });
          return false;
        }
        if (data && data.id !== currentShipperId) {
          toast.error(
            `This PAN no. is invalid because it already belongs to ${data.company_name} (${data.shipper_ref})`,
            { position: 'top-center' }
          );
          return false;
        }
      }

      return true;
    } finally {
      setCheckingIdentifier(false);
    }
  }

  function openEditDialog(shipper: Shipper) {
    setCreateDialogOpen(false);
    setDetailsDialogOpen(false);
    setEditingShipper(shipper);
    setShipperForm({
      company_name: shipper.company_name,
      contact_person: shipper.contact_person ?? '',
      email: shipper.email ?? '',
      phone: shipper.phone ?? '',
      address: shipper.address ?? '',
      city: shipper.city ?? '',
      state: shipper.state ?? '',
      country: shipper.country ?? 'India',
      pincode: shipper.pincode ?? '',
      gst_number: shipper.gst_number ?? '',
      pan_number: shipper.pan_number ?? '',
    });
    setFormErrors({});
    setEditDialogOpen(true);
  }

  function openDetailsDialog(shipper: Shipper) {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setEditingShipper(shipper);
    setDetailsDialogOpen(true);
  }

  async function handleCreateShipper() {
    if (!validateForm()) return;
    if (!(await validateIdentifierConflict())) return;

    setCreating(true);

    try {
      const result = await createShipper(shipperForm);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Shipper ${result.shipper.shipper_ref} created successfully`);

      for (const warning of result.warnings) {
        toast.warning(warning.message);
      }

      resetShipperForm();
      setCreateDialogOpen(false);
      await loadShippers(debouncedSearch, 0);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateShipper() {
    if (!editingShipper || !validateForm()) return;
    if (!(await validateIdentifierConflict())) return;

    setUpdating(true);

    try {
      const input: UpdateShipperInput = {
        shipper_id: editingShipper.id,
        ...shipperForm,
      };

      const result = await updateShipper(input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Shipper ${result.shipper.shipper_ref} updated successfully`);

      for (const warning of result.warnings) {
        toast.warning(warning.message);
      }

      resetShipperForm();
      setEditDialogOpen(false);
      await loadShippers(debouncedSearch, page);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteShipper() {
    if (!editingShipper) return;
    if (deleteConfirmText.trim() !== editingShipper.company_name.trim()) {
      toast.error('Type the exact company name to confirm delete');
      return;
    }

    setDeletingShipperId(editingShipper.id);
    try {
      const result = await deleteShipper(editingShipper.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Shipper deactivated successfully');
      setDeleteConfirmOpen(false);
      setDetailsDialogOpen(false);
      resetShipperForm();
      await loadShippers(debouncedSearch, page);
    } finally {
      setDeletingShipperId(null);
    }
  }

  const isDialogOpen = createDialogOpen || editDialogOpen;
  const isSubmitting = creating || updating;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Shippers"
        description={`${totalCount} shippers${debouncedSearch ? ` (filtered)` : ''}`}
      >
        <Button variant="outline" size="sm" className="gap-1.5" disabled={totalCount === 0}>
          <Download className="h-4 w-4" />
          Export
        </Button>

        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open && !creating) {
              resetShipperForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Shipper
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Shipper</DialogTitle>
              <DialogDescription>
                Add a shipper to the global Bonzer Shipper Master.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto pr-2">
              <ShipperForm
                creating={creating || checkingIdentifier}
                shipperForm={shipperForm}
                formErrors={formErrors}
                updateShipperForm={updateShipperForm}
                onSubmit={handleCreateShipper}
                onCancel={() => setCreateDialogOpen(false)}
                submitLabel="Create Shipper"
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open && !updating) {
              resetShipperForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Shipper</DialogTitle>
              <DialogDescription>
                Edit shipper details. Changes are saved immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto pr-2">
              <ShipperForm
                creating={updating || checkingIdentifier}
                shipperForm={shipperForm}
                formErrors={formErrors}
                updateShipperForm={updateShipperForm}
                onSubmit={handleUpdateShipper}
                onCancel={() => setEditDialogOpen(false)}
                submitLabel="Save Changes"
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={detailsDialogOpen}
          onOpenChange={(open) => {
            setDetailsDialogOpen(open);
            if (!open) {
              setDeleteConfirmOpen(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
            <DialogHeader>
              <DialogTitle>Shipper Details</DialogTitle>
              <DialogDescription>
                Read-only view. Use Edit if you want to make changes.
              </DialogDescription>
            </DialogHeader>

            {editingShipper && (
              <div className="max-h-[calc(90vh-11rem)] overflow-y-auto pr-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{editingShipper.company_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-mono text-sm">{editingShipper.shipper_ref}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="text-sm">{editingShipper.contact_person || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{editingShipper.email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{editingShipper.phone || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="text-sm">{editingShipper.city || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="text-sm">{editingShipper.state || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="text-sm">{editingShipper.country || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pincode</p>
                    <p className="text-sm">{editingShipper.pincode || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-sm">{editingShipper.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm whitespace-pre-wrap">{editingShipper.address || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
              <Button type="button" variant="outline" onClick={() => openEditDialog(editingShipper as Shipper)}>
                Edit
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
              >
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate shipper</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the shipper. Type the exact company name to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder={editingShipper?.company_name ?? 'Company name'}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleDeleteShipper();
                }}
                disabled={deletingShipperId === editingShipper?.id}
              >
                {deletingShipperId === editingShipper?.id ? 'Deactivating...' : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company, shipper ref, contact, GST, PAN..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={isSearching}
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 border-destructive/50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Failed to load shippers</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadShippers(debouncedSearch, 0)}>
            Retry
          </Button>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('company_name')}>
                  <div className="flex items-center gap-1">
                    Company Name
                    {sortBy === 'company_name' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('shipper_ref')}>
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'shipper_ref' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">
                    City
                    {sortBy === 'city' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('state')}>
                  <div className="flex items-center gap-1">
                    State
                    {sortBy === 'state' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : shippers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">
                        {debouncedSearch ? 'No matching shippers' : 'No shippers yet'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {debouncedSearch
                          ? 'Try a different company name, reference, contact, or GST number.'
                          : 'Add shippers to start managing your logistics relationships.'}
                      </p>
                      {!debouncedSearch && (
                        <Button className="mt-4 gap-1.5" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          Add Shipper
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shippers.map((shipper) => (
                  <TableRow
                    key={shipper.id}
                    className="cursor-default hover:bg-muted/40 transition-colors"
                    onClick={() => {}}
                    onDoubleClick={() => openDetailsDialog(shipper)}
                  >
                    <TableCell className="font-medium truncate max-w-xs">{shipper.company_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{shipper.shipper_ref}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs">{shipper.contact_person || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-xs">{shipper.email || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{shipper.phone || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{shipper.city || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{shipper.state || '—'}</TableCell>

                    <TableCell>
                      {!shipper.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(shipper);
                          }}
                          aria-label="View shipper"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(shipper);
                          }}
                          aria-label="Edit shipper"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(shipper);
                            setTimeout(() => window.print(), 100);
                          }}
                          aria-label="Print shipper"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(shipper);
                            setDeleteConfirmText('');
                            setDeleteConfirmOpen(true);
                          }}
                          aria-label="Deactivate shipper"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && shippers.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} · {totalCount} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface ShipperFormProps {
  creating: boolean;
  shipperForm: ShipperInput;
  formErrors: Partial<Record<keyof ShipperInput, string>>;
  updateShipperForm: (field: keyof ShipperInput, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

function ShipperForm({
  creating,
  shipperForm,
  formErrors,
  updateShipperForm,
  onSubmit,
  onCancel,
  submitLabel,
}: ShipperFormProps) {
  const [companySuggestions, setCompanySuggestions] = useState<ShipperSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [hasSelectedCompany, setHasSelectedCompany] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCompanies = useCallback(async (searchText: string) => {
    const trimmed = searchText.trim();
    if (trimmed.length < 2) {
      setCompanySuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setHasSelectedCompany(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingCompanies(true);
      const result = await searchShippers({ searchText: trimmed, limit: 10 });
      setIsSearchingCompanies(false);

      if (result.success) {
        setCompanySuggestions(result.shippers);
        setShowSuggestions(result.shippers.length > 0);
        setSelectedSuggestionIndex(-1);
      } else {
        setCompanySuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }, 300);
  }, []);

  const handleCompanyNameChange = (value: string) => {
    setHasSelectedCompany(false);
    updateShipperForm('company_name', value);
    searchCompanies(value);
  };

  const selectSuggestion = (shipper: ShipperSearchResult) => {
    updateShipperForm('company_name', shipper.company_name);
    updateShipperForm('contact_person', shipper.contact_person ?? '');
    updateShipperForm('city', shipper.city ?? '');
    updateShipperForm('country', shipper.country ?? '');
    setCompanySuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setHasSelectedCompany(true);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || companySuggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < companySuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : companySuggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(companySuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (
      !hasSelectedCompany &&
      companySuggestions.length > 0 &&
      shipperForm.company_name.trim().length >= 2
    ) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };

  return (
    <div className="grid gap-4 py-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2 relative">
        <Label htmlFor="company_name">Company Name *</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id="company_name"
            value={shipperForm.company_name}
            onChange={(event) => handleCompanyNameChange(event.target.value)}
            placeholder="Company name"
            disabled={creating}
            aria-invalid={!!formErrors.company_name}
            aria-autocomplete="list"
            aria-controls="shipper-suggestions"
            aria-expanded={showSuggestions && companySuggestions.length > 0}
            className={formErrors.company_name ? 'border-destructive' : ''}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {isSearchingCompanies && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {!isSearchingCompanies && (
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        {formErrors.company_name && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.company_name}
          </p>
        )}

        {showSuggestions && (
          <div
            ref={dropdownRef}
            id="shipper-suggestions"
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            role="listbox"
            aria-label="Shipper name suggestions"
          >
            {isSearchingCompanies ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : companySuggestions.length > 0 ? (
              companySuggestions.map((shipper, index) => (
                <div
                  key={shipper.id}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                  className={`cursor-pointer px-3 py-2 hover:bg-accent transition-colors ${
                    index === selectedSuggestionIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(shipper);
                  }}
                >
                  <div className="font-medium">{shipper.company_name}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                    {shipper.shipper_ref && <span className="font-mono">{shipper.shipper_ref}</span>}
                    {shipper.city && <span>{shipper.city}</span>}
                    {shipper.country && <span>{shipper.country}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-sm text-muted-foreground">
                No matching shippers found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_person">Contact Person</Label>
        <Input
          id="contact_person"
          value={shipperForm.contact_person ?? ''}
          onChange={(event) => updateShipperForm('contact_person', event.target.value)}
          placeholder="Contact person"
          disabled={creating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={shipperForm.phone ?? ''}
          onChange={(event) => updateShipperForm('phone', event.target.value)}
          placeholder="Phone number"
          disabled={creating}
          aria-invalid={!!formErrors.phone}
          className={formErrors.phone ? 'border-destructive' : ''}
        />
        {formErrors.phone && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.phone}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={shipperForm.email ?? ''}
          onChange={(event) => updateShipperForm('email', event.target.value)}
          placeholder="shipper@company.com"
          disabled={creating}
          aria-invalid={!!formErrors.email}
          className={formErrors.email ? 'border-destructive' : ''}
        />
        {formErrors.email && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gst_number">GST Number</Label>
        <Input
          id="gst_number"
          value={shipperForm.gst_number ?? ''}
          onChange={(event) => updateShipperForm('gst_number', event.target.value.toUpperCase())}
          placeholder="27ABCDE1234F1Z5"
          disabled={creating}
          aria-invalid={!!formErrors.gst_number}
          className={formErrors.gst_number ? 'border-destructive' : ''}
        />
        {formErrors.gst_number && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.gst_number}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pan_number">PAN Number</Label>
        <Input
          id="pan_number"
          value={shipperForm.pan_number ?? ''}
          onChange={(event) => updateShipperForm('pan_number', event.target.value.toUpperCase())}
          placeholder="ABCDE1234F"
          disabled={creating}
          aria-invalid={!!formErrors.pan_number}
          className={formErrors.pan_number ? 'border-destructive' : ''}
        />
        {formErrors.pan_number && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.pan_number}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          value={shipperForm.pincode ?? ''}
          onChange={(event) => updateShipperForm('pincode', event.target.value)}
          placeholder="400001"
          disabled={creating}
          aria-invalid={!!formErrors.pincode}
          className={formErrors.pincode ? 'border-destructive' : ''}
        />
        {formErrors.pincode && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formErrors.pincode}
          </p>
        )}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={shipperForm.address ?? ''}
          onChange={(event) => updateShipperForm('address', event.target.value)}
          placeholder="Business address"
          disabled={creating}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={shipperForm.city ?? ''}
          onChange={(event) => updateShipperForm('city', event.target.value)}
          placeholder="Mumbai"
          disabled={creating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input
          id="state"
          value={shipperForm.state ?? ''}
          onChange={(event) => updateShipperForm('state', event.target.value)}
          placeholder="Maharashtra"
          disabled={creating}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={shipperForm.country ?? ''}
          onChange={(event) => updateShipperForm('country', event.target.value)}
          placeholder="India"
          disabled={creating}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={creating}
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={creating}
          onClick={onSubmit}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
