'use client';

import * as React from 'react';
import { UploadCloud, FileText, Trash2, Mail, Pencil, Search, Loader2, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCs } from '@/lib/cs-store';
import { errorMessage } from '@/lib/supabase/queries';
import { DOC_TYPES, MAX_UPLOAD_BYTES } from '@/lib/config';
import { daysUntil, formatDate } from '@/lib/date';
import type { DocType, KycDocument } from '@/lib/types';
import { cn } from '@/lib/utils';

function ExpiryBadge({ days }: { days: number | null }) {
  const base = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';
  if (days === null) return <span className={cn(base, 'bg-slate-100 text-slate-500')}>No Expiry</span>;
  if (days < 0) return <span className={cn(base, 'bg-rose-600 text-white')}>Expired {Math.abs(days)}d ago</span>;
  if (days < 15) return <span className={cn(base, 'bg-rose-100 text-rose-700')}>{days}d left — Critical</span>;
  if (days < 60) return <span className={cn(base, 'bg-amber-100 text-amber-700')}>{days}d left — Warning</span>;
  return <span className={cn(base, 'bg-emerald-100 text-emerald-700')}>{days}d left — Valid</span>;
}

const docTypeColors: Record<string, string> = {
  IEC: 'bg-blue-50 text-blue-600',
  GST: 'bg-emerald-50 text-emerald-600',
  PAN: 'bg-amber-50 text-amber-600',
  KYC: 'bg-slate-100 text-slate-600',
};

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const ALLOWED_EXT = ACCEPT.split(',').map((e) => e.replace('.', ''));

export function DocumentsTable() {
  const { documents, customers, loading, addDocument, updateDocument, deleteDocument, openDocumentFile } = useCs();
  const { toast } = useToast();

  const [search, setSearch] = React.useState('');

  // dialog state (shared by create + edit)
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KycDocument | null>(null);
  const [customerId, setCustomerId] = React.useState('');
  const [docType, setDocType] = React.useState<DocType>('IEC');
  const [docNumber, setDocNumber] = React.useState('');
  const [expiry, setExpiry] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<KycDocument | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [openingId, setOpeningId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setCustomerId('');
    setDocType('IEC');
    setDocNumber('');
    setExpiry('');
    setFile(null);
    setFileError(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: KycDocument) => {
    setEditing(doc);
    setCustomerId(doc.customerId);
    setDocType(doc.docType);
    setDocNumber(doc.docNumber);
    setExpiry(doc.expiryDate ?? '');
    setFile(null);
    setFileError(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext)) {
      setFileError('Unsupported file type. Use PDF, JPG, PNG, DOC or DOCX.');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setFileError('File is larger than 10MB.');
      return;
    }
    setFileError(null);
    setFile(f);
  };

  const handleSave = async () => {
    if (!customerId) return setFormError('Select a customer.');
    if (!docNumber.trim()) return setFormError('Enter the document number.');
    setFormError(null);
    setSaving(true);
    try {
      const input = {
        customerId,
        docType,
        docNumber: docNumber.trim(),
        expiryDate: expiry || null,
        file,
      };
      if (editing) await updateDocument(editing.id, input);
      else await addDocument(input);
      const customerName = customers.find((c) => c.id === customerId)?.name ?? '';
      toast({
        title: editing ? 'Document updated' : 'Document uploaded',
        description: `${docType} document for ${customerName} has been ${editing ? 'updated' : 'added'}.`,
      });
      setDialogOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      toast({ title: 'Document removed', description: `${deleteTarget.docType} (${deleteTarget.docNumber}) has been deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'Could not delete document', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenFile = async (doc: KycDocument) => {
    setOpeningId(doc.id);
    try {
      await openDocumentFile(doc);
    } catch (err) {
      toast({ title: 'Could not open file', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setOpeningId(null);
    }
  };

  /** Opens the user's mail client addressed to the customer's email on file. */
  const handleSendAlert = (doc: KycDocument, days: number) => {
    const email = customers.find((c) => c.id === doc.customerId)?.email;
    if (!email) {
      toast({
        title: 'No email on file',
        description: `${doc.customerName} has no email address in customer master.`,
        variant: 'destructive',
      });
      return;
    }
    const when =
      days < 0 ? `expired on ${formatDate(doc.expiryDate)}` : `will expire on ${formatDate(doc.expiryDate)} (in ${days} days)`;
    const subject = `Action required: your ${doc.docType} document ${when.startsWith('expired') ? 'has expired' : 'is expiring soon'}`;
    const body =
      `Dear ${doc.customerName},\n\nOur records show that your ${doc.docType} (${doc.docNumber}) ${when}.\n` +
      `Please share the renewed document at the earliest so that your shipments are not delayed.\n\nRegards`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sortedDocs = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter(
        (d) =>
          !q ||
          d.customerName.toLowerCase().includes(q) ||
          d.docNumber.toLowerCase().includes(q) ||
          d.docType.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const da = daysUntil(a.expiryDate);
        const db = daysUntil(b.expiryDate);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }, [documents, search]);

  const criticalCount = documents.filter((d) => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days < 15;
  }).length;
  const warningCount = documents.filter((d) => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days >= 15 && days < 60;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-heading text-2xl font-bold text-slate-900">{documents.length}</p>
          <p className="text-xs text-slate-500">Total Documents</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <p className="font-heading text-2xl font-bold text-rose-700">{criticalCount}</p>
          <p className="text-xs font-medium text-rose-600">Critical / expired (&lt;15d)</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="font-heading text-2xl font-bold text-amber-700">{warningCount}</p>
          <p className="text-xs font-medium text-amber-600">Warning (&lt;60d)</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="font-heading text-2xl font-bold text-emerald-700">{documents.length - criticalCount - warningCount}</p>
          <p className="text-xs font-medium text-emerald-600">Valid / no expiry</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, type, number..."
            className="border-slate-200 bg-white pl-9"
          />
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <UploadCloud className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {['Customer', 'Doc Type', 'Doc Number', 'File', 'Uploaded', 'Expiry Date', 'Status'].map((h) => (
                    <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center text-sm text-slate-500">
                      {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}
                    </TableCell>
                  </TableRow>
                )}
                {sortedDocs.map((doc) => {
                  const days = daysUntil(doc.expiryDate);
                  const showAlert = days !== null && days < 60;
                  return (
                    <TableRow key={doc.id} className="border-slate-100 hover:bg-blue-50/20">
                      <TableCell className="text-sm font-medium text-slate-700">{doc.customerName}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                            docTypeColors[doc.docType] ?? 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {doc.docType}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{doc.docNumber}</TableCell>
                      <TableCell>
                        {doc.fileName ? (
                          doc.filePath ? (
                            <button
                              onClick={() => handleOpenFile(doc)}
                              disabled={openingId === doc.id}
                              className="flex max-w-[200px] items-center gap-1.5 text-xs text-blue-700 hover:underline"
                              title="Open file"
                            >
                              {openingId === doc.id ? (
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                              ) : (
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="truncate">{doc.fileName}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500" title="Legacy record — no stored file">
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              {doc.fileName}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">No file</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDate(doc.uploadDate)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>
                        <ExpiryBadge days={days} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {showAlert && days !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendAlert(doc, days)}
                              className="h-8 gap-1.5 text-blue-700 hover:bg-blue-50"
                              title="Compose an expiry email to the customer"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Email</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit document"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => openEdit(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete document"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            onClick={() => setDeleteTarget(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-900">
              {editing ? 'Edit Customer Document' : 'Upload Customer Document'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editing ? 'Update details, or attach a replacement file' : 'Add a new IEC, GST, PAN, or KYC document with expiry tracking'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Document Type *</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Document Number *</Label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Document number" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Expiry Date</Label>
              <div className="flex gap-2">
                <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="flex-1" />
                {expiry && (
                  <Button variant="outline" size="icon" aria-label="Clear expiry date" onClick={() => setExpiry('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400">Leave empty for documents that never expire.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Document File</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPT}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                {file ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-5 w-5 text-blue-500" />
                    {file.name}
                  </div>
                ) : editing?.fileName ? (
                  <div className="text-sm text-slate-600">
                    <div className="flex items-center justify-center gap-2 font-medium">
                      <FileText className="h-5 w-5 text-blue-500" />
                      {editing.fileName}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Click or drop to replace</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mb-2 h-7 w-7 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">Drop file here or click to browse</p>
                    <p className="mt-0.5 text-xs text-slate-400">PDF, JPG, PNG, DOC, DOCX up to 10MB</p>
                  </>
                )}
              </div>
              {fileError && <p className="text-xs font-medium text-rose-600">{fileError}</p>}
            </div>

            {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !customerId || !docNumber.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Upload Document'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.docType} ({deleteTarget?.docNumber}) for {deleteTarget?.customerName}
              {deleteTarget?.filePath ? ' and its uploaded file' : ''} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
