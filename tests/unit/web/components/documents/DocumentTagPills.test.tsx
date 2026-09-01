// @vitest-environment jsdom

/**
 * Test Scope:
 * DMS-Kartentags mit platzsparender und zugänglicher Restauflösung (MS-80 / TASK-503).
 *
 * Test-Ebene:
 * - Unit-Komponententest
 *
 * Realitätsgrad:
 * - Echtes React-Rendering in JSDOM mit realistischen DMS-Tags.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Komponente besitzt keine externen Abhängigkeiten.
 *
 * Isolation:
 * - JSDOM pro Testdatei.
 *
 * Abgedeckte Regeln:
 * - Höchstens drei Tags werden ausgeschrieben.
 * - Farbe und Text sind gemeinsam sichtbar, weitere Tags besitzen Namen und zugängliche Auflösung.
 *
 * Fehlerfälle:
 * - Eine leere Tagliste erhält einen verständlichen zugänglichen Namen.
 *
 * Ziel:
 * Karten bleiben bei vielen Tags kompakt, ohne Taginformation für Tastatur- oder Screenreader-Nutzer zu verlieren.
 */

import type { Tag } from "@taskmanager/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentTagPills } from "../../../../../apps/web/src/components/documents/DocumentTagPills";

const tags: Tag[] = [
  { id: 1, name: "Innenraum", color: "#112233", isSystem: false, domain: "dms", version: 1 },
  { id: 2, name: "Winter", color: "#223344", isSystem: false, domain: "dms", version: 1 },
  { id: 3, name: "Transport", color: "#334455", isSystem: false, domain: "dms", version: 1 },
  { id: 4, name: "Oval Sauna", color: "#445566", isSystem: false, domain: "dms", version: 1 },
  { id: 5, name: "Freigestellt", color: "#556677", isSystem: false, domain: "dms", version: 1 }
];

describe("DocumentTagPills", () => {
  it("zeigt drei Tags und löst die übrigen beiden zugänglich auf", () => {
    render(<DocumentTagPills tags={tags} />);
    expect(screen.getByText("Innenraum")).toBeTruthy();
    expect(screen.getByText("Winter")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
    expect(screen.queryByText("Oval Sauna")).toBeNull();
    expect(screen.getByLabelText("2 weitere Tags: Oval Sauna, Freigestellt")).toHaveTextContent("+2");
  });

  it("kennzeichnet eine leere Tagliste", () => {
    render(<DocumentTagPills tags={[]} />);
    expect(screen.getByLabelText("Keine Dokument-Tags")).toBeTruthy();
  });
});
