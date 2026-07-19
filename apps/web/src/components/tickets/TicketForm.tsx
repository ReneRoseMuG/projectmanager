import type {
  AttachmentLibrarySelection,
  DraftComment,
  DraftNote,
  DraftTicket,
  Note,
  Priority,
  Tag,
  Ticket,
  TicketInput,
  TicketRelationType,
  TicketResolution,
  TicketStatus,
  TicketType,
} from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bug, Flag, GitBranch, History, Link2, ListChecks, SlidersHorizontal, UserRound, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import { getTicketLinkCandidates, getTicketRelationCandidates, type TicketOwner } from "../../api/tickets";
import type { DraftFile } from "../../types";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../hooks/useAuth";
import { useCatalogs } from "../../hooks/useCatalogs";
import { errorMessage } from "../../hooks/errors";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useNotes } from "../../hooks/useNotes";
import { useHasPermission } from "../../hooks/usePermissions";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import { objectReference } from "../../lib/references";
import { queryKeys } from "../../queries/queryKeys";
import {
  catalogColor,
  catalogEntriesByKind,
  catalogLabel,
  countOpenStatusItems,
  isCatalogStatusClosed,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { toDateInput } from "../../utils/date";
import {
  ticketRelationTypeLabels,
  ticketResolutionLabels,
} from "../../utils/domainLabels";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { JournalPanel } from "../journal/JournalPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { SaveStatus } from "../ui/SaveStatus";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { ParentContextField } from "../ui/ParentContextField";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { Pill } from "../ui/Pill";
import { ProjectContextTreeDialog, type MoveTarget } from "../ui/ProjectContextTreeDialog";
import { CatalogSelect } from "../ui/CatalogSelect";
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { DetailBoardShell } from "../ui/DetailBoardShell";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { UserSelectField } from "../users/UserSelectField";
import { TicketCard } from "./TicketCard";
import { TicketRelationPanel } from "./TicketRelationPanel";

type DraftSubTicket = Extract<DraftTicket, { kind: "new" }>["draft"];

export interface PendingTicketRelation {
  ticket: Ticket;
  relationType: TicketRelationType;
}

export interface TicketFormInput extends TicketInput {
  resolution?: TicketResolution | null;
  tagIds: number[];
  pendingSubTickets: DraftSubTicket[];
  pendingRelations: PendingTicketRelation[];
  pendingComments: DraftComment[];
  pendingNotes: DraftNote[];
  pendingFiles: DraftFile[];
}

interface TicketFormProps {
  open: boolean;
  ticket?: Ticket | null;
  owner?: TicketOwner;
  initialStatus?: TicketStatus;
  title?: string;
  onSubmit: (input: TicketFormInput) => Promise<Ticket | void>;
  onAutoSave?: (input: TicketFormInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
  onChanged?: () => Promise<void>;
  savingLabel?: string;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
  onOpenTicket?: (ticket: Ticket) => void;
}

type TicketFormTab = "details" | "subTickets" | "relations" | "comments" | "notes" | "attachments" | "journal";

const tabs: Array<Tab<TicketFormTab>> = [
  { value: "details", label: "Details" },
  { value: "subTickets", label: "Sub-Tickets" },
  { value: "relations", label: "Relationen" },
  { value: "notes", label: "Notizen" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" },
];

const resolutionOptions = (["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as TicketResolution[]).map((value) => ({
  value,
  label: ticketResolutionLabels[value],
}));

const relationTypes = ["blocks", "related", "duplicate"] as TicketRelationType[];

function ticketStatusValue(entries: Parameters<typeof resolveCatalogEntryKey>[0], value: TicketStatus): TicketStatus {
  return resolveCatalogEntryKey(entries, "workStatus", value, "open") ?? "open";
}

function priorityValue(entries: Parameters<typeof resolveCatalogEntryKey>[0], value: Priority): Priority {
  return resolveCatalogEntryKey(entries, "priority", value, "medium") ?? "medium";
}

function ticketTypeValue(entries: Parameters<typeof resolveCatalogEntryKey>[0], value: TicketType): TicketType {
  return resolveCatalogEntryKey(entries, "ticketType", value, "bug") ?? "bug";
}

export function TicketForm({
  open,
  ticket,
  owner,
  initialStatus = "open",
  title = "Ticket",
  onSubmit,
  onAutoSave,
  onDelete,
  onClose,
  onChanged,
  savingLabel,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
  onOpenTicket,
}: TicketFormProps) {
  const ticketId = ticket?.id ?? null;
  const detail = useTicketDetail(open && ticketId ? ticketId : null);
  const validOwner = owner && Number.isFinite(owner.id) ? owner : undefined;
  const relationCandidatesQuery = useQuery({
    queryKey: ticketId
      ? queryKeys.tickets.relationCandidates(ticketId)
      : validOwner
        ? queryKeys.tickets.linkCandidates(validOwner.type, validOwner.id)
        : queryKeys.tickets.root,
    queryFn: () => (ticketId ? getTicketRelationCandidates(ticketId) : getTicketLinkCandidates(validOwner as TicketOwner)),
    enabled: open && (ticketId !== null || validOwner !== undefined),
  });
  const auth = useAuth();
  const catalogs = useCatalogs();
  const notes = useNotes(ticketId && open ? { type: "ticket", id: ticketId } : null);
  const attachments = useAttachments(ticketId && open ? { type: "ticket", id: ticketId } : null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canReadJournal = useHasPermission("journal", "read");
  const [activeTab, setActiveTab] = useState<TicketFormTab>("details");
  const [ticketTitle, setTicketTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const [resolution, setResolution] = useState<TicketResolution>("fixed");
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [reporterUserId, setReporterUserId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [environment, setEnvironment] = useState("");
  const [affectedVersion, setAffectedVersion] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingSubTickets, setPendingSubTickets] = useState<DraftSubTicket[]>([]);
  const [pendingRelations, setPendingRelations] = useState<PendingTicketRelation[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingNotes, setPendingNotes] = useState<DraftNote[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [subTicketDraftOpen, setSubTicketDraftOpen] = useState(false);
  const [movingSubTicket, setMovingSubTicket] = useState<Ticket | null>(null);
  const [relationDraftOpen, setRelationDraftOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const prevOpenRef = useRef(false);

  const formStateRef = useRef({ ticketTitle, description, type, status, priority, resolution, responsibleUserId, reporterUserId, dueDate, environment, affectedVersion, selectedTags });
  formStateRef.current = { ticketTitle, description, type, status, priority, resolution, responsibleUserId, reporterUserId, dueDate, environment, affectedVersion, selectedTags };

  const autoSave = useAutoSave({
    enabled: !!ticket && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      const isClosed = isCatalogStatusClosed(catalogs.entries, "workStatus", s.status);
      await onAutoSave({
        title: s.ticketTitle,
        description: s.description,
        type: ticketTypeValue(catalogs.entries, s.type),
        status: ticketStatusValue(catalogs.entries, s.status),
        priority: priorityValue(catalogs.entries, s.priority),
        resolution: isClosed ? s.resolution : null,
        responsibleUserId: s.responsibleUserId,
        reporterUserId: s.reporterUserId,
        environment: s.type === "bug" ? s.environment : null,
        affectedVersion: s.type === "bug" ? s.affectedVersion : null,
        dueDate: s.dueDate || null,
        tagIds: s.selectedTags.map((t) => t.id),
        pendingSubTickets: [],
        pendingRelations: [],
        pendingComments: [],
        pendingNotes: [],
        pendingFiles: [],
      });
    },
  });
  const af = ticket ? autoSave.flush : undefined;

  useEffect(() => {
    if (!open) {
      setPendingSubTickets([]);
      setPendingRelations([]);
      setPendingComments([]);
      setPendingNotes([]);
      setPendingFiles([]);
      setSubTicketDraftOpen(false);
      setRelationDraftOpen(false);
      setEditingNote(null);
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) {
      setActiveTab("details");
    }
    prevOpenRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTicketTitle(ticket?.title ?? "");
    setDescription(ticket?.description ?? "");
    setType(ticket?.type ?? "bug");
    setStatus(ticket?.status ?? initialStatus);
    setPriority(ticket?.priority ?? "medium");
    setResolution(ticket?.resolution ?? "fixed");
    setResponsibleUserId(ticket ? ticket.responsibleUserId : (auth.user?.id ?? null));
    setReporterUserId(ticket ? ticket.reporterUserId : (auth.user?.id ?? null));
    setDueDate(toDateInput(ticket?.dueDate));
    setEnvironment(ticket?.environment ?? "");
    setAffectedVersion(ticket?.affectedVersion ?? "");
    setSelectedTags(ticket?.tags ?? []);
  }, [auth.user?.id, initialStatus, open, ticket]);

  useEffect(() => {
    if (open && catalogs.entries.length > 0) {
      setType((currentType) => ticketTypeValue(catalogs.entries, currentType));
      setStatus((currentStatus) => ticketStatusValue(catalogs.entries, currentStatus));
      setPriority((currentPriority) => priorityValue(catalogs.entries, currentPriority));
    }
  }, [catalogs.entries, open]);

  const loadedTicket = detail.ticket;
  const availableRelationTickets = useMemo(
    () => (relationCandidatesQuery.data ?? []).filter((item) => item.id !== ticketId),
    [relationCandidatesQuery.data, ticketId],
  );
  const statusClosed = isCatalogStatusClosed(catalogs.entries, "workStatus", status);
  const currentTicket = loadedTicket ?? ticket;
  const showParentContexts = !owner && (currentTicket?.parentContexts?.length ?? 0) > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title: ticketTitle,
        description,
        type: ticketTypeValue(catalogs.entries, type),
        status: ticketStatusValue(catalogs.entries, status),
        priority: priorityValue(catalogs.entries, priority),
        resolution: statusClosed ? resolution : null,
        reporterUserId,
        responsibleUserId,
        environment: type === "bug" ? environment : null,
        affectedVersion: type === "bug" ? affectedVersion : null,
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id),
        pendingSubTickets,
        pendingRelations,
        pendingComments,
        pendingNotes,
        pendingFiles,
      });
      if (closeOnSubmit) {
        onClose();
      }
    } catch {
      // Error feedback is handled by the caller.
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    setIsCreatingNote(true);
  };

  const handleCreateNote = async (title: string, contentJson: Note["contentJson"]) => {
    try {
      await notes.createNote({ title, contentJson });
      showToast({ tone: "success", title: "Notiz erstellt" });
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht erstellt werden", message: errorMessage(noteError) });
      throw noteError;
    }
  };

  const uploadAttachment = async (file: File, librarySelection: AttachmentLibrarySelection) => {
    try {
      const uploaded = await attachments.uploadAttachment(file, librarySelection);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht hochgeladen werden", message: errorMessage(attachmentError) });
      throw attachmentError;
    }
  };

  const visibleTabs = ticket ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal) : tabs.filter((tab) => tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "subTickets") {
      return {
        ...tab,
        count: ticket
          ? countOpenStatusItems(loadedTicket?.subTickets ?? [], catalogs.entries, "workStatus")
          : countOpenStatusItems(pendingSubTickets, catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "relations") {
      return { ...tab, count: ticket ? (loadedTicket?.relations.length ?? 0) : pendingRelations.length };
    }
    if (tab.value === "comments") {
      return { ...tab, count: ticket ? (loadedTicket?.comments.length ?? 0) : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: ticket ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: ticket ? attachments.attachments.length : pendingFiles.length };
    }
    return { ...tab, count: 0 };
  });

  // Reload the active collection tab from the server (e.g. after an external MCP change).
  // Only for a persisted ticket; in create mode the lists are local drafts.
  const collectionReload: Partial<Record<TicketFormTab, () => Promise<void>>> = ticket
    ? {
        subTickets: detail.reload,
        relations: detail.reload,
        notes: notes.reload,
        comments: detail.reload,
        attachments: attachments.reload,
      }
    : {};
  const refreshActiveTab = collectionReload[activeTab];

  return (
    <>
      <FormModal
        open={open}
        title={ticket ? "Ticket bearbeiten" : title}
        entityTitle={ticket?.title}
        objectReference={ticket ? objectReference("ticket", ticket.id) : undefined}
        icon={<Bug size={20} />}
        breadcrumb={["Tickets"]}
        submitLabel={saving ? (savingLabel ?? "Speichern...") : "Ticket anlegen"}
        saving={saving}
        hideFooter={!!ticket}
        onDelete={onDelete}
        saveStatus={ticket ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
        onSubmit={submit}
        onClose={onClose}
        variant={variant}
        onOpenInTab={onOpenInTab}
        onRefresh={refreshActiveTab}
        contentLayout={activeTab === "details" ? "flush" : "default"}
        contentClassName=""
        tabBar={<TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />}
        headerMeta={
          <div className="flex flex-wrap gap-2">
            <StatusPill kind="workStatus" value={status} />
            <Pill color={catalogColor(catalogs.entries, "priority", priority)}>{catalogLabel(catalogs.entries, "priority", priority)}</Pill>
          </div>
        }
      >
        {ticket && detail.loading ? <TaskListSkeleton /> : null}
        {ticket && detail.error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{detail.error}</div>
        ) : null}

        {activeTab === "details" ? (
          <div className="flex min-h-0 w-full flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-2.5">
              <div className="flex min-h-full flex-col gap-4 w-full">
                <Section className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-4">
                    <FormField label="Titel" required>
                      <Input value={ticketTitle} onChange={(event) => setTicketTitle(event.target.value)} onBlur={af} required autoFocus={!ticket} />
                    </FormField>
                    <FormField label="Beschreibung" fill>
                      <RichTextInlineField value={description} placeholder="Beschreibung" fill minRows={12} testIdPrefix="ticket-description" onImageUpload={uploadContentImage} onChange={(v) => { setDescription(v); formStateRef.current = { ...formStateRef.current, description: v }; af?.(); }} />
                    </FormField>
                  </div>
                </Section>
              </div>
            </div>
            <FormSidebar storageKey="ticket-form-sidebar">
              {showParentContexts ? <ParentContextField parents={currentTicket?.parentContexts} /> : null}
              <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="workStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
              <CatalogSelect label="Typ" icon={<SlidersHorizontal size={14} />} variant="panel" kind="ticketType" value={type} onChange={(v) => { setType(v); formStateRef.current = { ...formStateRef.current, type: v }; af?.(); }} />
              <CatalogSelect label="Priorität" icon={<Flag size={14} />} variant="panel" kind="priority" value={priority} onChange={(v) => { setPriority(v); formStateRef.current = { ...formStateRef.current, priority: v }; af?.(); }} />
              {statusClosed ? (
                <Select
                  label="Lösung"
                  icon={<ListChecks size={14} />}
                  variant="panel"
                  value={resolution}
                  onChange={(e) => { const v = e.target.value as TicketResolution; setResolution(v); formStateRef.current = { ...formStateRef.current, resolution: v }; af?.(); }}
                >
                  {resolutionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              ) : null}
              <DatePicker label="Fällig" variant="panel" value={dueDate} onChange={(event) => { const v = event.target.value; setDueDate(v); formStateRef.current = { ...formStateRef.current, dueDate: v }; af?.(); }} />
              <UserSelectField
                label="Zuständig"
                icon={<Users size={14} />}
                variant="panel"
                value={responsibleUserId}
                selectedUser={currentTicket?.responsibleUser ?? null}
                onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }}
              />
              <UserSelectField
                label="Meldende Person"
                icon={<UserRound size={14} />}
                variant="panel"
                value={reporterUserId}
                selectedUser={currentTicket?.reporterUser ?? null}
                onChange={(v) => { setReporterUserId(v); formStateRef.current = { ...formStateRef.current, reporterUserId: v }; af?.(); }}
              />
              {type === "bug" ? (
                <>
                  <FormField label="Umgebung" icon={<Activity size={14} />} variant="panel">
                    <Input value={environment} onChange={(event) => setEnvironment(event.target.value)} onBlur={af} />
                  </FormField>
                  <FormField label="Betroffene Version" icon={<History size={14} />} variant="panel">
                    <Input value={affectedVersion} onChange={(event) => setAffectedVersion(event.target.value)} onBlur={af} />
                  </FormField>
                </>
              ) : null}
              <TagPicker selected={selectedTags} onChange={(v) => { setSelectedTags(v); formStateRef.current = { ...formStateRef.current, selectedTags: v }; af?.(); }} domain="pm" variant="panel" />
            </FormSidebar>
          </div>
        ) : null}

        {activeTab === "subTickets" ? (
          <Section>
            {ticket && loadedTicket ? (
              <div className="grid gap-4">
                <div className="flex justify-end">
                  <Button variant="primary" icon={<GitBranch size={16} />} onClick={() => setSubTicketDraftOpen(true)}>
                    Neu
                  </Button>
                </div>
                {loadedTicket.subTickets.length > 0 ? (
                  <div className="grid gap-3">
                    {loadedTicket.subTickets.map((subTicket) => (
                      <TicketCard
                        key={subTicket.id}
                        ticket={subTicket}
                        variant="row"
                        onOpen={(item) => onOpenTicket?.(item)}
                        onMove={setMovingSubTicket}
                        onDelete={async (item) => {
                          try {
                            await detail.removeSubTicket(item.id);
                            await detail.reload();
                            await onChanged?.();
                            showToast({ tone: "success", title: "Sub-Ticket gelöscht" });
                          } catch (ticketError) {
                            showToast({ tone: "error", title: "Sub-Ticket konnte nicht gelöscht werden", message: errorMessage(ticketError) });
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <PendingRelationList
                    existingItems={[]}
                    draftItems={[]}
                    emptyIcon={<GitBranch size={22} />}
                    emptyTitle="Keine Sub-Tickets"
                    showLinkExisting={false}
                    showCreateNew={false}
                    onRemoveExisting={() => undefined}
                    onRemoveDraft={() => undefined}
                  />
                )}
              </div>
            ) : (
              <PendingRelationList
                existingItems={[]}
                draftItems={pendingSubTickets.map((subTicket) => ({ title: subTicket.title, badge: "Wird erstellt" }))}
                emptyIcon={<GitBranch size={22} />}
                emptyTitle="Keine Sub-Tickets vorgemerkt"
                showLinkExisting={false}
                onCreateNew={() => setSubTicketDraftOpen(true)}
                onRemoveExisting={() => undefined}
                onRemoveDraft={(index) => setPendingSubTickets((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "relations" ? (
          ticket && loadedTicket ? (
            <TicketRelationPanel
              currentTicketId={ticket.id}
              tickets={availableRelationTickets}
              relations={loadedTicket.relations}
              onAdd={async (input) => {
                try {
                  await detail.addRelation(input);
                  await detail.reload();
                  showToast({ tone: "success", title: "Relation erstellt" });
                } catch (relationError) {
                  showToast({ tone: "error", title: "Relation konnte nicht erstellt werden", message: errorMessage(relationError) });
                  throw relationError;
                }
              }}
              onRemove={async (input) => {
                try {
                  await detail.removeRelation(input);
                  await detail.reload();
                  showToast({ tone: "success", title: "Relation entfernt" });
                } catch (relationError) {
                  showToast({ tone: "error", title: "Relation konnte nicht entfernt werden", message: errorMessage(relationError) });
                  throw relationError;
                }
              }}
              onOpen={(item) => onOpenTicket?.(item)}
            />
          ) : (
            <Section>
              <PendingRelationList
                existingItems={pendingRelations.map((relation) => ({
                  id: relation.ticket.id,
                  title: relation.ticket.title,
                  statusLabel: ticketRelationTypeLabels[relation.relationType],
                  statusTone: "violet",
                }))}
                draftItems={[]}
                emptyIcon={<Link2 size={22} />}
                emptyTitle="Keine Relationen vorgemerkt"
                showCreateNew={false}
                showLinkExisting={validOwner !== undefined}
                linkExistingLabel="Relation hinzufügen"
                onLinkExisting={() => setRelationDraftOpen(true)}
                onRemoveExisting={(index) => setPendingRelations((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                onRemoveDraft={() => undefined}
              />
            </Section>
          )
        ) : null}

        {activeTab === "comments" ? (
          <DetailBoardShell>
            {ticket && loadedTicket ? (
              <CommentThread
                comments={loadedTicket.comments}
                entityLabel="Ticket"
                onCreate={async (input) => {
                  try {
                    await detail.createComment(input);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar erstellt" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht erstellt werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
                onUpdate={async (id, input) => {
                  try {
                    await detail.updateComment(id, input);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar gespeichert" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht gespeichert werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await detail.removeComment(id);
                    await detail.reload();
                    showToast({ tone: "success", title: "Kommentar gelöscht" });
                  } catch (commentError) {
                    showToast({ tone: "error", title: "Kommentar konnte nicht gelöscht werden", message: errorMessage(commentError) });
                    throw commentError;
                  }
                }}
              />
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) => setPendingComments((items) => [...items, comment])}
                onUpdate={(index, comment) => setPendingComments((items) => items.map((item, itemIndex) => (itemIndex === index ? comment : item)))}
                onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "notes" ? (
          <DetailBoardShell>
            {ticket ? (
              <>
                <NoteList
                  notes={notes.notes}
                  owner={{ type: "ticket", id: ticket.id }}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onMove={(note, target) => notes.moveNote(note.id, { source: { type: "ticket", id: ticket.id }, target })}
                  onDelete={(note) => {
                    void confirm({
                      title: "Notiz löschen?",
                      body: `Die Notiz "${note.title}" wird entfernt.`,
                      severity: "danger",
                      confirmLabel: "Löschen",
                    }).then((approved) => {
                      if (approved) {
                        void notes
                          .removeNote(note.id)
                          .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                          .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
                      }
                    });
                  }}
                />
                <NoteEditor
                  note={isCreatingNote ? null : editingNote}
                  open={isCreatingNote || Boolean(editingNote)}
                  onSave={notes.updateNote}
                  onCreateNote={handleCreateNote}
                  onClose={() => { setEditingNote(null); setIsCreatingNote(false); }}
                  objectReference={editingNote ? objectReference("note", editingNote.id) : undefined}
                />
              </>
            ) : (
              <PendingNoteList
                notes={pendingNotes}
                onAdd={(note) => setPendingNotes((items) => [...items, note])}
                onRemove={(index) => setPendingNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            {ticket ? (
              <div className="grid gap-4">
                <AttachmentUploader visibilityMode="owner" size="sm" onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onUnlink={attachments.unlinkAttachment}
                  onDeletePermanently={attachments.deleteAttachmentPermanently}
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            ) : (
              <PendingFileList
                files={pendingFiles}
                onAdd={(files) => setPendingFiles((items) => [...items, ...files])}
                onRemove={(index) =>
                  setPendingFiles((items) => {
                    const removed = items[index];
                    if (removed?.previewUrl) {
                      URL.revokeObjectURL(removed.previewUrl);
                    }
                    return items.filter((_, itemIndex) => itemIndex !== index);
                  })
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "journal" && ticket ? (
          <Section fill>
            <JournalPanel objectType="ticket" objectId={ticket.id} />
          </Section>
        ) : null}
      </FormModal>

      <ProjectContextTreeDialog
        open={Boolean(movingSubTicket && ticket)}
        source={ticket ? { type: "ticket", id: ticket.id } : null}
        itemType="ticket"
        itemId={movingSubTicket?.id ?? null}
        onSelect={async (target: MoveTarget) => {
          if (!movingSubTicket || !ticket) return;
          try {
            await detail.moveSubTicket(movingSubTicket.id, { source: { type: "ticket", id: ticket.id }, target, expectedVersion: movingSubTicket.version });
            await detail.reload();
            await onChanged?.();
            showToast({ tone: "success", title: "Ticket verschoben" });
            setMovingSubTicket(null);
          } catch (ticketError) {
            showToast({ tone: "error", title: "Ticket konnte nicht verschoben werden", message: errorMessage(ticketError) });
            throw ticketError;
          }
        }}
        onClose={() => setMovingSubTicket(null)}
      />

      <SubTicketDraftDialog
        open={subTicketDraftOpen}
        onCreate={async (subTicket) => {
          if (ticket) {
            try {
              await detail.createSubTicket(subTicket);
              await detail.reload();
              await onChanged?.();
              showToast({ tone: "success", title: "Sub-Ticket erstellt" });
            } catch (ticketError) {
              showToast({ tone: "error", title: "Sub-Ticket konnte nicht erstellt werden", message: errorMessage(ticketError) });
              throw ticketError;
            }
            return;
          }
          setPendingSubTickets((items) => [...items, subTicket]);
        }}
        onClose={() => setSubTicketDraftOpen(false)}
      />
      <TicketRelationDraftDialog
        open={relationDraftOpen}
        tickets={availableRelationTickets}
        onCreate={(relation) => setPendingRelations((items) => [...items, relation])}
        onClose={() => setRelationDraftOpen(false)}
      />
    </>
  );
}

function SubTicketDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (subTicket: DraftSubTicket) => void | Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();
  const ticketTypeOptions = useMemo(() => catalogEntriesByKind(catalogs.entries, "ticketType"), [catalogs.entries]);

  useEffect(() => {
    if (open && catalogs.entries.length > 0) {
      setType((currentType) => ticketTypeValue(catalogs.entries, currentType));
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    await onCreate({
      title: trimmedTitle,
      type: ticketTypeValue(catalogs.entries, type),
      status: ticketStatusValue(catalogs.entries, status),
      priority: priorityValue(catalogs.entries, priority),
    });
    setTitle("");
    setType(ticketTypeValue(catalogs.entries, "bug"));
    setStatus(ticketStatusValue(catalogs.entries, "open"));
    setPriority(priorityValue(catalogs.entries, "medium"));
    onClose();
  };

  return (
    <FormModal open={open} title="Sub-Ticket vormerken" icon={<GitBranch size={20} />} breadcrumb={["Tickets", "Sub-Ticket"]} submitLabel="Vormerken" onSubmit={submit} onClose={onClose}>
      <Section title="Sub-Ticket">
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <div className="mt-4">
          <Select label="Typ" value={type} onChange={(event) => setType(event.target.value as TicketType)}>
            {ticketTypeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Section>
      <Section title="Status & Priorität">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle kind="workStatus" value={status} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
          </FormField>
        </div>
      </Section>
    </FormModal>
  );
}

function TicketRelationDraftDialog({
  open,
  tickets,
  onCreate,
  onClose,
}: {
  open: boolean;
  tickets: Ticket[];
  onCreate: (relation: PendingTicketRelation) => void;
  onClose: () => void;
}) {
  const [targetTicketId, setTargetTicketId] = useState("");
  const [relationType, setRelationType] = useState<TicketRelationType>("related");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const targetTicket = tickets.find((item) => item.id === Number(targetTicketId));
    if (!targetTicket) {
      return;
    }
    onCreate({ ticket: targetTicket, relationType });
    setTargetTicketId("");
    setRelationType("related");
    onClose();
  };

  return (
    <FormModal open={open} title="Relation vormerken" icon={<Link2 size={20} />} breadcrumb={["Tickets", "Relation"]} submitLabel="Hinzufügen" onSubmit={submit} onClose={onClose}>
      <Section title="Relation">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Ticket" value={targetTicketId} required onChange={(event) => setTargetTicketId(event.target.value)}>
            <option value="">Ticket auswählen</option>
            {tickets.map((item) => (
              <option key={item.id} value={item.id}>
                TICKET-{item.id} · {item.title}
              </option>
            ))}
          </Select>
          <Select label="Typ" value={relationType} onChange={(event) => setRelationType(event.target.value as TicketRelationType)}>
            {relationTypes.map((item) => (
              <option key={item} value={item}>
                {ticketRelationTypeLabels[item]}
              </option>
            ))}
          </Select>
        </div>
      </Section>
    </FormModal>
  );
}
