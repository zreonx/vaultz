"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Pencil,
  Pin,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatTableDate } from "@/lib/utils/date";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAccounts } from "@/features/accounts";
import type { QuickNoteResponse } from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const NOTE_PALETTE = [
  "#2A6B58",
  "#3B82F6",
  "#D97706",
  "#8B5CF6",
  "#0EA5E9",
  "#E06C6C",
  "#10B981",
  "#EC4899",
];

export function QuickNotesFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNoteResponse | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorHex, setColorHex] = useState<string>("#2A6B58");
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [accountId, setAccountId] = useState<string>("none");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: [
      "quick-notes",
      activeWorkspace?.id ?? "all",
      includeArchived,
      search.trim(),
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeWorkspace?.id) params.set("accountId", activeWorkspace.id);
      if (includeArchived) params.set("includeArchived", "true");
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      return apiClient.get<QuickNoteResponse[]>(
        `/api/v1/quick-notes${qs ? `?${qs}` : ""}`
      );
    },
    enabled: Boolean(user),
  });

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.isPinned && !n.isArchived),
    [notes]
  );
  const regularNotes = useMemo(
    () => notes.filter((n) => !n.isPinned || n.isArchived),
    [notes]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Note title is required.");
      if (!content.trim()) throw new Error("Note content cannot be empty.");

      const resolvedAccountId = accountId !== "none" ? accountId : null;

      if (editingNote) {
        return apiClient.put<QuickNoteResponse>(
          `/api/v1/quick-notes/${editingNote.id}`,
          {
            title: title.trim(),
            content: content.trim(),
            colorHex,
            isPinned,
            isArchived,
            accountId: resolvedAccountId,
          }
        );
      }

      return apiClient.post<QuickNoteResponse>("/api/v1/quick-notes", {
        title: title.trim(),
        content: content.trim(),
        colorHex,
        isPinned,
        accountId: resolvedAccountId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
      setDialogOpen(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Failed to save note.");
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<QuickNoteResponse>(`/api/v1/quick-notes/${id}/toggle-pin`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: (note: QuickNoteResponse) =>
      apiClient.put<QuickNoteResponse>(`/api/v1/quick-notes/${note.id}`, {
        title: note.title,
        content: note.content,
        colorHex: note.colorHex,
        isPinned: note.isPinned,
        isArchived: !note.isArchived,
        accountId: note.accountId ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/quick-notes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quick-notes"] });
    },
  });

  const openCreateDialog = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setColorHex(NOTE_PALETTE[0] ?? "#2A6B58");
    setIsPinned(false);
    setIsArchived(false);
    setAccountId(activeWorkspace?.id ?? "none");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (note: QuickNoteResponse) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColorHex(note.colorHex || NOTE_PALETTE[0] || "#2A6B58");
    setIsPinned(note.isPinned);
    setIsArchived(note.isArchived);
    setAccountId(note.accountId ?? "none");
    setFormError(null);
    setDialogOpen(true);
  };

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Quick Notes" />;
  }

  const renderNoteCard = (note: QuickNoteResponse) => (
    <Card
      key={note.id}
      className="flex flex-col justify-between overflow-hidden"
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: note.colorHex || "#2A6B58" }}
      />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{note.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => togglePinMutation.mutate(note.id)}
              className={`rounded-lg p-1.5 transition-colors ${
                note.isPinned
                  ? "text-[var(--accent)] hover:bg-[var(--surface-muted)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
              }`}
              aria-label={note.isPinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openEditDialog(note)}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label={`Edit ${note.title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleArchiveMutation.mutate(note)}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label={
                note.isArchived ? `Restore ${note.title}` : `Archive ${note.title}`
              }
            >
              {note.isArchived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(note.id)}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)]"
              aria-label={`Delete ${note.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-1">
        <p className="line-clamp-5 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">
          {note.content}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--muted-foreground)]">
          <div className="flex flex-wrap items-center gap-1.5">
            {note.accountName ? (
              <Badge variant="neutral">{note.accountName}</Badge>
            ) : (
              <Badge variant="neutral">General</Badge>
            )}
            {note.isArchived && <Badge variant="warning">Archived</Badge>}
          </div>
          <span>
            {formatTableDate((note.updatedAtUtc ?? note.createdAtUtc).slice(0, 10))}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Quick Notes</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Capture reminders, checklists, and money notes for ${activeWorkspace.name}.`
              : "Keep financial reminders, bill notes, and checklists organized."}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search notes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] cursor-pointer">
          <Switch
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <span>Show Archived</span>
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <StickyNote className="mb-3 h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="font-medium">No quick notes yet</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">
              Jot down payment confirmations, tax reminders, or shared expense splits.
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Pinned
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          {regularNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  All Notes
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regularNotes.map(renderNoteCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Note Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
            <DialogTitle>
              {editingNote ? "Edit Note" : "New Quick Note"}
            </DialogTitle>
            <DialogDescription>
              Keep concise reminders or checklists handy across Web and Mobile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Note</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="e.g., Tax Checklist, Electric Bill Ref #"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                rows={5}
                placeholder="Write your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color Tag</Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_PALETTE.map((hex) => {
                  const selected =
                    colorHex.toUpperCase() === hex.toUpperCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColorHex(hex)}
                      aria-label={`Select color ${hex}`}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        selected
                          ? "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--surface)] scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Account Scope</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General (All Accounts)</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Pin to top</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Keep this note highlighted above other notes
                </p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>

            {editingNote && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Archive Note</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Move out of active notes without deleting
                  </p>
                </div>
                <Switch
                  checked={isArchived}
                  onCheckedChange={setIsArchived}
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFormError(null);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : editingNote
                ? "Save Changes"
                : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
