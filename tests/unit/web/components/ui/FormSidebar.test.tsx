// @vitest-environment jsdom

/**
 * Test Scope:
 * FormSidebar
 *
 * Abgedeckte Regeln:
 * - Die Stammdaten-Sidebar rendert Inhalt, Collapse-Zustand und gespeicherte Breite.
 * - Mobile Viewports starten kollabiert.
 * - Drag-Resize bleibt innerhalb der erlaubten Breiten.
 *
 * Fehlerfälle:
 * - Ungültige Breiten dürfen die Sidebar nicht außerhalb der Grenzen vergrößern.
 *
 * Ziel:
 * Die gemeinsame Sidebar gegen Layout- und Persistenzregressionen absichern.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormSidebar } from "../../../../../apps/web/src/components/ui/FormSidebar";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 767px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeEach(() => {
  window.localStorage.clear();
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FormSidebar", () => {
  it("rendert Inhalt mit gespeicherter Breite", () => {
    window.localStorage.setItem("project-sidebar-width", "180");

    render(
      <FormSidebar storageKey="project-sidebar">
        <div>Metadaten</div>
      </FormSidebar>
    );

    expect(screen.getByTestId("form-sidebar")).toHaveStyle({ width: "180px" });
    expect(screen.getByText("Metadaten")).toBeInTheDocument();
  });

  it("kollabiert und persistiert den Zustand", () => {
    vi.useFakeTimers();

    render(
      <FormSidebar storageKey="task-sidebar">
        <div>Metadaten</div>
      </FormSidebar>
    );

    fireEvent.click(screen.getByRole("button", { name: "Stammdaten schließen" }));
    vi.advanceTimersByTime(350);

    expect(screen.getByTestId("form-sidebar")).toHaveStyle({ width: "32px" });
    expect(window.localStorage.getItem("task-sidebar-collapsed")).toBe("true");
  });

  it("startet auf schmalem Viewport kollabiert", () => {
    mockMatchMedia(true);

    render(
      <FormSidebar storageKey="mobile-sidebar">
        <div>Metadaten</div>
      </FormSidebar>
    );

    expect(screen.getByTestId("form-sidebar")).toHaveStyle({ width: "32px" });
    expect(screen.getByText("Stammdaten")).toBeInTheDocument();
  });

  it("begrenzt Drag-Resize auf die maximale Breite", () => {
    render(
      <FormSidebar storageKey="resize-sidebar">
        <div>Metadaten</div>
      </FormSidebar>
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "Sidebar-Breite ändern" }), { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 100 });
    fireEvent.mouseUp(window);

    expect(screen.getByTestId("form-sidebar")).toHaveStyle({ width: "340px" });
  });

  it("begrenzt Drag-Resize auf die minimale Breite", () => {
    window.localStorage.setItem("resize-min-sidebar-width", "220");

    render(
      <FormSidebar storageKey="resize-min-sidebar">
        <div>Metadaten</div>
      </FormSidebar>
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "Sidebar-Breite ändern" }), { clientX: 200 });
    fireEvent.mouseMove(window, { clientX: 500 });
    fireEvent.mouseUp(window);

    expect(screen.getByTestId("form-sidebar")).toHaveStyle({ width: "160px" });
  });
});
