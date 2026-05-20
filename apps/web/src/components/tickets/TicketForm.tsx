import type { Priority, Tag, Ticket, TicketInput, TicketResolution, TicketStatus, TicketType } from "@taskmanager/shared-types";
import { Bug, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { resolveCatalogEntryKey } from "../../utils/catalogs";
import { toDateInput } from "../../utils/date";
import { ticketResolutionLabels, ticketTypeLabels } from "../../utils/domainLabels";
import { TagPicker } from "../tags/TagPicker";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { PrioritySelect } from "../ui/PrioritySelect";
import { RadioList } from "../ui/RadioList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { StatusToggle } from "../ui/StatusToggle";

export interface TicketFormInput extends TicketInput {
  resolution?: TicketResolution | null;
  tagIds: number[];
}

interface TicketFormProps {
  open: boolean;
  ticket?: Ticket | null;
  initialStatus?: TicketStatus;
  title?: string;
  onSubmit: (input: TicketFormInput) => Promise<void>;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

type RadioColor = "fern" | "tangerine" | "crimson" | "violet";

const typeColors: Record<TicketType, RadioColor> = {
  bug: "crimson",
  improvement: "fern",
  question: "violet",
  task: "tangerine"
};

const types = (["bug", "improvement", "question", "task"] as TicketType[]).map((value) => ({
  value,
  label: ticketTypeLabels[value],
  activeColor: typeColors[value]
}));

const resolutionOptions = (["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as TicketResolution[]).map((value) => ({
  value,
  label: ticketResolutionLabels[value],
  activeColor: "fern" as RadioColor
}));

export function TicketForm({ open, ticket, initialStatus = "open", title = "Ticket", onSubmit, onClose, variant = "modal", closeOnSubmit = true, onOpenInTab }: TicketFormProps) {
  const catalogs = useCatalogs();
  const [ticketTitle, setTicketTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const [resolution, setResolution] = useState<TicketResolution>("fixed");
  const [assignee, setAssignee] = useState("");
  const [reporter, setReporter] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [environment, setEnvironment] = useState("");
  const [affectedVersion, setAffectedVersion] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

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
    setAssignee(ticket?.assignee ?? "");
    setReporter(ticket?.reporter ?? "");
    setDueDate(toDateInput(ticket?.dueDate));
    setEnvironment(ticket?.environment ?? "");
    setAffectedVersion(ticket?.affectedVersion ?? "");
    setSelectedTags(ticket?.tags ?? []);
  }, [initialStatus, open, ticket]);

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) => resolveCatalogEntryKey(catalogs.entries, "workStatus", currentStatus, "open") ?? "open");
      setPriority((currentPriority) => resolveCatalogEntryKey(catalogs.entries, "priority", currentPriority, "medium") ?? "medium");
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title: ticketTitle,
        description,
        type,
        status: resolveCatalogEntryKey(catalogs.entries, "workStatus", status, "open"),
        priority: resolveCatalogEntryKey(catalogs.entries, "priority", priority, "medium"),
        resolution: status === "resolved" || status === "closed" ? resolution : null,
        reporter,
        assignee,
        environment: type === "bug" ? environment : null,
        affectedVersion: type === "bug" ? affectedVersion : null,
        dueDate: dueDate || null,
        tagIds: selectedTags.map((tag) => tag.id)
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

  return (
    <FormModal
      open={open}
      title={ticket ? "Ticket bearbeiten" : title}
      icon={<Bug size={20} />}
      breadcrumb={["Tickets", ticket ? `TICKET-${ticket.id}` : "Neu"]}
      submitLabel={ticket ? "Speichern" : "Ticket anlegen"}
      saving={saving}
      onSubmit={submit}
      onClose={onClose}
      variant={variant}
      onOpenInTab={onOpenInTab}
    >
      <Section title="Basisdaten">
        <div className="grid gap-4">
          <FormField label="Titel" required>
            <Input value={ticketTitle} onChange={(event) => setTicketTitle(event.target.value)} required autoFocus={!ticket} />
          </FormField>
          <FormField label="Beschreibung">
            <RichTextInlineField value={description} placeholder="Beschreibung" minRows={12} testIdPrefix="ticket-description" onChange={setDescription} />
          </FormField>
        </div>
      </Section>

      <Section title="Typ & Priorität">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Typ">
            <RadioList value={type} options={types} onChange={setType} />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
          </FormField>
        </div>
      </Section>

      <Section title="Status & Lösung">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle kind="workStatus" value={status} onChange={setStatus} />
          </FormField>
          {status === "resolved" || status === "closed" ? (
            <FormField label="Lösung">
              <RadioList value={resolution} options={resolutionOptions} onChange={setResolution} />
            </FormField>
          ) : null}
        </div>
      </Section>

      <Section title="Zuweisung">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Zuständig">
            <Input iconLeft={<UserRound size={16} />} value={assignee} onChange={(event) => setAssignee(event.target.value)} />
          </FormField>
          <FormField label="Reporter">
            <Input iconLeft={<UserRound size={16} />} value={reporter} onChange={(event) => setReporter(event.target.value)} />
          </FormField>
          <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
      </Section>

      {type === "bug" ? (
        <Section title="Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Umgebung">
              <Input value={environment} placeholder="z. B. Production v1.2, Chrome 120" onChange={(event) => setEnvironment(event.target.value)} />
            </FormField>
            <FormField label="Betroffene Version">
              <Input value={affectedVersion} onChange={(event) => setAffectedVersion(event.target.value)} />
            </FormField>
          </div>
        </Section>
      ) : null}

      <Section title="Tags">
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
      </Section>
    </FormModal>
  );
}
