// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - StatusPill nutzt die Farbe des jeweiligen Status-Katalogeintrags.
 *
 * Fehlerfälle:
 * - Unbekannte Status dürfen nicht fehlschlagen und fallen auf den Standardton zurück.
 *
 * Ziel:
 * Die visuelle Status-Semantik gegen Regressionen bei Katalog- und Fallback-Status absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { CatalogEntry } from "@taskmanager/shared-types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusPill } from "../../../../../apps/web/src/components/ui/StatusPill";

let entries: CatalogEntry[] = [];

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries,
      workStatuses: entries.filter((entry) => entry.kind === "workStatus"),
      featureStatuses: entries.filter(
        (entry) => entry.kind === "featureStatus",
      ),
      priorities: [],
      ticketTypes: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined,
    };
  },
}));

function catalogEntry(
  key: string,
  label: string,
  isClosed = false,
  kind: CatalogEntry["kind"] = "workStatus",
  color = "var(--color-fern)",
): CatalogEntry {
  return {
    id: entries.length + 1,
    kind,
    key,
    label,
    sortOrder: entries.length + 1,
    isClosed,
    color,
    version: 1,
    createdAt: "2026-05-21T08:00:00.000Z",
    updatedAt: "2026-05-21T08:00:00.000Z",
  };
}

afterEach(() => {
  cleanup();
  entries = [];
});

describe("StatusPill", () => {
  it("rendert in_progress mit der Katalogfarbe", () => {
    entries = [catalogEntry("in_progress", "In Arbeit", false, "workStatus", "var(--color-tangerine)")];

    render(<StatusPill kind="workStatus" value="in_progress" />);

    expect(screen.getByText("In Arbeit").getAttribute("style")).toContain("var(--color-tangerine)");
  });

  it("rendert in_review mit der Katalogfarbe", () => {
    entries = [catalogEntry("in_review", "In Prüfung", false, "workStatus", "var(--color-mustard)")];

    render(<StatusPill kind="workStatus" value="in_review" />);

    expect(screen.getByText("In Prüfung").getAttribute("style")).toContain("var(--color-mustard)");
  });

  it("nutzt auch für geschlossene Katalogeinträge deren gespeicherte Farbe", () => {
    entries = [catalogEntry("open", "Offen geschlossen", true, "workStatus", "var(--color-steel-500)")];

    render(<StatusPill kind="workStatus" value="open" />);

    expect(screen.getByText("Offen geschlossen").getAttribute("style")).toContain("var(--color-steel-500)");
  });

  it("unterscheidet active nach Katalogart", () => {
    entries = [catalogEntry("active", "Aktiv", false, "featureStatus", "var(--color-tangerine)")];

    render(<StatusPill kind="featureStatus" value="active" />);

    expect(screen.getByText("Aktiv").getAttribute("style")).toContain("var(--color-tangerine)");
  });

  it("fällt für unbekannte Status auf den Standardton zurück", () => {
    render(<StatusPill kind="workStatus" value="custom_status" />);

    expect(screen.getByText("custom_status")).toHaveClass("bg-steel-500");
  });
});
