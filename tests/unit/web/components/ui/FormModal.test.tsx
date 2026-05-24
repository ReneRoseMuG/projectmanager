// @vitest-environment jsdom

/**
 * Test Scope:
 * FormModal
 *
 * Abgedeckte Regeln:
 * - Page-Formulare halten TabBar und Footer außerhalb des scrollbaren Inhaltsbereichs.
 * - Modal-Formulare behalten ihren begrenzten internen Scrollbereich.
 * - Objekt-Referenzen werden dauerhaft im Hero-Bereich angeboten.
 *
 * Fehlerfälle:
 * - Die TabBar darf nicht im scrollbaren Inhaltsbereich landen.
 *
 * Ziel:
 * Sicherstellen, dass die gemeinsame Formular-Shell Page- und Modal-Layout getrennt behandelt.
 */
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormModal } from "../../../../../apps/web/src/components/ui/FormModal";

function renderFormModal(ui: ReactElement) {
  const result = render(ui);
  const form = document.body.querySelector("form");
  if (!form) {
    throw new Error("FormModal did not render a form.");
  }
  return { ...result, form };
}

afterEach(() => {
  cleanup();
});

describe("FormModal", () => {
  it("rendert die Page-Variante mit festem TabBar-/Footer-Bereich", () => {
    const { form } = renderFormModal(
      <FormModal
        open
        title="Projekt bearbeiten"
        variant="page"
        contentClassName="w-full max-w-7xl self-center"
        breadcrumb={["Projekte", "Alpha"]}
        objectReference="PROJ-42"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        tabBar={<nav data-testid="tab-bar">Tabs</nav>}
      >
        <section data-testid="form-body">Inhalt</section>
      </FormModal>,
    );

    const tabWrapper = screen.getByTestId("tab-bar").parentElement;
    const bodyWrapper = screen.getByTestId("form-body").parentElement;
    const footer = form.querySelector("footer");

    expect(form).toHaveClass("h-full", "min-h-0", "flex-1", "overflow-hidden");
    expect(form).not.toHaveClass("rounded-lg");
    expect(form.querySelector("header")).not.toHaveClass("rounded-t-lg");
    expect(tabWrapper).toHaveClass("shrink-0", "shadow-sm");
    expect(tabWrapper).not.toHaveClass("sticky");
    expect(bodyWrapper).toHaveClass(
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-auto",
    );
    expect(bodyWrapper).toHaveClass("w-full", "max-w-7xl", "self-center");
    expect(bodyWrapper).not.toHaveClass("pb-24");
    expect(footer).toHaveClass("shrink-0");
    expect(footer).not.toHaveClass("sticky");
    expect(tabWrapper?.nextElementSibling).toBe(bodyWrapper);
    expect(screen.getByText("Projekte").closest("div")).toHaveClass("text-white/60");
    expect(screen.getByText("Alpha").closest("div")).toHaveClass("text-white/60");
    expect(screen.getByRole("button", { name: "ID PROJ-42 kopieren" })).toBeInTheDocument();
    expect(form).not.toHaveTextContent("›");
  });

  it("behält in der Modal-Variante den internen Scrollbereich", () => {
    const { form } = renderFormModal(
      <FormModal
        open
        title="Projekt bearbeiten"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        tabBar={<nav data-testid="tab-bar">Tabs</nav>}
      >
        <section data-testid="form-body">Inhalt</section>
      </FormModal>,
    );

    const tabWrapper = screen.getByTestId("tab-bar").parentElement;
    const bodyWrapper = screen.getByTestId("form-body").parentElement;
    const footer = form.querySelector("footer");

    expect(form).toHaveClass("max-h-[calc(100vh-64px)]");
    expect(form.querySelector("header")).toHaveClass("shrink-0");
    expect(tabWrapper).toHaveClass("shrink-0");
    expect(tabWrapper).not.toHaveClass("sticky");
    expect(bodyWrapper).toHaveClass("min-h-0", "flex-1", "overflow-auto");
    expect(footer).toHaveClass("shrink-0");
    expect(footer).not.toHaveClass("sticky");
  });
});
