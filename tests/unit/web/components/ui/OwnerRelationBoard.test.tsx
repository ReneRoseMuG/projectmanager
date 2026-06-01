// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - OwnerRelationBoard zentralisiert Erstellen, Verknüpfen, Öffnen und Entfernen von Owner-Relationen.
 * - Pending-Komponenten halten Create-Daten lokal und melden Add-/Remove-Ereignisse mit fachlicher Payload.
 * - PendingFileList lehnt Dateien über 25 MB clientseitig ab und erzeugt Bild-Preview-URLs.
 *
 * Fehlerfälle:
 * - Entfernen darf erst nach Confirm-Dialog an den Unlink-Callback gehen.
 * - Leere Kommentare und leere Notiztitel dürfen nicht vorgemerkt werden.
 * - Zu große Dateien dürfen nicht an den Upload-Pending-State übergeben werden.
 *
 * Ziel:
 * Die neue Foundation für Owner-Relation-Boards und Create-Pending-Listen gegen Regressionsfehler absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { Link2 } from "lucide-react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { OwnerRelationBoard } from "../../../../../apps/web/src/components/ui/OwnerRelationBoard";
import { PendingCommentList } from "../../../../../apps/web/src/components/ui/PendingCommentList";
import { PendingFileList } from "../../../../../apps/web/src/components/ui/PendingFileList";
import { PendingNoteList } from "../../../../../apps/web/src/components/ui/PendingNoteList";
import { PendingRelationList } from "../../../../../apps/web/src/components/ui/PendingRelationList";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({
    value,
    onChange,
    placeholder,
    readOnly,
  }: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
  }) {
    if (readOnly) {
      return <div>{value}</div>;
    }
    return <textarea aria-label={placeholder ?? "Rich Text"} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  },
}));

interface TestItem {
  id: number;
  title: string;
  status: "todo" | "done";
}

const items: TestItem[] = [
  { id: 1, title: "Alpha", status: "todo" },
  { id: 2, title: "Beta", status: "done" }
];

function renderWithProviders(ui: ReactElement) {
  return render(
    <ToastProvider>
      <ConfirmDialogProvider>{ui}</ConfirmDialogProvider>
    </ToastProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview")
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("OwnerRelationBoard", () => {
  it("reicht Slot-Aktionen weiter und entfernt erst nach Confirm", async () => {
    const onCreateItem = vi.fn();
    const onLinkItem = vi.fn();
    const onOpenItem = vi.fn();
    const onUnlinkItem = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <OwnerRelationBoard
        items={items}
        loading={false}
        onCreateItem={onCreateItem}
        onLinkItem={onLinkItem}
        onOpenItem={onOpenItem}
        onUnlinkItem={onUnlinkItem}
        confirmUnlinkTitle={(item) => `${item.title} entfernen?`}
        confirmUnlinkBody={(item) => `${item.title} wird nur aus diesem Bereich entfernt.`}
        renderListBoardView={(props) => (
          <div>
            <button type="button" onClick={props.onAdd}>
              Neu
            </button>
            <button type="button" onClick={() => props.onAddStatus?.("done")}>
              Neu erledigt
            </button>
            <button type="button" onClick={() => props.onOpen(props.items[0]!)}>
              Öffnen
            </button>
            <button type="button" onClick={() => props.onDelete(props.items[0]!)}>
              Entfernen
            </button>
            {props.linkAction}
          </div>
        )}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Neu" }));
    fireEvent.click(screen.getByRole("button", { name: "Neu erledigt" }));
    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));
    const linkButton = screen.getByRole("button", { name: /Verkn/i });
    expect(linkButton).toHaveClass("h-9", "w-9", "bg-transparent");
    expect(linkButton).toHaveTextContent("");
    fireEvent.click(linkButton);

    expect(onCreateItem).toHaveBeenNthCalledWith(1);
    expect(onCreateItem).toHaveBeenNthCalledWith(2, "done");
    expect(onOpenItem).toHaveBeenCalledWith(items[0]);
    expect(onLinkItem).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Alpha entfernen?");
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onUnlinkItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Entfernen" }));

    await waitFor(() => expect(onUnlinkItem).toHaveBeenCalledWith(items[0]));
    expect(await screen.findByText("Zuordnung entfernt")).toBeInTheDocument();
  });
});

describe("PendingRelationList", () => {
  it("rendert bestehende und neue Einträge und meldet Add-/Remove-Aktionen", () => {
    const onLinkExisting = vi.fn();
    const onCreateNew = vi.fn();
    const onRemoveExisting = vi.fn();
    const onRemoveDraft = vi.fn();

    render(
      <PendingRelationList
        existingItems={[{ id: 10, title: "Bestehende Aufgabe", statusLabel: "Offen", statusTone: "steel" }]}
        draftItems={[{ title: "Neue Aufgabe", badge: "Wird erstellt" }]}
        emptyIcon={<Link2 />}
        emptyTitle="Keine Zuordnungen"
        onLinkExisting={onLinkExisting}
        onCreateNew={onCreateNew}
        onRemoveExisting={onRemoveExisting}
        onRemoveDraft={onRemoveDraft}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Verkn/i }));
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    fireEvent.click(screen.getByRole("button", { name: "Bestehende Aufgabe entfernen" }));
    fireEvent.click(screen.getByRole("button", { name: "Neue Aufgabe entfernen" }));

    expect(onLinkExisting).toHaveBeenCalledTimes(1);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
    expect(onRemoveExisting).toHaveBeenCalledWith(0);
    expect(onRemoveDraft).toHaveBeenCalledWith(0);
  });

  it("zeigt EmptyState und kann Link/Create-Aktionen ausblenden", () => {
    render(
      <PendingRelationList
        existingItems={[]}
        draftItems={[]}
        emptyIcon={<Link2 />}
        emptyTitle="Keine Zuordnungen"
        showLinkExisting={false}
        showCreateNew={false}
        onRemoveExisting={vi.fn()}
        onRemoveDraft={vi.fn()}
      />
    );

    expect(screen.getByText("Keine Zuordnungen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verkn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Neu erstellen" })).not.toBeInTheDocument();
  });
});

describe("PendingCommentList", () => {
  it("merkt Kommentare über das Modal vor und entfernt sie", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<PendingCommentList comments={[{ text: "Vorhanden" }]} onAdd={onAdd} onUpdate={vi.fn()} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Kommentar vormerken" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Kommentar vormerken" }), { target: { value: "Neuer Kommentar" } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "Kommentar entfernen" }));

    expect(onAdd).toHaveBeenCalledWith({ text: "Neuer Kommentar" });
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("sendet keine leeren Kommentare", () => {
    const onAdd = vi.fn();
    render(<PendingCommentList comments={[]} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Kommentar vormerken" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Kommentar vormerken" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
  });
});

describe("PendingNoteList", () => {
  it("merkt Notizen mit HTML-Content-Objekt vor und entfernt sie", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<PendingNoteList notes={[{ title: "Konzept", contentJson: {} }]} onAdd={onAdd} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.change(screen.getByLabelText(/Titel/), { target: { value: "  Neue Notiz  " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Notizinhalt" }), { target: { value: "<p>Inhalt</p>" } });
    fireEvent.click(screen.getByRole("button", { name: /Hinzuf/i }));
    fireEvent.click(screen.getByRole("button", { name: "Konzept entfernen" }));

    expect(onAdd).toHaveBeenCalledWith({ title: "Neue Notiz", contentJson: { html: "<p>Inhalt</p>" } });
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("sendet keine Notiz ohne Titel", () => {
    const onAdd = vi.fn();
    render(<PendingNoteList notes={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.click(screen.getByRole("button", { name: /Hinzuf/i }));

    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("PendingFileList", () => {
  it("nimmt gültige Dateien an und erzeugt Bild-Previews", () => {
    const onAdd = vi.fn();
    const { container } = render(<PendingFileList files={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "screen.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onAdd).toHaveBeenCalledWith([{ file, previewUrl: "blob:preview" }]);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("lehnt Dateien über 25 MB ab und entfernt vorgemerkte Dateien", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const smallFile = new File(["x"], "small.txt", { type: "text/plain" });
    const largeFile = new File(["x"], "large.bin", { type: "application/octet-stream" });
    Object.defineProperty(largeFile, "size", { value: 26 * 1024 * 1024 });

    const { container } = render(
      <PendingFileList files={[{ file: smallFile }]} onAdd={onAdd} onRemove={onRemove} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });
    fireEvent.click(screen.getByRole("button", { name: "small.txt entfernen" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/Datei zu gro/i)).toBeInTheDocument();
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("zeigt EmptyState ohne vorgemerkte Dateien", () => {
    render(<PendingFileList files={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dateien auswählen" })).toBeInTheDocument();
    expect(screen.getByText("Dateien werden nach dem Speichern hochgeladen.")).toBeInTheDocument();
  });
});
