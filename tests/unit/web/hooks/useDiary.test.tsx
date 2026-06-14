// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter useDiary-Hook mit echtem QueryClient; nur die ky-API-Schicht (api/diary) ist ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock: getProjectDiary (Netzwerk als externer Seiteneffekt). Hook und QueryClient laufen real.
 *
 * Isolation:
 * - jsdom ohne Netzwerk; eigener QueryClient pro Render.
 *
 * Abgedeckte Regeln:
 * - useDiary lädt den Projekt-Tagebucheintrag über getProjectDiary.
 * - Ohne Projekt-id oder ohne Leserecht (enabled=false) wird nicht geladen.
 *
 * Fehlerfälle:
 * - Ein abgelehnter Request wird als Fehlerzustand (toQueryError) gemeldet.
 *
 * Ziel:
 * Den Lese-Datenfluss des Tagebuch-Widgets absichern.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { DiaryEntry } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as diaryApi from "../../../../apps/web/src/api/diary";
import { useDiary } from "../../../../apps/web/src/hooks/useDiary";

vi.mock("../../../../apps/web/src/api/diary", () => ({
  getProjectDiary: vi.fn(),
}));

const getProjectDiaryMock = vi.mocked(diaryApi.getProjectDiary);

const sampleEntry: DiaryEntry = {
  id: 5,
  projectId: 42,
  title: "Verlauf",
  content: "Projektverlauf-Text",
  coveredUntil: null,
  sourceCount: 0,
  version: 1,
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Harness({ projectId, enabled }: { projectId: number | undefined; enabled?: boolean }) {
  const { diary, loading, error } = useDiary(projectId, enabled);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? ""}</span>
      <span data-testid="content">{diary?.content ?? "—"}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
  getProjectDiaryMock.mockReset();
});

describe("useDiary", () => {
  it("lädt den Tagebuch-Eintrag des Projekts", async () => {
    getProjectDiaryMock.mockResolvedValue(sampleEntry);

    render(
      <Wrapper>
        <Harness projectId={42} />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("content")).toHaveTextContent("Projektverlauf-Text"));
    expect(getProjectDiaryMock).toHaveBeenCalledWith(42);
  });

  it("meldet einen Fehlerzustand bei abgelehntem Request", async () => {
    getProjectDiaryMock.mockRejectedValue(new Error("Netzwerkfehler"));

    render(
      <Wrapper>
        <Harness projectId={42} />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("error").textContent).not.toBe(""));
  });

  it("lädt nicht ohne Projekt-id", async () => {
    render(
      <Wrapper>
        <Harness projectId={undefined} />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(getProjectDiaryMock).not.toHaveBeenCalled();
  });

  it("lädt nicht ohne Leserecht (enabled=false)", async () => {
    render(
      <Wrapper>
        <Harness projectId={42} enabled={false} />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(getProjectDiaryMock).not.toHaveBeenCalled();
  });
});
