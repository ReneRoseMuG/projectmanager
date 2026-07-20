/**
 * Test Scope:
 * AttachmentPreview
 *
 * Abgedeckte Regeln:
 * - Attachment-Karten bieten Download und lokales Öffnen als getrennte Aktionen an.
 * - Die lokale Öffnen-Aktion zeigt Pending-Zustand und Fehler über Toasts.
 *
 * Fehlerfälle:
 * - Fehlgeschlagene Öffnen-Mutationen werden mit der API-/Error-Message gemeldet.
 *
 * Ziel:
 * Die UI-Aktion für native Dateiöffnung ohne echten Backend- oder Dateisystemzugriff absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Attachment } from "@taskmanager/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentPreview } from "../../../../../apps/web/src/components/attachments/AttachmentPreview";

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  confirm: vi.fn()
}));

vi.mock("../../../../../apps/web/src/api/client", () => ({
  assetUrl: (path: string) => `http://assets.test${path}`
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachmentPreview", () => ({
  useAttachmentPreview: () => ({ preview: null, loading: false, error: null })
}));

vi.mock("../../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: toastMocks.showToast })
}));

vi.mock("../../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: toastMocks.confirm })
}));

const attachment: Attachment = {
  id: 42,
  owners: [{ type: "project", id: 7 }],
  originalName: "notiz.txt",
  filename: "generated-notiz.txt",
  mimetype: "text/plain",
  size: 128,
  url: "/api/attachments/1/content",
  contentHash: null,
  isInDocumentLibrary: true,
  createdAt: "2026-05-21T08:00:00.000Z",
  updatedAt: "2026-05-21T08:00:00.000Z",
  version: 1
};

beforeEach(() => {
  toastMocks.confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AttachmentPreview", () => {
  it("rendert Download und lokale Öffnen-Aktion getrennt", async () => {
    const onOpen = vi.fn().mockResolvedValue(undefined);

    render(<AttachmentPreview attachment={attachment} onUnlink={vi.fn()} onOpen={onOpen} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "http://assets.test/api/attachments/1/content");
    fireEvent.click(screen.getByRole("button", { name: "Lokal öffnen" }));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(attachment));
  });

  it("deaktiviert die lokale Öffnen-Aktion während der Mutation", () => {
    render(<AttachmentPreview attachment={attachment} onUnlink={vi.fn()} onOpen={vi.fn()} opening />);

    expect(screen.getByRole("button", { name: "Lokal öffnen" })).toBeDisabled();
  });

  it("meldet Fehler beim lokalen Öffnen als Toast", async () => {
    const onOpen = vi.fn().mockRejectedValue(new Error("Datei fehlt"));

    render(<AttachmentPreview attachment={attachment} onUnlink={vi.fn()} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Lokal öffnen" }));

    await waitFor(() =>
      expect(toastMocks.showToast).toHaveBeenCalledWith({
        tone: "error",
        title: "Datei konnte nicht geöffnet werden",
        message: "Datei fehlt"
      })
    );
  });

  it("trennt Verknüpfung lösen und endgültiges Löschen in Wirkung und Bestätigung", async () => {
    const onUnlink = vi.fn().mockResolvedValue(undefined);
    const onDeletePermanently = vi.fn().mockResolvedValue(undefined);
    render(
      <AttachmentPreview
        attachment={attachment}
        onUnlink={onUnlink}
        onDeletePermanently={onDeletePermanently}
        onOpen={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfung lösen" }));
    await waitFor(() => expect(onUnlink).toHaveBeenCalledWith(attachment));
    expect(toastMocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: "Verknüpfung lösen?",
      confirmLabel: "Verknüpfung lösen"
    }));

    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    await waitFor(() => expect(onDeletePermanently).toHaveBeenCalledWith(attachment));
    expect(toastMocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: "Datei endgültig löschen?",
      confirmLabel: "Endgültig löschen",
      requireCheck: "Ich bestätige das endgültige Löschen."
    }));
  });
});
