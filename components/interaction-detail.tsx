'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  MessageSquare,
  User,
  Calendar,
  Clock,
  Flag,
  FileText,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createFollowup } from '@/lib/actions/customer-interactions/mutations/create-followup';
import { completeFollowup } from '@/lib/actions/customer-interactions/mutations/complete-followup';
import { convertInteractionToEnquiry } from '@/lib/actions/customer-interactions/mutations/convert-interaction-to-enquiry';
import { updateInteraction } from '@/lib/actions/customer-interactions/mutations/update-interaction';
import { toast } from 'sonner';
import type { CustomerInteraction, InteractionFollowup, InteractionType, InteractionOutcome } from '@/lib/actions/customer-interactions/types';

interface EmployeeDetail {
  id: string;
  full_name: string;
  employee_code: string | null;
  email: string | null;
}

interface InteractionDetailProps {
  interaction: CustomerInteraction;
  interactionTypes: InteractionType[];
  interactionOutcomes: InteractionOutcome[];
  followups: InteractionFollowup[];
  employee: EmployeeDetail | null;
}

const statusConfig = {
  Pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
  Completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Completed' },
} as const;

function StatusBadge({ status }: { status: 'Pending' | 'Completed' }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className="gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
      {config.label}
    </Badge>
  );
}

function OutcomeBadge({ outcomeId, outcomes }: { outcomeId: string; outcomes: InteractionOutcome[] }) {
  const outcome = outcomes.find((o) => o.id === outcomeId);
  if (!outcome) return <Badge variant="outline">—</Badge>;

  const config: Record<string, { icon: typeof AlertCircle | typeof CheckCircle | typeof HelpCircle; color: string }> = {
    INTERESTED: { icon: HelpCircle, color: 'bg-blue-500' },
    NOT_INTERESTED: { icon: XCircle, color: 'bg-gray-500' },
    CALL_BACK_LATER: { icon: Clock, color: 'bg-yellow-500' },
    QUOTATION_REQUESTED: { icon: FileText, color: 'bg-purple-500' },
    MEETING_SCHEDULED: { icon: Calendar, color: 'bg-indigo-500' },
    NO_RESPONSE: { icon: HelpCircle, color: 'bg-orange-500' },
    WRONG_CONTACT: { icon: AlertCircle, color: 'bg-red-500' },
    CONVERTED_TO_ENQUIRY: { icon: CheckCircle, color: 'bg-green-500' },
  };

  const c = config[outcome.code] || { icon: HelpCircle, color: 'bg-muted' };
  const Icon = c.icon;

  return (
    <Badge variant="outline" className="gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
      {outcome.name}
    </Badge>
  );
}

function TypeBadge({ typeId, types }: { typeId: string; types: InteractionType[] }) {
  const type = types.find((t) => t.id === typeId);
  if (!type) return <Badge variant="secondary">—</Badge>;
  return <Badge variant="secondary">{type.name}</Badge>;
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date();
}

export function InteractionDetail({
  interaction,
  interactionTypes,
  interactionOutcomes,
  followups,
  employee,
}: InteractionDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingFollowup, setIsCreatingFollowup] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [followupDueAt, setFollowupDueAt] = useState('');
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [completingFollowupId, setCompletingFollowupId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

const [editData, setEditData] = useState({
    subject: interaction.subject ?? '',
    notes: interaction.notes,
    interactionAt: interaction.interactionAt.slice(0, 16),
    interactionOutcomeId: interaction.interactionOutcomeId,
    isActive: interaction.isActive,
    contactPersonName: interaction.contactPersonName,
    contactPersonMobile: interaction.contactPersonMobile,
    contactPersonEmail: interaction.contactPersonEmail ?? '',
    contactPersonDesignation: interaction.contactPersonDesignation ?? '',
    interactionChannel: interaction.interactionChannel,
    interactionDurationMinutes: interaction.interactionDurationMinutes ?? null,
  });

  const handleEdit = async (field: keyof typeof editData, value: string | boolean | number | null) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const validateEditForm = (): string | null => {
    if (!editData.notes || !editData.notes.trim()) {
      return 'Notes are required';
    }
    if (!editData.interactionAt) {
      return 'Interaction date/time is required';
    }
    if (!editData.interactionOutcomeId) {
      return 'Outcome is required';
    }
    if (!editData.contactPersonName || !editData.contactPersonName.trim()) {
      return 'Contact person name is required';
    }
    if (!editData.contactPersonMobile || !editData.contactPersonMobile.trim()) {
      return 'Contact person mobile is required';
    }
    if (!editData.interactionChannel) {
      return 'Interaction channel is required';
    }
    return null;
  };

  const handleSaveInteraction = async () => {
    const validationError = validateEditForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateInteraction({
        interactionId: interaction.id,
        subject: editData.subject || null,
        notes: editData.notes,
        interactionAt: editData.interactionAt,
        interactionOutcomeId: editData.interactionOutcomeId,
        isActive: editData.isActive,
        contactPersonName: editData.contactPersonName,
        contactPersonMobile: editData.contactPersonMobile,
        contactPersonEmail: editData.contactPersonEmail || null,
        contactPersonDesignation: editData.contactPersonDesignation || null,
        interactionChannel: editData.interactionChannel,
        interactionDurationMinutes: editData.interactionDurationMinutes ?? null,
      });

      if (result.success) {
        toast.success('Interaction updated successfully');
        router.refresh();
        setIsEditing(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to update interaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFollowup = async () => {
    if (!followupDueAt) {
      setFollowupError('Due date/time is required');
      return;
    }
    setFollowupError(null);
    setSubmitting(true);
    try {
      const result = await createFollowup({
        interactionId: interaction.id,
        dueAt: followupDueAt,
        status: 'Pending',
      });
      if (result.success) {
        toast.success('Follow-up created successfully');
        router.refresh();
        setIsCreatingFollowup(false);
        setFollowupDueAt('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to create follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteFollowup = async (followupId: string) => {
    if (!completionNotes.trim()) {
      toast.error('Completion notes are required');
      return;
    }
    setCompletingFollowupId(followupId);
    try {
      const result = await completeFollowup({
        followupId,
        completionNotes: completionNotes.trim(),
      });
      if (result.success) {
        toast.success('Follow-up completed');
        router.refresh();
        setCompletingFollowupId(null);
        setCompletionNotes('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to complete follow-up');
    } finally {
      setCompletingFollowupId(null);
    }
  };

  const handleOpenCompleteDialog = (followupId: string) => {
    setCompletingFollowupId(followupId);
    setCompletionNotes('');
  };

  const handleConvertToEnquiry = async () => {
    setIsConverting(true);
    try {
      const result = await convertInteractionToEnquiry(interaction.id);
      if (result.success) {
        toast.success('Enquiry created successfully');
        router.push(`/enquiries?detail=${result.enquiryId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to convert to enquiry');
    } finally {
      setIsConverting(false);
    }
  };

  const handleArchiveInteraction = async () => {
    setIsArchiving(true);
    try {
      const result = await updateInteraction({
        interactionId: interaction.id,
        isActive: false,
      });
      if (result.success) {
        toast.success('Interaction archived');
        router.push('/customer-interactions');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to archive interaction');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenCustomer = () => {
    router.push(`/admin/customers?customerId=${interaction.customerId}`);
  };

  const handleViewList = () => {
    router.push('/customer-interactions');
  };

  const pendingFollowups = followups.filter((f) => f.status === 'Pending');
  const completedFollowups = followups.filter((f) => f.status === 'Completed');

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {interaction.interactionRef}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {interaction.subject || 'No subject'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenCustomer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Customer
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewList}>
            <MessageSquare className="mr-2 h-4 w-4" />
            View List
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCreatingFollowup(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Interaction
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleArchiveInteraction}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Interaction Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interaction Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Reference</Label>
                  <p className="font-mono text-sm font-medium">{interaction.interactionRef}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date & Time</Label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(interaction.interactionAt).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' '}
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {new Date(interaction.interactionAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <TypeBadge typeId={interaction.interactionTypeId} types={interactionTypes} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Outcome</Label>
                  <OutcomeBadge outcomeId={interaction.interactionOutcomeId} outcomes={interactionOutcomes} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Employee</Label>
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {employee?.full_name || interaction.employeeId}
                    {employee?.employee_code && (
                      <span className="text-xs text-muted-foreground">({employee.employee_code})</span>
                    )}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={interaction.isActive ? 'default' : 'secondary'}>
                    {interaction.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Person</Label>
                  <p className="font-medium text-sm">{interaction.contactPersonName || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Mobile</Label>
                  <p className="text-sm">{interaction.contactPersonMobile || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Email</Label>
                  <p className="text-sm">{interaction.contactPersonEmail || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Designation</Label>
                  <p className="text-sm">{interaction.contactPersonDesignation || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Channel</Label>
                  <Badge variant="secondary">{interaction.interactionChannel}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                  <p className="text-sm">{interaction.interactionDurationMinutes !== null && interaction.interactionDurationMinutes !== undefined ? interaction.interactionDurationMinutes : '—'}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="mt-1 whitespace-pre-wrap text-sm">{interaction.notes}</p>
              </div>

              {/* Audit Info */}
              <div className="pt-4 border-t grid gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p>{new Date(interaction.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Updated</Label>
                  <p>{new Date(interaction.updatedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Enquiry</Label>
                  <p className="font-mono">{interaction.enquiryId || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-mono">{interaction.customerId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Follow-ups */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Follow-ups
              </CardTitle>
              <Button size="sm" onClick={() => setIsCreatingFollowup(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {pendingFollowups.length === 0 && completedFollowups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No follow-ups yet</p>
                  <p className="text-sm">Create your first follow-up for this interaction</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingFollowups.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Pending ({pendingFollowups.length})
                        {pendingFollowups.some((f) => isOverdue(f.dueAt)) && (
                          <span title="Has overdue follow-ups">
                            <Bell className="ml-2 h-3.5 w-3.5 text-destructive" />
                          </span>
                        )}
                      </h4>
                      {pendingFollowups.map((followup) => {
                        const overdue = isOverdue(followup.dueAt);
                        return (
                          <div
                            key={followup.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${overdue ? 'bg-destructive/5 border-destructive/20' : 'bg-yellow-50'
                              }`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{followup.followupRef}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {new Date(followup.dueAt).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {overdue && <span className="ml-2 text-destructive font-medium">(OVERDUE)</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status="Pending" />
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleOpenCompleteDialog(followup.id)}
                                disabled={completingFollowupId === followup.id}
                              >
                                {completingFollowupId === followup.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Complete'
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {completedFollowups.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Completed ({completedFollowups.length})
                      </h4>
                      {completedFollowups.map((followup) => (
                        <div
                          key={followup.id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-green-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{followup.followupRef}</p>
                              <StatusBadge status="Completed" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(followup.dueAt).toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {followup.completionNotes && (
                              <p className="mt-2 text-sm text-muted-foreground italic">{followup.completionNotes}</p>
                            )}
                            {followup.completedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Completed: {new Date(followup.completedAt).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-2" variant="outline" onClick={handleViewList}>
                <MessageSquare className="h-4 w-4" />
                View on List
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={handleConvertToEnquiry}
                disabled={isConverting || !!interaction.enquiryId}
              >
                <Plus className="h-4 w-4" />
                {interaction.enquiryId ? 'Enquiry Created' : isConverting ? 'Converting...' : 'Create Enquiry'}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" onClick={handleOpenCustomer}>
                <ExternalLink className="h-4 w-4" />
                Open Customer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Interaction Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-4xl font-bold">
                  {new Date(interaction.interactionAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                  })}
                </p>
                <p className="text-lg text-muted-foreground">
                  {new Date(interaction.interactionAt).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(interaction.interactionAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Interaction</DialogTitle>
            <DialogDescription>
              Update the interaction details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editData.subject}
                  onChange={(e) => handleEdit('subject', e.target.value)}
                  placeholder="Subject (optional)"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="interactionAt">Date & Time</Label>
                <Input
                  id="interactionAt"
                  type="datetime-local"
                  value={editData.interactionAt}
                  onChange={(e) => handleEdit('interactionAt', e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="outcome">Outcome</Label>
                <Select
                  value={editData.interactionOutcomeId}
                  onValueChange={(value) => handleEdit('interactionOutcomeId', value)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {interactionOutcomes.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.isActive}
                    onChange={(e) => handleEdit('isActive', e.target.checked)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Active
                </Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contactPersonName">Contact Person Name <span className="text-destructive">*</span></Label>
                <Input
                  id="contactPersonName"
                  value={editData.contactPersonName}
                  onChange={(e) => handleEdit('contactPersonName', e.target.value)}
                  placeholder="Contact person name"
                  maxLength={255}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="contactPersonMobile">Contact Person Mobile <span className="text-destructive">*</span></Label>
                <Input
                  id="contactPersonMobile"
                  type="tel"
                  value={editData.contactPersonMobile}
                  onChange={(e) => handleEdit('contactPersonMobile', e.target.value)}
                  placeholder="Contact mobile number"
                  maxLength={50}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="contactPersonEmail">Contact Person Email</Label>
                <Input
                  id="contactPersonEmail"
                  type="email"
                  value={editData.contactPersonEmail}
                  onChange={(e) => handleEdit('contactPersonEmail', e.target.value)}
                  placeholder="contact@company.com"
                  maxLength={255}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="contactPersonDesignation">Contact Person Designation</Label>
                <Input
                  id="contactPersonDesignation"
                  value={editData.contactPersonDesignation}
                  onChange={(e) => handleEdit('contactPersonDesignation', e.target.value)}
                  placeholder="e.g., Procurement Manager"
                  maxLength={255}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="interactionChannel">Interaction Channel <span className="text-destructive">*</span></Label>
                <Select
                  value={editData.interactionChannel}
                  onValueChange={(value) => handleEdit('interactionChannel', value)}
                  disabled={submitting}
                >
                  <SelectTrigger>
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
              </div>
              <div>
                <Label htmlFor="interactionDurationMinutes">Duration (minutes)</Label>
                <Input
                  id="interactionDurationMinutes"
                  type="number"
                  min={0}
                  value={editData.interactionDurationMinutes ?? ''}
                  onChange={(e) => handleEdit('interactionDurationMinutes', e.target.value ? Number(e.target.value) : null)}
                  placeholder="30"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editData.notes}
                onChange={(e) => handleEdit('notes', e.target.value)}
                className="min-h-[120px] resize-y"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveInteraction} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Follow-up Dialog */}
      <Dialog open={isCreatingFollowup} onOpenChange={setIsCreatingFollowup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up for this interaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dueAt">Due Date & Time</Label>
              <Input
                id="dueAt"
                type="datetime-local"
                value={followupDueAt}
                onChange={(e) => setFollowupDueAt(e.target.value)}
                disabled={submitting}
              />
              {followupError && (
                <p className="mt-1 text-sm text-destructive">{followupError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingFollowup(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateFollowup} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Follow-up Dialog */}
      <Dialog
        open={completingFollowupId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompletingFollowupId(null);
            setCompletionNotes('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
            <DialogDescription>
              Enter completion notes for this follow-up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="completionNotes">Completion Notes <span className="text-destructive">*</span></Label>
              <Textarea
                id="completionNotes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="min-h-[100px] resize-y"
                placeholder="Describe what was discussed, outcome, and next steps..."
                disabled={completingFollowupId === null}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingFollowupId(null)} disabled={completingFollowupId !== null}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (completingFollowupId) {
                  handleCompleteFollowup(completingFollowupId);
                }
              }}
              disabled={completingFollowupId === null || !completionNotes.trim()}
            >
              {completingFollowupId ? 'Completing...' : 'Complete Follow-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}