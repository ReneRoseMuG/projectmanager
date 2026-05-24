// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Copy-Button schreibt den Objektbezeichner in die Zwischenablage.
 * - Erfolgreiches Kopieren wird kurz direkt am Icon sichtbar.
 *
 * Fehlerfälle:
 * - Der Button darf keine umgebenden Karten- oder Zeilenaktionen auslösen.
 *
 * Ziel:
 * Die gemeinsame ID-kopieren-Interaktion ist ohne Toast gegen Regressionen abgesichert.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyReferenceButton } from "../../../../../apps/web/src/components/ui/CopyReferenceButton";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CopyReferenceButton", () => {
  it("kopiert die Referenz und setzt das Icon-Feedback zurück", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyReferenceButton reference="TASK-10" />);

    const button = screen.getByRole("button", { name: "ID TASK-10 kopieren" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("TASK-10");
    expect(button).toHaveAttribute("title", "TASK-10 kopiert");

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(button).toHaveAttribute("title", "TASK-10 kopieren");
  });

  it("stoppt Klicks vor der umgebenden Karte", () => {
    const onParentClick = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(
      <div onClick={onParentClick}>
        <CopyReferenceButton reference="FEAT-3" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "ID FEAT-3 kopieren" }));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
