'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  User,
  MessageSquare,
  Flag,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { searchCustomers } from '@/lib/actions/customer-interactions/queries/search-customers';
import { createInteraction } from '@/lib/actions/customer-interactions/mutations/create-interaction';
import { listEmployeesForFilter } from '@/lib/actions/customer-interactions/queries/list-employees-for-filter';
import type { InteractionType, InteractionOutcome } from '@/lib/actions/customer-interactions/types';
import { cn } from '@/lib/utils';

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
  customerId: z.string().min(1, 'Customer is required'),
  employeeId: z.string().min(1, 'Employee is required'),
  interactionTypeId: z.string().min(1, 'Interaction type is required'),
  interactionOutcomeId: z.string().min(1, 'Outcome is required'),
  subject: z.string().max(255).optional(),
  notes: z.string().min(1, 'Notes are required'),
  interactionAt: z.string().min(1, 'Date and time is required'),
});

type CreateInteractionFormData = z.infer<typeof createInteractionSchema>;

interface CustomerSearchResult {
  customerId: string;
  customerRef: string;
  companyName: string;
  city: string | null;
  state: string | null;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
}

export function CreateInteractionForm({
  interactionTypes,
  interactionOutcomes,
  employees: initialEmployees,
}: CreateInteractionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>(initialEmployees);

  const form = useForm<CreateInteractionFormData>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      customerId: '',
      employeeId: '',
      interactionTypeId: '',
      interactionOutcomeId: '',
      subject: '',
      notes: '',
      interactionAt: new Date().toISOString().slice(0, 16),
    },
  });

  const handleCustomerSearch = useCallback(async (query: string) => {
    setCustomerSearch(query);
    if (!query.trim()) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const result = await searchCustomers(query, 10);
      if (result.success) {
        setCustomerResults(result.customers);
        setShowCustomerDropdown(true);
      }
    } catch {
      setCustomerResults([]);
    }
  }, []);

  const selectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.companyName} (${customer.customerRef})`);
    setCustomerResults([]);
    setShowCustomerDropdown(false);
    form.setValue('customerId', customer.customerId, { shouldValidate: true });
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
    form.setValue('customerId', '', { shouldValidate: true });
  };

  const handleSubmit = async (data: CreateInteractionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createInteraction({
        customerId: data.customerId,
        employeeId: data.employeeId,
        interactionTypeId: data.interactionTypeId,
        interactionOutcomeId: data.interactionOutcomeId,
        subject: data.subject || null,
        notes: data.notes,
        interactionAt: data.interactionAt,
      });

      if (result.success) {
        router.push(`/customer-interactions/${result.interaction.id}`);
        router.refresh();
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError('Failed to create interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Interaction</h1>
          <p className="mt-1 text-muted-foreground">
            Record a new customer interaction
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Customer Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
              <CardDescription>Search and select a customer</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, reference, contact, email, phone, GST, PAN…"
                          className="pl-9 pr-9"
                          value={customerSearch}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleCustomerSearch(e.target.value);
                          }}
                          onFocus={() => {
                            if (customerResults.length > 0) setShowCustomerDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                          disabled={isSubmitting}
                        />
                        {selectedCustomer && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={clearCustomer}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-lg">
                        {customerResults.map((customer) => (
                          <Button
                            key={customer.customerId}
                            type="button"
                            variant="ghost"
                            className="w-full justify-start gap-3 p-2 hover:bg-accent"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="flex-1 text-left">
                              <p className="font-medium">{customer.companyName}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.customerRef} • {customer.contactPerson || 'No contact'}
                                {customer.city && ` • ${customer.city}`}
                                {customer.state && `, ${customer.state}`}
                              </p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Interaction Details Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Employee */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field , fieldState}) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(fieldState.invalid && 'border-destructive')}>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="" disabled>Select employee</SelectItem>
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

                {/* Interaction Type */}
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
                          <SelectItem value="" disabled>Select type</SelectItem>
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

                {/* Outcome */}
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
                          <SelectItem value="" disabled>Select outcome</SelectItem>
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

                {/* Date/Time */}
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

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Subject (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief subject line"
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

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Notes <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Record the details of this interaction…"
                          className={cn('min-h-[120px] resize-y', fieldState.invalid && 'border-destructive')}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Required. Include key discussion points, commitments, and next steps.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Error */}
          {submitError && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{submitError}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Create Interaction
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}