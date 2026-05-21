// @vitest-environment jsdom

/**
 * Test Scope:
 * DetailModal
 *
 * Abgedeckte Regeln:
 * - Page-Detailansichten halten TabBar und Footer außerhalb des scrollbaren Inhaltsbereichs.
 * - Modal-Detailansichten behalten ihren internen Scrollbereich.
 *
 * Fehlerfälle:
 * - Die Modal-Variante darf nicht versehentlich Page-Sticky-Klassen erhalten.
 *
 * Ziel:
 * Absichern, dass die Detail-Shell dasselbe Page-Verhalten wie FormModal nutzt, ohne Modal-Layouts zu verändern.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailModal } from "../../../../../apps/web/src/components/ui/DetailModal";
import type { Tab } from "../../../../../apps/web/src/components/ui/TabBar";

type TestTab = "details" | "comments";

const tabs: Array<Tab<TestTab>> = [
  { value: "details", label: "Details" },
  { value: "comments", label: "Kommentare", count: 2 }
];

afterEach(() => {
  cleanup();
});

describe("DetailModal", () => {
  it("rendert die Page-Variante mit festem TabBar-/Footer-Bereich", () => {
    render(
      <DetailModal open title="Ticket" variant="page" tabs={tabs} activeTab="details" onTabChange={vi.fn()} onClose={vi.fn()} footer={<button type="button">Bearbeiten</button>}>
        <section data-testid="detail-body">Inhalt</section>
      </DetailModal>
    );

    const tabWrapper = screen.getByRole("button", { name: "Details" }).closest("nav")?.parentElement;
    const main = screen.getByTestId("detail-body").closest("main");
    const footer = screen.getByRole("button", { name: "Bearbeiten" }).closest("footer");

    expect(screen.getByRole("heading", { name: "Ticket" }).closest("header")).not.toHaveClass("rounded-t-2xl");
    expect(tabWrapper).toHaveClass("shrink-0", "shadow-sm");
    expect(tabWrapper).not.toHaveClass("sticky");
    expect(main).toHaveClass("flex", "min-h-0", "flex-1", "flex-col", "overflow-auto");
    expect(main).not.toHaveClass("pb-24");
    expect(footer).toHaveClass("shrink-0");
    expect(footer).not.toHaveClass("sticky");
    expect(footer).not.toHaveClass("rounded-b-2xl");
  });

  it("behält in der Modal-Variante das bestehende Scrollmodell", () => {
    render(
      <DetailModal open title="Ticket" tabs={tabs} activeTab="details" onTabChange={vi.fn()} onClose={vi.fn()} footer={<button type="button">Bearbeiten</button>}>
        <section data-testid="detail-body">Inhalt</section>
      </DetailModal>
    );

    const tabWrapper = screen.getByRole("button", { name: "Details" }).closest("nav")?.parentElement;
    const main = screen.getByTestId("detail-body").closest("main");
    const footer = screen.getByRole("button", { name: "Bearbeiten" }).closest("footer");

    expect(screen.getByRole("heading", { name: "Ticket" }).closest("header")).toHaveClass("shrink-0");
    expect(tabWrapper).toHaveClass("shrink-0");
    expect(tabWrapper).not.toHaveClass("sticky");
    expect(main).toHaveClass("min-h-0", "flex-1", "overflow-auto");
    expect(footer).toHaveClass("shrink-0");
    expect(footer).not.toHaveClass("sticky");
  });
});
