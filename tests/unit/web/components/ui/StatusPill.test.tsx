// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - StatusPill nutzt domänenspezifische Farbtöne pro Status-Katalog.
 * - Geschlossene Katalogeinträge überschreiben die statische Farbzuordnung.
 *
 * Fehlerfälle:
 * - Unbekannte offene Status dürfen nicht fehlschlagen und fallen auf den offenen Standardton zurück.
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
): CatalogEntry {
  return {
    id: entries.length + 1,
    kind,
    key,
    label,
    sortOrder: entries.length + 1,
    isClosed,
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
  it("rendert in_progress als orangefarbenen Arbeitsstatus", () => {
    entries = [catalogEntry("in_progress", "In Arbeit")];

    render(<StatusPill kind="workStatus" value="in_progress" />);

    expect(screen.getByText("In Arbeit")).toHaveClass("bg-tangerine");
  });

  it("rendert in_review als gelben Arbeitsstatus", () => {
    entries = [catalogEntry("in_review", "In Prüfung")];

    render(<StatusPill kind="workStatus" value="in_review" />);

    expect(screen.getByText("In Prüfung")).toHaveClass("bg-mustard");
  });

  it("priorisiert geschlossene Katalogeinträge vor statischen Farbtönen", () => {
    entries = [catalogEntry("open", "Offen geschlossen", true)];

    render(<StatusPill kind="workStatus" value="open" />);

    expect(screen.getByText("Offen geschlossen")).toHaveClass("bg-steel-500");
  });

  it("unterscheidet active nach Katalogart", () => {
    entries = [catalogEntry("active", "Aktiv", false, "featureStatus")];

    render(<StatusPill kind="featureStatus" value="active" />);

    expect(screen.getByText("Aktiv")).toHaveClass("bg-tangerine");
  });

  it("fällt für unbekannte offene Status auf Grün zurück", () => {
    render(<StatusPill kind="workStatus" value="custom_status" />);

    expect(screen.getByText("custom_status")).toHaveClass("bg-fern");
  });
});
