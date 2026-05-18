import type { Ticket, TicketRelationEntry, TicketRelationInput, TicketRelationType } from "@taskmanager/shared-types";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ticketRelationTypeLabels } from "../../utils/domainLabels";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { Section } from "../ui/Section";
import { TicketCard } from "./TicketCard";

interface TicketRelationPanelProps {
  currentTicketId: number;
  tickets: Ticket[];
  relations: TicketRelationEntry[];
  onAdd: (input: TicketRelationInput) => Promise<void>;
  onRemove: (input: TicketRelationInput) => Promise<void>;
}

const relationTypes = ["blocks", "related", "duplicate"] as TicketRelationType[];

export function TicketRelationPanel({ currentTicketId, tickets, relations, onAdd, onRemove }: TicketRelationPanelProps) {
  const [targetTicketId, setTargetTicketId] = useState("");
  const [relationType, setRelationType] = useState<TicketRelationType>("related");
  const [saving, setSaving] = useState(false);

  const availableTickets = useMemo(() => tickets.filter((ticket) => ticket.id !== currentTicketId), [currentTicketId, tickets]);
  const outgoingBlocks = relations.filter((relation) => relation.relationType === "blocks" && relation.direction === "outgoing");
  const incomingBlocks = relations.filter((relation) => relation.relationType === "blocks" && relation.direction === "incoming");
  const related = relations.filter((relation) => relation.relationType === "related" || relation.relationType === "duplicate");

  const addRelation = async () => {
    const parsedTargetId = Number(targetTicketId);
    if (!Number.isFinite(parsedTargetId)) {
      return;
    }
    setSaving(true);
    try {
      await onAdd({ targetTicketId: parsedTargetId, relationType });
      setTargetTicketId("");
      setRelationType("related");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Section title="Relation hinzufügen">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <FormField label="Ticket">
            <select
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
              value={targetTicketId}
              onChange={(event) => setTargetTicketId(event.target.value)}
            >
              <option value="">Ticket auswählen</option>
              {availableTickets.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  TICKET-{ticket.id} · {ticket.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Typ">
            <select
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
              value={relationType}
              onChange={(event) => setRelationType(event.target.value as TicketRelationType)}
            >
              {relationTypes.map((type) => (
                <option key={type} value={type}>
                  {ticketRelationTypeLabels[type]}
                </option>
              ))}
            </select>
          </FormField>
          <Button icon={<Plus size={16} />} variant="primary" disabled={!targetTicketId || saving} onClick={addRelation}>
            Hinzufügen
          </Button>
        </div>
      </Section>

      <RelationSection title="Blockiert" emptyTitle="Keine blockierten Tickets" relations={outgoingBlocks} onRemove={onRemove} />
      <RelationSection title="Blockiert von" emptyTitle="Keine Blocker" relations={incomingBlocks} onRemove={onRemove} />
      <RelationSection title="Verwandt / Duplikat" emptyTitle="Keine weiteren Relationen" relations={related} onRemove={onRemove} />
    </div>
  );
}

function RelationSection({
  title,
  emptyTitle,
  relations,
  onRemove
}: {
  title: string;
  emptyTitle: string;
  relations: TicketRelationEntry[];
  onRemove: (input: TicketRelationInput) => Promise<void>;
}) {
  return (
    <Section title={title}>
      {relations.length === 0 ? <EmptyState icon={<Link2 size={22} />} title={emptyTitle} body="Es sind keine Einträge vorhanden." tone="neutral" variant="tinted" /> : null}
      {relations.length > 0 ? (
        <div className="grid gap-3">
          {relations.map((relation) => (
            <div key={relation.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <TicketCard ticket={relation.ticket} variant="row" onOpen={() => undefined} />
              <Button
                aria-label="Relation entfernen"
                title="Relation entfernen"
                className="h-10 w-10 justify-self-end"
                variant="ghost"
                icon={<Trash2 size={18} />}
                onClick={() => onRemove({ targetTicketId: relation.ticket.id, relationType: relation.relationType })}
              />
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
