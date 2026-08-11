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
} from 'lucide-react';

import { toast } from 'sonner';

import { createCustomer } from '@/lib/actions/customers/create-customer';
import { checkCustomerIdentifierConflict } from '@/lib/actions/customers/check-customer-identifiers';
import { deleteCustomer } from '@/lib/actions/customers/delete-customer';
import { updateCustomer } from '@/lib/actions/customers/update-customer';
import { searchCompanyNames, type CompanyNameResult } from '@/lib/actions/customers/search-company-names';
import type {
  Customer,
  CustomerInput,
  CreateCustomerPartyResult,
  UpdateCustomerInput,
} from '@/lib/actions/customers/types';

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

import { listCustomers } from '@/lib/actions/customers/list-customers';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;



function validatePanFormat(pan: string | undefined): string | null {
  if (!pan) return null;
  const upper = pan.toUpperCase();
  if (!PAN_REGEX.test(upper)) {
    return 'Invalid PAN format. Expected: AAAAA9999A';
  }
  return null;
}

function validateGstinFormat(gstin: string | undefined): string | null {
  if (!gstin) return null;
  const upper = gstin.toUpperCase();
  if (!GSTIN_REGEX.test(upper)) {
    return 'Invalid GSTIN format. Expected 15-character GSTIN';
  }
  return null;
}

function validatePanGstMatch(pan: string | undefined, gstin: string | undefined): string | null {
  if (!pan || !gstin) return null;
  const panUpper = pan.toUpperCase();
  const gstinUpper = gstin.toUpperCase();
  const panInGstin = gstinUpper.substring(2, 12);
  if (panInGstin !== panUpper) {
    return 'PAN in GSTIN (positions 3-12) does not match provided PAN';
  }
  return null;
}

function validateEmailFormat(email: string | undefined): string | null {
  if (!email) return null;
  if (!EMAIL_REGEX.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

function validatePhoneFormat(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Invalid phone number. Expected 10-15 digits';
  }
  return null;
}

function validatePincodeFormat(pincode: string | undefined): string | null {
  if (!pincode) return null;
  if (!PINCODE_REGEX.test(pincode)) {
    return 'Invalid pincode. Expected 6 digits';
  }
  return null;
}

export function CustomerWorkspace() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'company_name' | 'customer_ref' | 'city' | 'state' | 'kyc_status' | 'created_at'>('company_name');
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

  const loadCustomers = useCallback(async (searchTerm: string = '', pageNum: number = 0) => {
    setLoading(true);
    setError('');

    const result = await listCustomers({
      search: searchTerm,
      page: pageNum,
      pageSize,
      sortBy,
      sortOrder: sortDir,
    });

    if (!result.success) {
      setCustomers([]);
      setError(result.error);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setCustomers(result.customers);
    setTotalCount(result.totalCount);
    setLoading(false);
  }, [pageSize, sortBy, sortDir]);

  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('customerId');

  useEffect(() => {
    void loadCustomers('', 0);
  }, [loadCustomers]);

  useEffect(() => {
    if (customerIdParam && !editDialogOpen) {
      const customer = customers.find(c => c.id === customerIdParam);
      if (customer) {
        openEditDialog(customer);
      }
    }
  }, [customerIdParam, customers, editDialogOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
      void loadCustomers(search, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadCustomers]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
    void loadCustomers(debouncedSearch, 0);
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [customerForm, setCustomerForm] = useState<CustomerInput>({
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
    addAsShipper: false,
    addAsConsignee: false,
  });

  const [addAsShipper, setAddAsShipper] = useState(false);
  const [addAsConsignee, setAddAsConsignee] = useState(false);
  const [checkingIdentifier, setCheckingIdentifier] = useState(false);

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});

  function updateCustomerForm(field: keyof CustomerInput, value: string | boolean) {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof CustomerInput, string>> = {};

    if (!customerForm.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }

    const emailError = validateEmailFormat(customerForm.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhoneFormat(customerForm.phone);
    if (phoneError) errors.phone = phoneError;

    const panError = validatePanFormat(customerForm.pan_number);
    if (panError) errors.pan_number = panError;

    const gstinError = validateGstinFormat(customerForm.gst_number);
    if (gstinError) errors.gst_number = gstinError;

    const panGstError = validatePanGstMatch(customerForm.pan_number, customerForm.gst_number);
    if (panGstError) {
      errors.pan_number = panGstError;
      errors.gst_number = panGstError;
    }

    const pincodeError = validatePincodeFormat(customerForm.pincode);
    if (pincodeError) errors.pincode = pincodeError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetCustomerForm() {
    setCustomerForm({
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
      addAsShipper: false,
      addAsConsignee: false,
    });
    setAddAsShipper(false);
    setAddAsConsignee(false);
    setFormErrors({});
    setEditingCustomer(null);
    setCheckingIdentifier(false);
  }

  async function validateIdentifierConflict(): Promise<boolean> {
    const gstValue = customerForm.gst_number?.trim();
    const panValue = customerForm.pan_number?.trim();
    const currentCustomerId = editingCustomer?.id;

    if (!gstValue && !panValue) return true;

    setCheckingIdentifier(true);

    try {
      if (gstValue) {
        const gstResult = await checkCustomerIdentifierConflict(
          'gst_number',
          gstValue,
          currentCustomerId
        );
        if (!gstResult.success) {
          toast.error(gstResult.error, { position: 'top-center' });
          return false;
        }
        if (gstResult.conflict) {
          toast.error(
            `This GST no. is invalid because it already belongs to ${gstResult.conflict.company_name} (${gstResult.conflict.customer_ref})`,
            { position: 'top-center' }
          );
          return false;
        }
      }

      if (panValue) {
        const panResult = await checkCustomerIdentifierConflict(
          'pan_number',
          panValue,
          currentCustomerId
        );
        if (!panResult.success) {
          toast.error(panResult.error, { position: 'top-center' });
          return false;
        }
        if (panResult.conflict) {
          toast.error(
            `This PAN no. is invalid because it already belongs to ${panResult.conflict.company_name} (${panResult.conflict.customer_ref})`,
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

  function openEditDialog(customer: Customer) {
    setCreateDialogOpen(false);
    setDetailsDialogOpen(false);
    setEditingCustomer(customer);
    setCustomerForm({
      company_name: customer.company_name,
      contact_person: customer.contact_person ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      country: customer.country ?? 'India',
      pincode: customer.pincode ?? '',
      gst_number: customer.gst_number ?? '',
      pan_number: customer.pan_number ?? '',
      addAsShipper: false,
      addAsConsignee: false,
    });
    setAddAsShipper(false);
    setAddAsConsignee(false);
    setFormErrors({});
    setEditDialogOpen(true);
  }

  function openDetailsDialog(customer: Customer) {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setEditingCustomer(customer);
    setDetailsDialogOpen(true);
  }

  async function handleCreateCustomer() {
    if (!validateForm()) return;
    if (!(await validateIdentifierConflict())) return;

    setCreating(true);

    try {
      const result = await createCustomer({
        ...customerForm,
        addAsShipper,
        addAsConsignee,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Customer ${result.customer.customer_ref} created successfully`);

      if (result.partyResult.shipper_ref) {
        toast.success(`Shipper ${result.partyResult.shipper_ref} created`);
      }
      if (result.partyResult.consignee_ref) {
        toast.success(`Consignee ${result.partyResult.consignee_ref} created`);
      }

      for (const warning of result.warnings) {
        toast.warning(warning.message);
      }

      resetCustomerForm();
      setCreateDialogOpen(false);
      await loadCustomers(debouncedSearch, 0);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateCustomer() {
    if (!editingCustomer || !validateForm()) return;
    if (!(await validateIdentifierConflict())) return;

    setUpdating(true);

    try {
      const input: UpdateCustomerInput = {
        customer_id: editingCustomer.id,
        ...customerForm,
      };

      const result = await updateCustomer(input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Customer ${result.customer.customer_ref} updated successfully`);

      for (const warning of result.warnings) {
        toast.warning(warning.message);
      }

      resetCustomerForm();
      setEditDialogOpen(false);
      await loadCustomers(debouncedSearch, page);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteCustomer() {
    if (!editingCustomer) return;
    if (deleteConfirmText.trim() !== editingCustomer.company_name.trim()) {
      toast.error('Type the exact company name to confirm delete');
      return;
    }

    setDeletingCustomerId(editingCustomer.id);
    try {
      const result = await deleteCustomer(editingCustomer.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Customer deleted successfully');
      setDeleteConfirmOpen(false);
      setDetailsDialogOpen(false);
      resetCustomerForm();
      await loadCustomers(debouncedSearch, page);
    } finally {
      setDeletingCustomerId(null);
    }
  }

  const isDialogOpen = createDialogOpen || editDialogOpen;
  const isSubmitting = creating || updating;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        description={`${totalCount} customers${debouncedSearch ? ` (filtered)` : ''}`}
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
              resetCustomerForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Add a company to the global Bonzer Customer Master.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto pr-2">
              <CustomerForm
                creating={creating || checkingIdentifier}
                customerForm={customerForm}
                formErrors={formErrors}
                updateCustomerForm={updateCustomerForm}
                addAsShipper={addAsShipper}
                setAddAsShipper={setAddAsShipper}
                addAsConsignee={addAsConsignee}
                setAddAsConsignee={setAddAsConsignee}
                onSubmit={handleCreateCustomer}
                onCancel={() => setCreateDialogOpen(false)}
                submitLabel="Create Customer"
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open && !updating) {
              resetCustomerForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl w-full overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Edit customer details. Changes are saved immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto pr-2">
              <CustomerForm
                creating={updating || checkingIdentifier}
                customerForm={customerForm}
                formErrors={formErrors}
                updateCustomerForm={updateCustomerForm}
                addAsShipper={addAsShipper}
                setAddAsShipper={setAddAsShipper}
                addAsConsignee={addAsConsignee}
                setAddAsConsignee={setAddAsConsignee}
                onSubmit={handleUpdateCustomer}
                onCancel={() => setEditDialogOpen(false)}
                submitLabel="Save Changes"
                showPartyOptions={true}
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
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>
                Read-only view. Use Edit if you want to make changes.
              </DialogDescription>
            </DialogHeader>

            {editingCustomer && (
              <div className="max-h-[calc(90vh-11rem)] overflow-y-auto pr-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{editingCustomer.company_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-mono text-sm">{editingCustomer.customer_ref}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="text-sm">{editingCustomer.contact_person || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{editingCustomer.email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{editingCustomer.phone || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="text-sm">{editingCustomer.city || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="text-sm">{editingCustomer.state || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="text-sm">{editingCustomer.country || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pincode</p>
                    <p className="text-sm">{editingCustomer.pincode || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">KYC Status</p>
                    <StatusBadge status={editingCustomer.kyc_status} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-sm">{editingCustomer.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm whitespace-pre-wrap">{editingCustomer.address || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
              <Button type="button" variant="outline" onClick={() => openEditDialog(editingCustomer as Customer)}>
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
              <AlertDialogTitle>Delete customer</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the customer. Type the exact company name to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder={editingCustomer?.company_name ?? 'Company name'}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleDeleteCustomer();
                }}
                disabled={deletingCustomerId === editingCustomer?.id}
              >
                {deletingCustomerId === editingCustomer?.id ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company, customer ref, contact, GST, PAN..."
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
            <p className="text-sm font-medium text-destructive">Failed to load customers</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadCustomers(debouncedSearch, 0)}>
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('customer_ref')}>
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'customer_ref' && (
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('kyc_status')}>
                  <div className="flex items-center gap-1">
                    KYC
                    {sortBy === 'kyc_status' && (
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
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">
                        {debouncedSearch ? 'No matching customers' : 'No customers yet'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {debouncedSearch
                          ? 'Try a different company name, reference, contact, or GST number.'
                          : 'Add customers to start managing your logistics relationships.'}
                      </p>
                      {!debouncedSearch && (
                        <Button className="mt-4 gap-1.5" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          Add Customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-default hover:bg-muted/40 transition-colors"
                    onClick={() => {}}
                    onDoubleClick={() => openDetailsDialog(customer)}
                  >
                    <TableCell className="font-medium truncate max-w-xs">{customer.company_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{customer.customer_ref}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs">{customer.contact_person || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-xs">{customer.email || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.phone || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.city || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.state || '—'}</TableCell>

                    <TableCell><StatusBadge status={customer.kyc_status} /></TableCell>
                    <TableCell>
                      {!customer.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="View customer"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(customer);
                          }}
                          aria-label="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(customer);
                            setTimeout(() => window.print(), 100);
                          }}
                          aria-label="Print customer"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDialog(customer);
                            setDeleteConfirmText('');
                            setDeleteConfirmOpen(true);
                          }}
                          aria-label="Delete customer"
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

        {!loading && customers.length > 0 && totalPages > 1 && (
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

interface CustomerFormProps {
  creating: boolean;
  customerForm: CustomerInput;
  formErrors: Partial<Record<keyof CustomerInput, string>>;
  updateCustomerForm: (field: keyof CustomerInput, value: string | boolean) => void;
  addAsShipper: boolean;
  setAddAsShipper: (value: boolean) => void;
  addAsConsignee: boolean;
  setAddAsConsignee: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  showPartyOptions?: boolean;
}

function CustomerForm({
  creating,
  customerForm,
  formErrors,
  updateCustomerForm,
  addAsShipper,
  setAddAsShipper,
  addAsConsignee,
  setAddAsConsignee,
  onSubmit,
  onCancel,
  submitLabel,
  showPartyOptions = true,
}: CustomerFormProps) {
  const [companySuggestions, setCompanySuggestions] = useState<CompanyNameResult[]>([]);
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
      const result = await searchCompanyNames(trimmed, 10);
      setIsSearchingCompanies(false);

      if (result.success) {
        setCompanySuggestions(result.companies);
        setShowSuggestions(result.companies.length > 0);
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
    updateCustomerForm('company_name', value);
    searchCompanies(value);
  };

  const selectSuggestion = (company: CompanyNameResult) => {
    updateCustomerForm('company_name', company.company_name);
    updateCustomerForm('contact_person', company.contact_person ?? '');
    updateCustomerForm('email', company.email ?? '');
    updateCustomerForm('phone', company.phone ?? '');
    updateCustomerForm('city', company.city ?? '');
    updateCustomerForm('state', company.state ?? '');
    updateCustomerForm('gst_number', company.gst_number ?? '');
    updateCustomerForm('pan_number', company.pan_number ?? '');
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
      customerForm.company_name.trim().length >= 2
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
            value={customerForm.company_name}
            onChange={(event) => handleCompanyNameChange(event.target.value)}
            placeholder="Company name"
            disabled={creating}
            aria-invalid={!!formErrors.company_name}
            aria-autocomplete="list"
            aria-controls="company-suggestions"
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
            id="company-suggestions"
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            role="listbox"
            aria-label="Company name suggestions"
          >
            {isSearchingCompanies ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : companySuggestions.length > 0 ? (
              companySuggestions.map((company, index) => (
                <div
                  key={company.id}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                  className={`cursor-pointer px-3 py-2 hover:bg-accent transition-colors ${
                    index === selectedSuggestionIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(company);
                  }}
                >
                  <div className="font-medium">{company.company_name}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                    {company.customer_ref && <span className="font-mono">{company.customer_ref}</span>}
                    {company.city && <span>{company.city}</span>}
                    {company.state && <span>{company.state}</span>}
                    {company.gst_number && <span className="font-mono">GST: {company.gst_number}</span>}
                    {company.pan_number && <span className="font-mono">PAN: {company.pan_number}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-sm text-muted-foreground">
                No matching customers found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_person">Contact Person</Label>
        <Input
          id="contact_person"
          value={customerForm.contact_person ?? ''}
          onChange={(event) => updateCustomerForm('contact_person', event.target.value)}
          placeholder="Contact person"
          disabled={creating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={customerForm.phone ?? ''}
          onChange={(event) => updateCustomerForm('phone', event.target.value)}
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
          value={customerForm.email ?? ''}
          onChange={(event) => updateCustomerForm('email', event.target.value)}
          placeholder="customer@company.com"
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
          value={customerForm.gst_number ?? ''}
          onChange={(event) => updateCustomerForm('gst_number', event.target.value.toUpperCase())}
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
          value={customerForm.pan_number ?? ''}
          onChange={(event) => updateCustomerForm('pan_number', event.target.value.toUpperCase())}
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
          value={customerForm.pincode ?? ''}
          onChange={(event) => updateCustomerForm('pincode', event.target.value)}
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
          value={customerForm.address ?? ''}
          onChange={(event) => updateCustomerForm('address', event.target.value)}
          placeholder="Business address"
          disabled={creating}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={customerForm.city ?? ''}
          onChange={(event) => updateCustomerForm('city', event.target.value)}
          placeholder="Mumbai"
          disabled={creating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input
          id="state"
          value={customerForm.state ?? ''}
          onChange={(event) => updateCustomerForm('state', event.target.value)}
          placeholder="Maharashtra"
          disabled={creating}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={customerForm.country ?? ''}
          onChange={(event) => updateCustomerForm('country', event.target.value)}
          placeholder="India"
          disabled={creating}
        />
      </div>

      {showPartyOptions && (
        <div className="space-y-2 sm:col-span-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="addAsShipper"
              checked={addAsShipper}
              onCheckedChange={(checked) => {
                const value = checked === true;
                setAddAsShipper(value);
                updateCustomerForm('addAsShipper', value);
              }}
              disabled={creating}
            />
            <Label htmlFor="addAsShipper" className="font-normal cursor-pointer">
              Add as Shipper
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="addAsConsignee"
              checked={addAsConsignee}
              onCheckedChange={(checked) => {
                const value = checked === true;
                setAddAsConsignee(value);
                updateCustomerForm('addAsConsignee', value);
              }}
              disabled={creating}
            />
            <Label htmlFor="addAsConsignee" className="font-normal cursor-pointer">
              Add as Consignee
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Creates a linked Shipper/Consignee master record copied from this customer&apos;s details.
          </p>
        </div>
      )}

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

