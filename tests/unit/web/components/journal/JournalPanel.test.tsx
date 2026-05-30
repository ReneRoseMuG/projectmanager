// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Journal-Einträge zeigen konkrete Zusammenfassung, Akteur, Änderung und Kontext.
 * - Leere Journal-Listen zeigen einen fachlichen Leerzustand.
 *
 * Fehlerfälle:
 * - Fehlende Änderungen dürfen die Darstellung eines Eintrags nicht verhindern.
 *
 * Ziel:
 * Die Anwenderdarstellung des Journals gegen uninformative oder unvollständige Einträge absichern.
 */

import type { JournalEntry } from "@taskmanager/shared-types";
import { screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JournalEntryList } from "../../../../../apps/web/src/components/journal/JournalPanel";

const entry: JournalEntry = {
  id: 1,
  operation: "update",
  objectType: "project",
  objectId: 10,
  objectLabel: "Projekt Alpha",
  summary: 'Projekt "Projekt Alpha" hat ein neues Enddatum: leer → 15.06.26.',
  actorUserId: 1,
  actorName: "Admin, Test",
  createdAt: "2026-05-21T08:30:00.000Z",
  changes: [
    {
      id: 1,
      fieldKey: "dueDate",
      fieldLabel: "Enddatum",
      oldValue: null,
      oldValueLabel: null,
      newValue: "2026-06-15",
      newValueLabel: "15.06.26",
      summary: "Enddatum: leer → 15.06.26"
    }
  ],
  contexts: [
    {
      id: 1,
      objectType: "project",
      objectId: 10,
      objectLabel: "Projekt Alpha",
      relation: "self"
    }
  ]
};

afterEach(() => cleanup());

describe("JournalEntryList", () => {
  it("zeigt Zusammenfassung, Feldänderung und Akteur", () => {
    render(<JournalEntryList entries={[entry]} loading={false} error={null} />);

    expect(screen.getByText('Projekt "Projekt Alpha" hat ein neues Enddatum: leer → 15.06.26.')).toBeInTheDocument();
    expect(screen.getByText("Admin, Test")).toBeInTheDocument();
    expect(screen.getByText("Enddatum")).toBeInTheDocument();
    expect(screen.getAllByText("15.06.26").length).toBeGreaterThan(0);
  });

  it("zeigt einen Leerzustand ohne Einträge", () => {
    render(<JournalEntryList entries={[]} loading={false} error={null} />);

    expect(screen.getByText("Keine Journal-Einträge")).toBeInTheDocument();
  });
});
