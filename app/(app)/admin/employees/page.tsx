'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Filter, Loader2, X, Edit2, Mail, Phone, UserCheck, UserX, Users, BadgeCheck, ChevronDown, MoreHorizontal, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { PermissionGate } from '@/components/auth/permission-gate';
import { RouteGuard } from '@/components/auth/route-guard';
import { usePermissions } from '@/hooks/use-permissions';
import { listEmployees, createEmployee, updateEmployee, setEmployeeActive, listRoles, inviteEmployee, adminResetPassword } from '@/lib/actions/admin';

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const roleColors: Record<string, string> = {
  admin: 'bg-purple/10 text-purple border-purple/20',
  sales_manager: 'bg-blue/10 text-blue border-blue/20',
  salesperson: 'bg-green/10 text-green border-green/20',
  customer_service: 'bg-orange/10 text-orange border-orange/20',
  pricing: 'bg-cyan/10 text-cyan border-cyan/20',
  operations: 'bg-indigo/10 text-indigo border-indigo/20',
  accounts: 'bg-amber/10 text-amber border-amber/20',
};

interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  employee_code: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: { id: string; name: string; display_name: string }[];
}

interface RoleOption {
  id: string;
  name: string;
  display_name: string;
}

interface CreateFormData {
  full_name: string;
  email: string;
  employee_code: string;
  phone: string;
  role_ids: string[];
  temporary_password: string;
}

interface InviteFormData {
  full_name: string;
  email: string;
  employee_code: string;
  phone: string;
  role_ids: string[];
}

interface EditFormData {
  full_name: string;
  employee_code: string;
  phone: string;
  role_ids: string[];
}

function CreateEmployeeDialog({ open, onOpenChange, onSuccess, roles }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; roles: RoleOption[] }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      employee_code: '',
      phone: '',
      role_ids: [],
      temporary_password: '',
    },
    mode: 'onBlur',
    resolver: async (values) => {
      const errors: Record<string, { message: string }> = {};
      if (!values.full_name?.trim()) {
        errors.full_name = { message: 'Full name is required' };
      }
      if (!values.email?.trim()) {
        errors.email = { message: 'Email is required' };
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        errors.email = { message: 'Invalid email format' };
      }
      if (!values.temporary_password) {
        errors.temporary_password = { message: 'Temporary password is required' };
      } else if (values.temporary_password.length < 8) {
        errors.temporary_password = { message: 'Password must be at least 8 characters' };
      } else if (!/\d/.test(values.temporary_password)) {
        errors.temporary_password = { message: 'Password must contain at least one number' };
      }
      if (!values.role_ids?.length) {
        errors.role_ids = { message: 'At least one role is required' };
      }
      return { errors, values };
    },
  });

  const onSubmit = async (data: CreateFormData) => {
    setLoading(true);
    const result = await createEmployee({
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      employee_code: data.employee_code.trim() || undefined,
      phone: data.phone.trim() || undefined,
      role_ids: data.role_ids,
      password: data.temporary_password,
    });

    if (result.success) {
      toast.success('Employee created successfully');
      onSuccess();
      onOpenChange(false);
      form.reset();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const toggleRole = (roleId: string) => {
    const current = form.watch('role_ids');
    form.setValue('role_ids', current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Employee</DialogTitle>
          <DialogDescription>
            Enter employee details, assign roles, and set a temporary password.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-4 overflow-y-auto py-4 pr-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} disabled={loading} aria-invalid={!!form.formState.errors.full_name} aria-busy={loading} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.full_name?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} disabled={loading} aria-invalid={!!form.formState.errors.email} aria-busy={loading} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.email?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional, auto-generated if blank" {...field} disabled={loading} aria-busy={loading} />
                    </FormControl>
                    <FormDescription>Leave this blank to let the system create a globally unique employee code.</FormDescription>
                    <FormMessage>{form.formState.errors.employee_code?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 555 123 4567" {...field} disabled={loading} aria-busy={loading} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temporary_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min 8 chars, at least 1 number"
                        {...field}
                        disabled={loading}
                        aria-invalid={!!form.formState.errors.temporary_password}
                        aria-busy={loading}
                      />
                    </FormControl>
                    <FormMessage>{form.formState.errors.temporary_password?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Roles <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormDescription>Select one or more roles</FormDescription>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Label
                          key={role.id}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${field.value?.includes(role.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                            }`}
                        >
                          <Checkbox
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                            disabled={loading}
                            className="h-4 w-4"
                          />
                          <span>{role.display_name}</span>
                          <span className="text-xs text-muted-foreground">({role.name})</span>
                        </Label>
                      ))}
                    </div>
                    <FormMessage>{form.formState.errors.role_ids?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Employee'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InviteEmployeeDialog({ open, onOpenChange, onSuccess, roles }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; roles: RoleOption[] }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<InviteFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      employee_code: '',
      phone: '',
      role_ids: [],
    },
    mode: 'onBlur',
    resolver: async (values) => {
      const errors: Record<string, { message: string }> = {};
      if (!values.full_name?.trim()) {
        errors.full_name = { message: 'Full name is required' };
      }
      if (!values.email?.trim()) {
        errors.email = { message: 'Email is required' };
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        errors.email = { message: 'Invalid email format' };
      }
      if (!values.role_ids?.length) {
        errors.role_ids = { message: 'At least one role is required' };
      }
      return { errors, values };
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);
    const result = await inviteEmployee({
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      employee_code: data.employee_code.trim() || undefined,
      phone: data.phone.trim() || undefined,
      role_ids: data.role_ids,
    });

    if (result.success) {
      toast.success('Invitation sent successfully. The employee will receive an email to set their password.');
      onSuccess();
      onOpenChange(false);
      form.reset();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const toggleRole = (roleId: string) => {
    const current = form.watch('role_ids');
    form.setValue('role_ids', current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite Employee</DialogTitle>
          <DialogDescription>
            Enter employee details and assign roles. An invitation email will be sent to set their password.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-4 overflow-y-auto py-4 pr-2">
<FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} disabled={loading} aria-invalid={!!form.formState.errors.full_name} aria-busy={loading} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.full_name?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} disabled={loading} aria-invalid={!!form.formState.errors.email} aria-busy={loading} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.email?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional, auto-generated if blank" {...field} disabled={loading} aria-busy={loading} />
                    </FormControl>
                    <FormDescription>Leave this blank to let the system create a globally unique employee code.</FormDescription>
                    <FormMessage>{form.formState.errors.employee_code?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 555 123 4567" {...field} disabled={loading} aria-busy={loading} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Roles <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormDescription>Select one or more roles</FormDescription>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Label
                          key={role.id}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${field.value?.includes(role.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                            }`}
                        >
                          <Checkbox
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                            disabled={loading}
                            className="h-4 w-4"
                          />
                          <span>{role.display_name}</span>
                          <span className="text-xs text-muted-foreground">({role.name})</span>
                        </Label>
                      ))}
                    </div>
                    <FormMessage>{form.formState.errors.role_ids?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ open, onOpenChange, onSuccess, employee, roles }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; employee: Employee | null; roles: RoleOption[] }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<EditFormData>({
    defaultValues: {
      full_name: '',
      employee_code: '',
      phone: '',
      role_ids: [],
    },
    mode: 'onBlur',
    resolver: async (values) => {
      const errors: Record<string, { message: string }> = {};
      if (!values.full_name?.trim()) {
        errors.full_name = { message: 'Full name is required' };
      }
      if (!values.role_ids?.length) {
        errors.role_ids = { message: 'At least one role is required' };
      }
      // Validate phone if provided
      if (values.phone?.trim()) {
        const cleaned = values.phone.trim().replace(/[\s\-\(\)]/g, '');
        if (!/^\+?\d{10,15}$/.test(cleaned)) {
          errors.phone = { message: 'Phone number must be 10-15 digits (with optional + prefix)' };
        }
      }
      return { errors, values };
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        full_name: employee.full_name,
        employee_code: employee.employee_code ?? '',
        phone: employee.phone ?? '',
        role_ids: employee.roles.map((r) => r.id),
      });
    }
  }, [employee, form]);

  const onSubmit = async (data: EditFormData) => {
    if (!employee) return;
    setLoading(true);
    const result = await updateEmployee({
      user_id: employee.id,
      full_name: data.full_name.trim(),
      employee_code: data.employee_code.trim(),
      phone: data.phone.trim() || undefined,
      role_ids: data.role_ids,
    });

    if (result.success) {
      toast.success('Employee updated successfully');
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const toggleRole = (roleId: string) => {
    const current = form.watch('role_ids');
    form.setValue('role_ids', current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee details and role assignments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid gap-4 overflow-y-auto py-4 pr-2">
              {/* Read-only email reference */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        disabled={loading}
                        aria-invalid={!!form.formState.errors.full_name}
                        aria-busy={loading}
                      />
                    </FormControl>
                    <FormMessage>{form.formState.errors.full_name?.message}</FormMessage>
                  </FormItem>
                )}
              />

              {/* Email reference (read-only) */}
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-gray-900">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input value={employee.email || '—'} readOnly className="bg-muted text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed. Contact admin for email updates.</p>
              </div>

              <FormField
                control={form.control}
                name="employee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Leave blank to keep the existing code"
                        {...field}
                        disabled={loading}
                        aria-invalid={!!form.formState.errors.employee_code}
                        aria-busy={loading}
                      />
                    </FormControl>
                    <FormDescription>
                      This stays one code per employee profile, even when the user has multiple roles.
                    </FormDescription>
                    <FormMessage>{form.formState.errors.employee_code?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 555 123 4567"
                        {...field}
                        disabled={loading}
                        aria-invalid={!!form.formState.errors.phone}
                        aria-busy={loading}
                      />
                    </FormControl>
                    <FormMessage>{form.formState.errors.phone?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Roles <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormDescription>Select one or more roles</FormDescription>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Label
                          key={role.id}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${field.value?.includes(role.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                            }`}
                        >
                          <Checkbox
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                            disabled={loading}
                            className="h-4 w-4"
                          />
                          <span>{role.display_name}</span>
                          <span className="text-xs text-muted-foreground">({role.name})</span>
                        </Label>
                      ))}
                    </div>
                    <FormMessage>{form.formState.errors.role_ids?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeTable({
  employees,
  loading,
  canEdit,
  canDeactivate,
  canResetPassword,
  onEdit,
  onToggleActive,
  onResetPassword,
}: {
  employees: Employee[];
  loading: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canResetPassword: boolean;
  onEdit: (e: Employee) => void;
  onToggleActive: (e: Employee) => void;
  onResetPassword: (e: Employee) => void;
}) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="text-base font-semibold">No employees found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first team member to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm font-medium">
                      {initials(emp.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(emp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {emp.email ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" /> {emp.email}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {emp.employee_code ? (
                  <span className="font-mono text-sm">{emp.employee_code}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {emp.phone ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" /> {emp.phone}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {emp.roles.length === 0 ? (
                    <Badge variant="outline" className="text-xs">No roles</Badge>
                  ) : (
                    emp.roles.map((role) => (
                      <Badge
                        key={role.id}
                        variant="outline"
                        className={`text-xs gap-1 ${roleColors[role.name] || 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {role.display_name}
                        {emp.roles.length > 1 && <BadgeCheck className="h-3 w-3" />}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={emp.is_active ? 'default' : 'outline'}
                  className={emp.is_active ? 'bg-success/10 text-success border-success/20' : 'text-muted-foreground'}
                >
                  {emp.is_active ? (
                    <>
                      <UserCheck className="mr-1 h-3 w-3" /> Active
                    </>
                  ) : (
                    <>
                      <UserX className="mr-1 h-3 w-3" /> Inactive
                    </>
                  )}
                </Badge>
              </TableCell>
<TableCell className="text-right pr-4">
                {canEdit || canDeactivate || canResetPassword ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Employee actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(emp)} className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canResetPassword && (
                        <DropdownMenuItem onClick={() => onResetPassword(emp)} className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                      )}
                      {(canEdit || canResetPassword || canDeactivate) && canDeactivate && (
                        <>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onToggleActive(emp)}
                                className={`flex items-center gap-2 ${emp.is_active ? 'text-destructive' : 'text-success'}`}
                              >
                                {emp.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {emp.is_active ? 'Deactivate Employee' : 'Activate Employee'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {emp.is_active
                                    ? `Are you sure you want to deactivate ${emp.full_name}? They will lose access to the system.`
                                    : `Activate ${emp.full_name}? They will regain access to the system.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onToggleActive(emp)}
                                  className={emp.is_active ? 'bg-destructive' : 'bg-success'}
                                >
                                  {emp.is_active ? 'Deactivate' : 'Activate'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-muted-foreground text-sm">No actions</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryCards({ employees }: { employees: Employee[] }) {
  const total = employees.length;
  const active = employees.filter((e) => e.is_active).length;
  const inactive = employees.filter((e) => !e.is_active).length;
  const multiRole = employees.filter((e) => e.roles.length > 1).length;

  const cards = [
    { label: 'Total Employees', value: total.toString(), icon: Users, accent: 'primary' as const },
    { label: 'Active', value: active.toString(), icon: UserCheck, accent: 'success' as const },
    { label: 'Inactive', value: inactive.toString(), icon: UserX, accent: 'destructive' as const },
    { label: 'Multi-Role', value: multiRole.toString(), icon: BadgeCheck, accent: 'info' as const },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={card.label} className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="font-display text-2xl font-bold tracking-tight">{card.value}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
function EmployeesPageContent() {  const { loading: authLoading } = useAuth();  const { can } = usePermissions();  const [employees, setEmployees] = useState<Employee[]>([]);  const [roles, setRoles] = useState<RoleOption[]>([]);  const [loading, setLoading] = useState(true);  const [search, setSearch] = useState('');  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');  const [roleFilter, setRoleFilter] = useState<string>('all');  const [inviteOpen, setInviteOpen] = useState(false);  const [editOpen, setEditOpen] = useState(false);  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);  const canRead = can(PERMISSIONS.ADMIN.USER_READ);
  const canCreate = can(PERMISSIONS.ADMIN.USER_CREATE) && can(PERMISSIONS.ADMIN.USER_ASSIGN_ROLES);
  const canEdit = can(PERMISSIONS.ADMIN.USER_UPDATE) && can(PERMISSIONS.ADMIN.USER_ASSIGN_ROLES);
  const canDeactivate = can(PERMISSIONS.ADMIN.USER_DEACTIVATE);
  const canResetPassword = can(PERMISSIONS.ADMIN.USER_UPDATE);  const fetchData = useCallback(async () => {    if (!canRead) return;    setLoading(true);    try {      const [empResult, rolesResult] = await Promise.all([listEmployees(), listRoles()]);      if (empResult.success) setEmployees(empResult.employees);      if (rolesResult.success) setRoles(rolesResult.roles);    } catch {      toast.error('Failed to load employees');    } finally {      setLoading(false);    }  }, [canRead]);  useEffect(() => {    if (!authLoading && canRead) {      void fetchData();    }  }, [authLoading, canRead, fetchData]);  const filteredEmployees = employees.filter((emp) => {    const query = search.toLowerCase();    const matchesSearch =      emp.full_name.toLowerCase().includes(query) ||      emp.email?.toLowerCase().includes(query) ||      emp.employee_code?.toLowerCase().includes(query) ||      emp.roles.some((r) => r.display_name.toLowerCase().includes(query));    const matchesStatus =      statusFilter === 'all' ||      (statusFilter === 'active' && emp.is_active) ||      (statusFilter === 'inactive' && !emp.is_active);    const matchesRole = roleFilter === 'all' || emp.roles.some((r) => r.id === roleFilter);    return matchesSearch && matchesStatus && matchesRole;  });  const handleRefresh = () => {    void fetchData();    toast.success('Refreshed');  };  const handleInviteSuccess = () => {    setInviteOpen(false);    void fetchData();  };  const handleEditSuccess = () => {    setEditOpen(false);    setEditEmployee(null);    void fetchData();  };  const handleToggleActive = async (emp: Employee) => {    const result = await setEmployeeActive(emp.id, !emp.is_active);    if (result.success) {      toast.success(emp.is_active ? 'Employee deactivated' : 'Employee activated');      void fetchData();    } else {      toast.error(result.error);    }  };  const handleResetPassword = async (emp: Employee) => {    const result = await adminResetPassword(emp.id);    if (result.success) {      toast.success(`Password reset email sent to ${emp.full_name}`);    } else {      toast.error(result.error);    }  };  if (authLoading || !canRead) {    return (      <div className="animate-fade-in">        <PageHeader title="Employee Management" description="Loading...">          <Button size="sm" disabled>            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />          </Button>        </PageHeader>        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">          {Array.from({ length: 4 }).map((_, i) => (            <Card key={i} className="p-5">              <Skeleton className="h-4 w-3/4" />              <Skeleton className="mt-2 h-8 w-1/2" />            </Card>          ))}        </div>        <div className="mt-6 rounded-md border">          <Table>            <TableHeader>              <TableRow>                <TableHead>Employee</TableHead>                <TableHead>Email</TableHead>                <TableHead>Code</TableHead>                <TableHead>Phone</TableHead>                <TableHead>Roles</TableHead>                <TableHead className="text-center">Status</TableHead>                <TableHead className="text-right">Actions</TableHead>              </TableRow>            </TableHeader>            <TableBody>              {Array.from({ length: 5 }).map((_, i) => (                <TableRow key={i}>                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>                  <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>                  <TableCell className="text-right"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>                </TableRow>              ))}            </TableBody>          </Table>        </div>      </div>    );  }  return (    <RouteGuard permission={PERMISSIONS.ADMIN.USER_READ}>      <div className="animate-fade-in">        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">          <PageHeader title="Employee Management" description={`${employees.length} employees`} />          <PermissionGate permission={PERMISSIONS.ADMIN.USER_CREATE} fallback={null}>            <Button className="gap-1.5" onClick={() => setInviteOpen(true)}>              <Plus className="h-4 w-4" />              Create Employee            </Button>          </PermissionGate>        </div>        <SummaryCards employees={employees} />        <Card className="mt-6">          <div className="border-b p-4">            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">                <div className="relative max-w-xs flex-1">                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />                  <Input                    placeholder="Search name, email, code, role..."                    value={search}                    onChange={(e) => setSearch(e.target.value)}                    className="pl-10"                  />                </div>                <div className="flex items-center gap-2">                  <Filter className="h-4 w-4 text-muted-foreground" />                  <Select                    value={statusFilter}                    onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}                  >                    <SelectTrigger className="w-[160px]">                      <SelectValue placeholder="All Status" />                    </SelectTrigger>                    <SelectContent>                      <SelectItem value="all">All</SelectItem>                      <SelectItem value="active">Active</SelectItem>                      <SelectItem value="inactive">Inactive</SelectItem>                    </SelectContent>                  </Select>                  <Select value={roleFilter} onValueChange={setRoleFilter}>                    <SelectTrigger className="w-[180px]">                      <SelectValue placeholder="All Roles" />                    </SelectTrigger>                    <SelectContent>                      <SelectItem value="all">All Roles</SelectItem>                      {roles.map((role) => (                        <SelectItem key={role.id} value={role.id}>                          {role.display_name}                        </SelectItem>                      ))}                    </SelectContent>                  </Select>                </div>              </div>              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>                <Loader2 className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />                Refresh              </Button>            </div>          </div>          <div className="p-4">            <EmployeeTable              employees={filteredEmployees}              loading={loading}              canEdit={canEdit}              canDeactivate={canDeactivate}              canResetPassword={canResetPassword}              onEdit={(emp) => {                setEditEmployee(emp);                setEditOpen(true);              }}              onToggleActive={handleToggleActive}              onResetPassword={handleResetPassword}            />          </div>        </Card>        <CreateEmployeeDialog          open={inviteOpen}          onOpenChange={setInviteOpen}          onSuccess={handleInviteSuccess}          roles={roles}        />        <EditEmployeeDialog          open={editOpen}          onOpenChange={setEditOpen}          onSuccess={handleEditSuccess}          employee={editEmployee}          roles={roles}        />      </div>    </RouteGuard>  );}export default function AdminEmployeesPage() {  return <EmployeesPageContent />;}
