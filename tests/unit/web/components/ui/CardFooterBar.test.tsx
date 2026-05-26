// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CardFooterBar rendert Tags, Support-Counter und optionalen Tag-Picker ohne eigene Datenabfragen.
 * - Tag-Abkürzungen bleiben deterministisch für Einwort-, Mehrwort-, Leerstring- und Full-Fälle.
 *
 * Fehlerfälle:
 * - Read-only Footer darf keinen Picker anbieten.
 * - Laufende Tag-Änderungen müssen weitere Checkbox-Änderungen sperren und bei Fehlern lokal zurückrollen.
 *
 * Ziel:
 * Die gemeinsame Karten-Footer-Komponente gegen Interaktions-, Counter- und Picker-Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Tag } from "@taskmanager/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { abbreviateTag, CardFooterBar } from "../../../../../apps/web/src/components/ui/CardFooterBar";

const tags: Tag[] = [
  { id: 1, name: "Backend", color: "#0f766e", version: 1 },
  { id: 2, name: "Frontend Review", color: "#7c3aed", version: 1 }
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("abbreviateTag", () => {
  it("kürzt Tag-Namen deterministisch", () => {
    expect(abbreviateTag("Backend", "full")).toBe("Backend");
    expect(abbreviateTag("Backend", "short")).toBe("Back");
    expect(abbreviateTag("Frontend Review", "short")).toBe("FR");
    expect(abbreviateTag("Bug", "short")).toBe("Bug");
    expect(abbreviateTag("   ", "short")).toBe("");
  });
});

describe("CardFooterBar", () => {
  it("rendert Tags und Counter mit schwacher Null-Darstellung", () => {
    render(<CardFooterBar tags={[tags[0]!]} attachmentCount={2} noteCount={0} commentCount={1} />);

    expect(screen.getAllByText("Backend")[0]).toBeInTheDocument();
    expect(screen.getByLabelText("2 Anhänge")).toHaveClass("text-steel-500");
    expect(screen.getByLabelText("0 Notizen")).toHaveClass("text-steel-300");
    expect(screen.getByLabelText("1 Kommentare")).toHaveClass("text-steel-500");
  });

  it("bietet ohne Mutationshandler keinen Picker an", () => {
    render(<CardFooterBar tags={[tags[0]!]} allTags={tags} />);

    expect(screen.queryByRole("button", { name: "Tags bearbeiten" })).not.toBeInTheDocument();
  });

  it("öffnet den Picker, ändert Checkboxen und schließt per Außenklick", async () => {
    const onTagsChange = vi.fn().mockResolvedValue(undefined);
    render(<CardFooterBar tags={[tags[0]!]} allTags={tags} onTagsChange={onTagsChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tags bearbeiten" }));
    const frontendCheckbox = screen.getByLabelText("Frontend Review") as HTMLInputElement;
    expect(frontendCheckbox.checked).toBe(false);

    fireEvent.click(frontendCheckbox);

    await waitFor(() => expect(onTagsChange).toHaveBeenCalledWith([1, 2]));
    expect(frontendCheckbox.checked).toBe(true);

    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("Frontend Review")).not.toBeInTheDocument();
  });

  it("sperrt Controls während einer laufenden Tag-Änderung", async () => {
    let resolveMutation: () => void = () => undefined;
    const onTagsChange = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        })
    );
    render(<CardFooterBar tags={[tags[0]!]} allTags={tags} onTagsChange={onTagsChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tags bearbeiten" }));
    fireEvent.click(screen.getByLabelText("Frontend Review"));

    await waitFor(() => expect(screen.getByLabelText("Frontend Review")).toBeDisabled());
    expect(screen.getByRole("button", { name: "Tags bearbeiten" })).toBeDisabled();

    resolveMutation();
    await waitFor(() => expect(screen.getByLabelText("Frontend Review")).not.toBeDisabled());
  });

  it("rollt lokale Auswahl bei Mutationsfehler zurück", async () => {
    const onTagsChange = vi.fn().mockRejectedValue(new Error("Forbidden"));
    render(<CardFooterBar tags={[tags[0]!]} allTags={tags} onTagsChange={onTagsChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tags bearbeiten" }));
    fireEvent.click(screen.getByLabelText("Frontend Review"));

    await waitFor(() => expect(onTagsChange).toHaveBeenCalledWith([1, 2]));
    await waitFor(() => expect(screen.getByLabelText("Frontend Review")).not.toBeChecked());
  });
});
