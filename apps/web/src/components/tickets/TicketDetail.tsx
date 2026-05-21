import type { Note, Ticket } from "@taskmanager/shared-types";
import { CalendarDays, Edit3, Paperclip, Plus, StickyNote, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setTicketTags } from "../../api/tickets";
import { useAttachments } from "../../hooks/useAttachments";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { errorMessage } from "../../hooks/errors";
import { useNotes } from "../../hooks/useNotes";
import { useTicketDetail } from "../../hooks/useTicketDetail";
import { useTickets } from "../../hooks/useTickets";
import { catalogLabel, countOpenStatusItems } from "../../utils/catalogs";
import { formatHumanDate } from "../../utils/date";
import {
  priorityPillTones,
  ticketResolutionLabels,
  ticketTypeLabels
} from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { JournalPanel } from "../journal/JournalPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { DetailModal } from "../ui/DetailModal";
import { FormField } from "../ui/FormField";
import { Pill } from "../ui/Pill";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { useToast } from "../ui/ToastProvider";
import { TicketCard } from "./TicketCard";
import { TicketForm, type TicketFormInput } from "./TicketForm";
import { TicketRelationPanel } from "./TicketRelationPanel";
import { useHasPermission } from "../../hooks/usePermissions";

interface TicketDetailProps {
  ticketId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  variant?: "modal" | "page";
}

type DetailTab = "details" | "subTickets" | "relations" | "comments" | "notes" | "attachments" | "journal";

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "subTickets", label: "Sub-Tickets" },
  { value: "relations", label: "Relationen" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" }
];

export function TicketDetail({ ticketId, open, onClose, onChanged, variant = "modal" }: TicketDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const detail = useTicketDetail(open ? ticketId : null);
  const allTickets = useTickets(open ? undefined : null);
  const catalogs = useCatalogs();
  const comments = useEntityComments("ticket", open ? ticketId : null);
  const notes = useNotes(ticketId && open ? { type: "ticket", id: ticketId } : null);
  const attachments = useAttachments(ticketId && open ? { type: "ticket", id: ticketId } : null);
  const canReadJournal = useHasPermission("journal", "read");
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [formOpen, setFormOpen] = useState(false);
  const [subTicketFormOpen, setSubTicketFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const returnTo = `${location.pathname}${location.search}`;
  const openTicketPage = (targetTicket: Ticket) => navigate(`/tickets/${targetTicket.id}?returnTo=${encodeURIComponent(returnTo)}`);

  if (!open) {
    return null;
  }

  const ticket = detail.ticket;
  const counts: Partial<Record<DetailTab, number>> = {
    subTickets: countOpenStatusItems(ticket?.subTickets ?? [], catalogs.entries, "workStatus"),
    relations: ticket?.relations.length ?? 0,
    comments: comments.comments.length,
    notes: notes.notes.length,
    attachments: attachments.attachments.length
  };
  const visibleTabs = ticket ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal) : tabs.filter((tab) => tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    const count = counts[tab.value];
    return typeof count === "number" ? { ...tab, count } : tab;
  });

  const saveTicket = async (input: TicketFormInput) => {
    if (!ticket) {
      return;
    }
    const { tagIds, ...ticketInput } = input;
    try {
      await detail.updateTicket({ ...ticketInput, expectedVersion: ticket.version });
      await setTicketTags(ticket.id, tagIds);
      await detail.reload();
      await onChanged();
      showToast({ tone: "success", title: "Ticket gespeichert" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Ticket konnte nicht gespeichert werden", message: errorMessage(ticketError) });
      throw ticketError;
    }
  };

  const createSubTicket = async (input: TicketFormInput) => {
    const { tagIds, ...ticketInput } = input;
    try {
      const created = await detail.createSubTicket(ticketInput);
      if (created && tagIds.length > 0) {
        await setTicketTags(created.id, tagIds);
      }
      await detail.reload();
      await onChanged();
      showToast({ tone: "success", title: "Sub-Ticket erstellt" });
    } catch (ticketError) {
      showToast({ tone: "error", title: "Sub-Ticket konnte nicht erstellt werden", message: errorMessage(ticketError) });
      throw ticketError;
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht hochgeladen werden", message: errorMessage(attachmentError) });
      throw attachmentError;
    }
  };

  const createNote = async () => {
    try {
      const note = await notes.createNote({ title: "Ohne Titel", contentJson: {} });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht erstellt werden", message: errorMessage(noteError) });
    }
  };

  return (
    <DetailModal
      open={open}
      title={ticket?.title ?? "Ticket"}
      subtitle={ticket ? `TICKET-${ticket.id}` : undefined}
      breadcrumb={ticket ? ["Tickets", `TICKET-${ticket.id}`] : ["Tickets"]}
      tabs={tabItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      variant={variant}
      metaPills={
        ticket ? (
          <>
            <StatusPill kind="workStatus" value={ticket.status} />
            <Pill tone={priorityPillTones[ticket.priority] ?? "steel"}>{catalogLabel(catalogs.entries, "priority", ticket.priority)}</Pill>
          </>
        ) : null
      }
      metaInfo={
        ticket ? (
          <>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
              <CalendarDays size={13} />
              {ticket.dueDate ? formatHumanDate(ticket.dueDate) : "Kein Datum"}
            </span>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/85">
              <UserRound size={13} />
              {ticket.assignee || "Nicht zugewiesen"}
            </span>
          </>
        ) : null
      }
      footer={
        ticket && activeTab === "details" ? (
          <Button variant="primary" icon={<Edit3 size={16} />} onClick={() => setFormOpen(true)}>
            Bearbeiten
          </Button>
        ) : undefined
      }
    >
      {detail.loading ? (
        <TaskListSkeleton />
      ) : ticket ? (
        <>
          {activeTab === "details" ? <TicketReadOnlyDetails ticket={ticket} /> : null}

          {activeTab === "subTickets" ? (
            <Section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionHeader title="Sub-Tickets" />
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setSubTicketFormOpen(true)}>
                  Neu
                </Button>
              </div>
              <div className="grid gap-3">
                {ticket.subTickets.map((subTicket) => (
                  <TicketCard key={subTicket.id} ticket={subTicket} variant="row" onOpen={openTicketPage} onDelete={(item) => void detail.removeSubTicket(item.id)} />
                ))}
              </div>
            </Section>
          ) : null}

          {activeTab === "relations" ? (
            <TicketRelationPanel
              currentTicketId={ticket.id}
              tickets={allTickets.tickets}
              relations={ticket.relations}
              onAdd={async (input) => {
                await detail.addRelation(input);
                showToast({ tone: "success", title: "Relation erstellt" });
              }}
              onRemove={async (input) => {
                await detail.removeRelation(input);
                showToast({ tone: "success", title: "Relation entfernt" });
              }}
              onOpen={openTicketPage}
            />
          ) : null}

          {activeTab === "comments" ? (
            <CommentThread
              comments={comments.comments}
              entityLabel="Ticket"
              onCreate={async (input) => {
                await comments.createComment(input);
                showToast({ tone: "success", title: "Kommentar erstellt" });
              }}
              onDelete={async (id) => {
                await comments.removeComment(id);
                showToast({ tone: "success", title: "Kommentar gelöscht" });
              }}
            />
          ) : null}

          {activeTab === "notes" ? (
            <Section>
              <div className="mb-4 flex items-center gap-2">
                <StickyNote size={18} className="text-fern" />
                <SectionHeader title="Notizen" />
              </div>
              <NoteList
                notes={notes.notes}
                onCreate={createNote}
                onEdit={setEditingNote}
                onDelete={(note) => {
                  void confirm({
                    title: "Notiz löschen?",
                    body: `Die Notiz "${note.title}" wird entfernt.`,
                    severity: "danger",
                    confirmLabel: "Löschen"
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
              <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
            </Section>
          ) : null}

          {activeTab === "attachments" ? (
            <Section>
              <div className="mb-4 flex items-center gap-2">
                <Paperclip size={18} className="text-fern" />
                <SectionHeader title="Dateien" />
              </div>
              <div className="grid gap-4">
                <AttachmentUploader size="sm" onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onDelete={(attachment) => {
                    void confirm({
                      title: "Datei löschen?",
                      body: attachment.originalName,
                      severity: "danger",
                      confirmLabel: "Löschen"
                    }).then((approved) => {
                      if (approved) {
                        void attachments
                          .removeAttachment(attachment.id)
                          .then(() => showToast({ tone: "success", title: "Datei gelöscht" }))
                          .catch((attachmentError: unknown) =>
                            showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) })
                          );
                      }
                    });
                  }}
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            </Section>
          ) : null}

          {activeTab === "journal" ? (
            <Section title="Journal" fill>
              <JournalPanel objectType="ticket" objectId={ticket.id} />
            </Section>
          ) : null}

          <TicketForm open={formOpen} ticket={ticket} onSubmit={saveTicket} onClose={() => setFormOpen(false)} />
          <TicketForm open={subTicketFormOpen} title="Sub-Ticket" onSubmit={createSubTicket} onClose={() => setSubTicketFormOpen(false)} />
        </>
      ) : (
        <div className="p-8 text-center text-sm text-slate-600">{detail.error ?? "Nicht gefunden"}</div>
      )}
    </DetailModal>
  );
}

function TicketReadOnlyDetails({ ticket }: { ticket: Ticket }) {
  const catalogs = useCatalogs();
  const description = richTextToPlainText(ticket.description);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-4">
        <Section title="Basisdaten">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadonlyField label="Typ" value={ticketTypeLabels[ticket.type]} />
            <ReadonlyField label="Status" value={catalogLabel(catalogs.entries, "workStatus", ticket.status)} />
            {description ? <ReadonlyField label="Beschreibung" value={description} wide /> : null}
          </div>
        </Section>
        <Section title="Ticket-Details">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadonlyField label="Lösung" value={ticket.resolution ? ticketResolutionLabels[ticket.resolution] : "Keine"} />
            <ReadonlyField label="Umgebung" value={ticket.environment || "Nicht gepflegt"} />
            <ReadonlyField label="Betroffene Version" value={ticket.affectedVersion || "Nicht gepflegt"} />
          </div>
        </Section>
      </div>
      <aside className="grid content-start gap-4">
        <Section title="Zuweisung">
          <div className="grid gap-3">
            <ReadonlyField label="Zuständig" value={ticket.assignee || "Nicht zugewiesen"} />
            <ReadonlyField label="Reporter" value={ticket.reporter || "Nicht gepflegt"} />
            <ReadonlyField label="Fällig" value={ticket.dueDate ? formatHumanDate(ticket.dueDate) : "Kein Datum"} />
            <ReadonlyField label="Gelöst am" value={ticket.resolvedAt ? formatHumanDate(ticket.resolvedAt) : "Nicht gelöst"} />
          </div>
        </Section>
      </aside>
    </div>
  );
}

function ReadonlyField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <FormField label={label} className={wide ? "md:col-span-2" : ""}>
      <div className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">{value}</div>
    </FormField>
  );
}
