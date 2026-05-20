// @vitest-environment jsdom

/**
 * Test Scope:
 * FormModal
 *
 * Abgedeckte Regeln:
 * - Page-Formulare rendern TabBar und Footer sticky außerhalb des Inhaltsbereichs.
 * - Modal-Formulare behalten ihren begrenzten internen Scrollbereich.
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
import { FormModal } from "../FormModal";

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
  it("rendert die Page-Variante mit sticky TabBar und sticky Footer", () => {
    const { form } = renderFormModal(
      <FormModal open title="Projekt bearbeiten" variant="page" onClose={vi.fn()} onSubmit={vi.fn()} tabBar={<nav data-testid="tab-bar">Tabs</nav>}>
        <section data-testid="form-body">Inhalt</section>
      </FormModal>
    );

    const tabWrapper = screen.getByTestId("tab-bar").parentElement;
    const bodyWrapper = screen.getByTestId("form-body").parentElement;
    const footer = form.querySelector("footer");

    expect(form).toHaveClass("min-h-[calc(100dvh-4rem)]");
    expect(form.querySelector("header")).toHaveClass("rounded-t-2xl");
    expect(tabWrapper).toHaveClass("sticky", "top-[-1rem]", "z-20", "shadow-sm", "md:top-[-1.5rem]");
    expect(bodyWrapper).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(bodyWrapper).not.toHaveClass("pb-24");
    expect(bodyWrapper).not.toHaveClass("overflow-auto");
    expect(footer).toHaveClass("sticky", "bottom-[-1rem]", "z-10", "rounded-b-2xl", "md:bottom-[-1.5rem]");
    expect(tabWrapper?.nextElementSibling).toBe(bodyWrapper);
  });

  it("behält in der Modal-Variante den internen Scrollbereich", () => {
    const { form } = renderFormModal(
      <FormModal open title="Projekt bearbeiten" onClose={vi.fn()} onSubmit={vi.fn()} tabBar={<nav data-testid="tab-bar">Tabs</nav>}>
        <section data-testid="form-body">Inhalt</section>
      </FormModal>
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
