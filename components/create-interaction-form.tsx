'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Loader2,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  User,
  X,
  Briefcase,
  Send,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { createCustomer } from '@/lib/actions/customers/create-customer';
import { checkCustomerIdentifierConflict } from '@/lib/actions/customers/check-customer-identifiers';
import { createInteraction } from '@/lib/actions/customer-interactions/mutations/create-interaction';
import { createFollowup } from '@/lib/actions/customer-interactions/mutations/create-followup';
import { createAttachment } from '@/lib/actions/customer-interactions/mutations/create-attachment';
import { createLocation } from '@/lib/actions/customer-interactions/mutations/create-location';
import { searchCompanyNames, type CompanyNameResult } from '@/lib/actions/customers/search-company-names';
import { uploadAttachment } from '@/lib/storage';
import { getCurrentPosition } from '@/lib/location';
import { ImageUploadField } from '@/components/ui/data-display';
import type { InteractionOutcome, InteractionType } from '@/lib/actions/customer-interactions/types';
import type { CustomerInput } from '@/lib/actions/customers/types';

interface EmployeeOption {
  id: string;
  fullName: string;
  employeeCode: string | null;
}

interface CreateInteractionFormProps {
  interactionTypes: InteractionType[];
  interactionOutcomes: InteractionOutcome[];
  employees: EmployeeOption[];
}

const createInteractionSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  interactionTypeId: z.string().min(1, 'Interaction type is required'),
  interactionOutcomeId: z.string().min(1, 'Outcome is required'),
  subject: z.string().max(255).optional(),
  notes: z.string().min(1, 'Notes are required'),
  interactionAt: z.string().min(1, 'Date and time is required'),
 
  contactPersonName: z.string().min(1, 'Contact person name is required').max(255),
  contactPersonMobile: z.string().min(1, 'Contact person mobile is required').max(50),
  contactPersonEmail: z.string().email('Invalid email format').max(255).nullable().optional(),
  contactPersonDesignation: z.string().max(255).nullable().optional(),
  interactionDurationMinutes: z.number().int().min(0).nullable().optional(),
  followupDate: z.string().optional(),
  followupTime: z.string().optional(),
});

type CreateInteractionFormData = z.infer<typeof createInteractionSchema>;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

export function CreateInteractionForm({
  interactionTypes,
  interactionOutcomes,
  employees: initialEmployees,
}: CreateInteractionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [employees] = useState<EmployeeOption[]>(initialEmployees);
  const [companySuggestions, setCompanySuggestions] = useState<CompanyNameResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [hasSelectedCompany, setHasSelectedCompany] = useState(false);
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
  });
const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    capturedAt: string;
  } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

const form = useForm<CreateInteractionFormData>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      employeeId: '',
      interactionTypeId: '',
      interactionOutcomeId: '',
      subject: '',
      notes: '',
      interactionAt: new Date().toISOString().slice(0, 16),
      followupDate: '',
      followupTime: '',
    },
  });

  function updateCustomerForm(field: keyof CustomerInput, value: string | boolean) {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCustomerErrors((current) => ({ ...current, [field]: undefined }));
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCompanies = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setCompanySuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setHasSelectedCompany(false);
      setCurrentCustomerId(null);
      return;
    }

    setIsSearchingCompanies(true);
    const result = await searchCompanyNames(trimmed, 10);
    setIsSearchingCompanies(false);

    if (result.success) {
      setCompanySuggestions(result.companies);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);

      const normalized = trimmed.replace(/\\s+/g, ' ').toUpperCase();
      const exactMatch = result.companies.find(
        (company) =>
          company.company_name.trim().replace(/\\s+/g, ' ').toUpperCase() === normalized
      );

      if (exactMatch) {
        selectSuggestion(exactMatch);
      }
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (company: CompanyNameResult) => {
    setCurrentCustomerId(company.id);
    setHasSelectedCompany(true);
    setCompanySuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setCustomerForm({
      company_name: company.company_name,
      contact_person: company.contact_person ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      address: customerForm.address,
      city: company.city ?? '',
      state: company.state ?? '',
      country: customerForm.country || 'India',
      pincode: customerForm.pincode,
      gst_number: company.gst_number ?? '',
      pan_number: company.pan_number ?? '',
    });
  };

  const validateIdentifierConflict = async () => {
    const gstValue = customerForm.gst_number?.trim();
    const panValue = customerForm.pan_number?.trim();
    if (gstValue) {
      const gstResult = await checkCustomerIdentifierConflict('gst_number', gstValue, currentCustomerId ?? undefined);
      if (gstResult.success && gstResult.conflict) {
        setSubmitError(`This GST no. is invalid because it already belongs to ${gstResult.conflict.company_name} (${gstResult.conflict.customer_ref})`);
        return false;
      }
      if (!gstResult.success) {
        setSubmitError(gstResult.error);
        return false;
      }
    }
    if (panValue) {
      const panResult = await checkCustomerIdentifierConflict('pan_number', panValue, currentCustomerId ?? undefined);
      if (panResult.success && panResult.conflict) {
        setSubmitError(`This PAN no. is invalid because it already belongs to ${panResult.conflict.company_name} (${panResult.conflict.customer_ref})`);
        return false;
      }
      if (!panResult.success) {
        setSubmitError(panResult.error);
        return false;
      }
    }
    return true;
  };

  function validateCustomerForm(): boolean {
    const errors: Partial<Record<keyof CustomerInput, string>> = {};

    if (!customerForm.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }

    if (customerForm.email && !EMAIL_REGEX.test(customerForm.email)) {
      errors.email = 'Invalid email format';
    }

    if (customerForm.phone) {
      const digits = customerForm.phone.replace(/\D/g, '');
      if (!PHONE_REGEX.test(customerForm.phone) || digits.length < 10 || digits.length > 15) {
        errors.phone = 'Invalid phone number. Expected 10-15 digits';
      }
    }

    if (customerForm.pan_number && !PAN_REGEX.test(customerForm.pan_number.toUpperCase())) {
      errors.pan_number = 'Invalid PAN format. Expected: AAAAA9999A';
    }

    if (customerForm.gst_number && !GSTIN_REGEX.test(customerForm.gst_number.toUpperCase())) {
      errors.gst_number = 'Invalid GSTIN format. Expected 15-character GSTIN';
    }

    if (customerForm.pan_number && customerForm.gst_number) {
      const panUpper = customerForm.pan_number.toUpperCase();
      const gstUpper = customerForm.gst_number.toUpperCase();
      if (gstUpper.substring(2, 12) !== panUpper) {
        errors.pan_number = 'PAN in GSTIN (positions 3-12) does not match provided PAN';
        errors.gst_number = 'PAN in GSTIN (positions 3-12) does not match provided PAN';
      }
    }

    if (customerForm.pincode && !PINCODE_REGEX.test(customerForm.pincode)) {
      errors.pincode = 'Invalid pincode. Expected 6 digits';
    }

    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handlePhotoSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSubmitError('Only image files are allowed');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => setPhotoPreview(null);
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleCaptureLocation = async () => {
    setCapturingLocation(true);
    setLocationError(null);
    try {
      const result = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      if (!result.success) {
        setLocationError(result.error.message);
        return;
      }
      const { coords } = result.position;
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        capturedAt: new Date(result.position.timestamp).toISOString(),
      });
      setLocationAddress(null);
    } catch {
      setLocationError('Failed to capture location. Please try again.');
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleCompanyNameChange = (value: string) => {
    setCurrentCustomerId(null);
    setHasSelectedCompany(false);
    updateCustomerForm('company_name', value);
    void searchCompanies(value);
  };

  const handleSubmit = async (data: CreateInteractionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!validateCustomerForm()) {
        return;
      }

      if (!(await validateIdentifierConflict())) {
        return;
      }

let customerId = currentCustomerId;

      if (!customerId) {
        const customerResult = await createCustomer(customerForm);
        if (!customerResult.success) {
          setSubmitError(customerResult.error);
          return;
        }
        customerId = customerResult.customer.id;
        setCurrentCustomerId(customerId);
      }

      const result = await createInteraction({
        customerId,
        employeeId: data.employeeId,
        interactionTypeId: data.interactionTypeId,
        interactionOutcomeId: data.interactionOutcomeId,
        subject: data.subject || null,
        notes: data.notes,
        interactionAt: data.interactionAt,
        contactPersonName: data.contactPersonName,
        contactPersonMobile: data.contactPersonMobile,
        contactPersonEmail: data.contactPersonEmail || null,
        contactPersonDesignation: data.contactPersonDesignation || null,
        interactionDurationMinutes: data.interactionDurationMinutes ?? null,
      });

      if (result.success) {
        const interactionId = result.interaction.id;
        const interactionRef = result.interaction.interactionRef;

        // Create follow-up if date/time provided
        if (data.followupDate && data.followupTime) {
          const followupDateTime = `${data.followupDate}T${data.followupTime}`;
          const followupResult = await createFollowup({
            interactionId,
            dueAt: followupDateTime,
            status: 'Pending',
          });
          if (!followupResult.success) {
            console.error('[createInteractionForm] Follow-up creation failed:', followupResult.error);
          }
        }

        // Upload photo (if selected) and persist attachment metadata.
        if (photoFile) {
          const uploadResult = await uploadAttachment({
            interactionId,
            file: photoFile,
            uploadedBy: result.interaction.createdBy,
          });

          if (uploadResult.data && !uploadResult.error) {
            await createAttachment({
              interactionId,
              storagePath: uploadResult.data.path,
              originalName: uploadResult.data.originalName,
              mimeType: uploadResult.data.mimeType,
              fileSize: uploadResult.data.fileSize,
            });
          } else {
            console.error('[createInteractionForm] Photo upload failed:', uploadResult.error?.message);
          }
        }

        let locationData = location;
        if (!locationData) {
          try {
            const captured = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            if (captured.success) {
              const { coords } = captured.position;
              locationData = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
                capturedAt: new Date(captured.position.timestamp).toISOString(),
              };
            }
          } catch {
            // Location is optional for the backend flow.
          }
        }

        if (locationData) {
          const locationResult = await createLocation({
            interactionId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            capturedAt: locationData.capturedAt,
          });
          if (locationResult.success) {
            setLocationAddress(locationResult.location.formattedAddress);
          }
        }

router.push(`/customer-interactions/${interactionRef}`);
        router.refresh();
        return;
      }

      setSubmitError(result.error);
    } catch {
      setSubmitError('Failed to create interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-none animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Interaction</h1>
          <p className="mt-1 text-muted-foreground">Record a new customer interaction</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
              <CardDescription>
                Enter the customer directly here. A new customer master record will be created before the interaction is saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <div className="relative">
                  <Input
                    id="company_name"
                    value={customerForm.company_name}
                    onChange={(event) => handleCompanyNameChange(event.target.value)}
                    placeholder="Company name"
                    disabled={isSubmitting}
                    className={customerErrors.company_name ? 'border-destructive' : ''}
                    onFocus={() => {
                      if (companySuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                  />
                  {showSuggestions && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg"
                    >
                      {isSearchingCompanies ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                          <span className="ml-2">Searching...</span>
                        </div>
                      ) : companySuggestions.length > 0 ? (
                        companySuggestions.map((company, index) => (
                          <button
                            key={company.id}
                            type="button"
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                              index === selectedSuggestionIndex ? 'bg-accent' : ''
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectSuggestion(company);
                            }}
                          >
                            <div className="font-medium">{company.company_name}</div>
<div className="text-xs text-muted-foreground">
                              {[company.customer_ref, company.city, company.state].filter(Boolean).join(' • ')}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="py-3 text-center text-sm text-muted-foreground">
                          No matching customers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {customerErrors.company_name && <p className="text-sm text-destructive">{customerErrors.company_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input id="contact_person" value={customerForm.contact_person ?? ''} onChange={(event) => updateCustomerForm('contact_person', event.target.value)} placeholder="Contact person" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={customerForm.phone ?? ''} onChange={(event) => updateCustomerForm('phone', event.target.value)} placeholder="Phone number" disabled={isSubmitting} className={customerErrors.phone ? 'border-destructive' : ''} />
                {customerErrors.phone && <p className="text-sm text-destructive">{customerErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={customerForm.email ?? ''} onChange={(event) => updateCustomerForm('email', event.target.value)} placeholder="customer@company.com" disabled={isSubmitting} className={customerErrors.email ? 'border-destructive' : ''} />
                {customerErrors.email && <p className="text-sm text-destructive">{customerErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input id="gst_number" value={customerForm.gst_number ?? ''} onChange={(event) => updateCustomerForm('gst_number', event.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" disabled={isSubmitting} className={customerErrors.gst_number ? 'border-destructive' : ''} />
                {customerErrors.gst_number && <p className="text-sm text-destructive">{customerErrors.gst_number}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input id="pan_number" value={customerForm.pan_number ?? ''} onChange={(event) => updateCustomerForm('pan_number', event.target.value.toUpperCase())} placeholder="ABCDE1234F" disabled={isSubmitting} className={customerErrors.pan_number ? 'border-destructive' : ''} />
                {customerErrors.pan_number && <p className="text-sm text-destructive">{customerErrors.pan_number}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" value={customerForm.pincode ?? ''} onChange={(event) => updateCustomerForm('pincode', event.target.value)} placeholder="400001" disabled={isSubmitting} className={customerErrors.pincode ? 'border-destructive' : ''} />
                {customerErrors.pincode && <p className="text-sm text-destructive">{customerErrors.pincode}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={customerForm.address ?? ''} onChange={(event) => updateCustomerForm('address', event.target.value)} placeholder="Business address" disabled={isSubmitting} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={customerForm.city ?? ''} onChange={(event) => updateCustomerForm('city', event.target.value)} placeholder="Mumbai" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={customerForm.state ?? ''} onChange={(event) => updateCustomerForm('state', event.target.value)} placeholder="Maharashtra" disabled={isSubmitting} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={customerForm.country ?? ''} onChange={(event) => updateCustomerForm('country', event.target.value)} placeholder="India" disabled={isSubmitting} />
              </div>
            </CardContent>
</Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Photo
              </CardTitle>
              <CardDescription>
                Optionally attach a photo. Location is captured automatically on submit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Photo</Label>
                <ImageUploadField
                  id="interaction-photo"
                  previewUrl={photoPreview}
                  onFileSelected={handlePhotoSelected}
                  onClear={handleClearPhoto}
                  disabled={isSubmitting}
                  accept="image/*"
                  description="JPEG, PNG, WebP or GIF. Max 10MB."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(fieldState.invalid && 'border-destructive')}>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.fullName} {emp.employeeCode && `(${emp.employeeCode})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interactionTypeId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(fieldState.invalid && 'border-destructive')}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {interactionTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interactionOutcomeId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(fieldState.invalid && 'border-destructive')}>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {interactionOutcomes.map((outcome) => (
                            <SelectItem key={outcome.id} value={outcome.id}>
                              {outcome.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interactionAt"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Date & Time
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className={cn(fieldState.invalid && 'border-destructive')}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactPersonName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        Contact Person Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact person name"
                          maxLength={255}
                          className={cn(fieldState.invalid && 'border-destructive')}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPersonMobile"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        Contact Person Mobile <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact mobile number"
                          type="tel"
                          maxLength={50}
                          className={cn(fieldState.invalid && 'border-destructive')}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPersonEmail"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        Contact Person Email (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="contact@company.com"
                          type="email"
                          maxLength={255}
                          className={cn(fieldState.invalid && 'border-destructive')}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPersonDesignation"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        Contact Person Designation (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Procurement Manager"
                          maxLength={255}
                          className={cn(fieldState.invalid && 'border-destructive')}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
</div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="followupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        Follow-up Date (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className={cn(field.fieldState?.invalid && 'border-destructive')}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followupTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Follow-up Time (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          className={cn(field.fieldState?.invalid && 'border-destructive')}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interactionDurationMinutes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <span className="inline-flex h-4 w-4 items-center justify-center text-sm">⏱</span>
                        Duration (minutes, optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="30"
                          className={cn(fieldState.invalid && 'border-destructive')}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          onBlur={field.onBlur}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      Subject
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Short summary of the interaction"
                        maxLength={255}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Interaction notes"
                        rows={5}
                        className={cn(fieldState.invalid && 'border-destructive')}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {submitError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Interaction'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}


