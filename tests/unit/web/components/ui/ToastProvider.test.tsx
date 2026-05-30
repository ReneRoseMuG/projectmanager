// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte ToastProvider-Komponente mit kleinem Test-Trigger; Settings-Hook als Unit-Grenze ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock für useSetting, damit die Toast-Position ohne TanStack-Provider gezielt variiert werden kann.
 *
 * Isolation:
 * - jsdom ohne Netzwerk, DB oder Dateisystem.
 *
 * Abgedeckte Regeln:
 * - Toasts verwenden für alle erlaubten globalen Positionen die passende Layout-Klasse.
 * - Fehlende oder ungültige Settings fallen auf top-right zurück.
 *
 * Fehlerfälle:
 * - Ungültiger gespeicherter Wert darf keine kaputte Toast-Position erzeugen.
 *
 * Ziel:
 * Die dynamische Toast-Position unabhängig von API und Settings-Persistenz gegen UI-Regressionen absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { ToastPosition } from "@taskmanager/shared-types";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "../../../../../apps/web/src/components/ui/ToastProvider";

const settingsMock = vi.hoisted(() => ({
  toastPosition: "top-right" as unknown
}));

vi.mock("../../../../../apps/web/src/hooks/useSettings", () => ({
  useSetting: () => settingsMock.toastPosition
}));

const expectedClasses: Record<ToastPosition, string[]> = {
  "top-right": ["top-6", "right-6"],
  "top-left": ["top-6", "left-6"],
  "bottom-right": ["bottom-6", "right-6"],
  "bottom-left": ["bottom-6", "left-6"]
};

function ToastTrigger() {
  const { showToast } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        showToast({
          title: "Einstellung gespeichert",
          tone: "success",
          duration: "persistent"
        })
      }
    >
      Toast auslösen
    </button>
  );
}

function renderToast(position: unknown) {
  settingsMock.toastPosition = position;
  render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "Toast auslösen" }));
  return screen.getByRole("status");
}

afterEach(() => {
  cleanup();
  settingsMock.toastPosition = "top-right";
});

describe("ToastProvider", () => {
  it.each(Object.entries(expectedClasses) as Array<[ToastPosition, string[]]>)("positioniert Toasts für %s", (position, classes) => {
    const status = renderToast(position);

    expect(screen.getByText("Einstellung gespeichert")).toBeInTheDocument();
    expect(status).toHaveClass(...classes);
  });

  it.each([undefined, "center"])("fällt bei ungültiger Position %s auf top-right zurück", (position) => {
    const status = renderToast(position);

    expect(status).toHaveClass("top-6", "right-6");
  });
});
