'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Loader2,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  User,
  X,
  Briefcase,
  Send,
  MapPin,
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
import { createInteraction } from '@/lib/actions/customer-interactions/mutations/create-interaction';
import { createAttachment } from '@/lib/actions/customer-interactions/mutations/create-attachment';
import { createLocation } from '@/lib/actions/customer-interactions/mutations/create-location';
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
  interactionChannel: z.enum(['CALL', 'VISIT', 'WHATSAPP', 'EMAIL', 'MEETING', 'VIDEO_CALL']),
  interactionDurationMinutes: z.number().int().min(0).nullable().optional(),
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

  const form = useForm<CreateInteractionFormData>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      employeeId: '',
      interactionTypeId: '',
      interactionOutcomeId: '',
      subject: '',
      notes: '',
      interactionAt: new Date().toISOString().slice(0, 16),
      interactionChannel: 'CALL',
    },
  });

  function updateCustomerForm(field: keyof CustomerInput, value: string | boolean) {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCustomerErrors((current) => ({ ...current, [field]: undefined }));
  }

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

  const handleSubmit = async (data: CreateInteractionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!validateCustomerForm()) {
        return;
      }

      const customerResult = await createCustomer(customerForm);
      if (!customerResult.success) {
        setSubmitError(customerResult.error);
        return;
      }

      const result = await createInteraction({
        customerId: customerResult.customer.id,
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
        interactionChannel: data.interactionChannel,
        interactionDurationMinutes: data.interactionDurationMinutes ?? null,
      });

if (result.success) {
        const interactionId = result.interaction.id;

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

        // Persist captured location (if any).
        if (location) {
          const locationResult = await createLocation({
            interactionId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            capturedAt: location.capturedAt,
          });
          if (locationResult.success) {
            setLocationAddress(locationResult.location.formattedAddress);
          }
        }

        router.push(`/customer-interactions/${interactionId}`);
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
                <Input
                  id="company_name"
                  value={customerForm.company_name}
                  onChange={(event) => updateCustomerForm('company_name', event.target.value)}
                  placeholder="Company name"
                  disabled={isSubmitting}
                  className={customerErrors.company_name ? 'border-destructive' : ''}
                />
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
                Photo & Location
              </CardTitle>
              <CardDescription>
                Optionally attach a photo and capture the GPS location of this interaction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
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

                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                  {location ? (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                      {location.accuracy !== null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Accuracy ±{Math.round(location.accuracy)}m
                        </p>
                      )}
                      {locationAddress && (
                        <p className="mt-2 text-xs text-muted-foreground">{locationAddress}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No location captured yet.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleCaptureLocation}
                    disabled={isSubmitting || capturingLocation}
                  >
                    {capturingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Capturing...
                      </>
                    ) : location ? (
                      <>
                        <MapPin className="h-4 w-4" />
                        Recapture Location
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        Capture Location
                      </>
                    )}
                  </Button>
                  {locationError && (
                    <p className="text-xs text-destructive">{locationError}</p>
                  )}
                </div>
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
                  name="interactionChannel"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Send className="h-4 w-4" />
                        Interaction Channel <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={cn(fieldState.invalid && 'border-destructive')}>
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CALL">Call</SelectItem>
                            <SelectItem value="VISIT">Visit</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="MEETING">Meeting</SelectItem>
                            <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
