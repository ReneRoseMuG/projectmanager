// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter useWiki-Hook mit echtem QueryClient; nur die ky-API-Schicht (api/wiki) ist ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock: alle api/wiki-Funktionen (Netzwerk als externer Seiteneffekt). Hook und QueryClient laufen real.
 *
 * Isolation:
 * - jsdom ohne Netzwerk; geteilter QueryClient über den Rerender, um Cache-Wiederverwendung zu prüfen.
 *
 * Abgedeckte Regeln:
 * - Navigationsbaum und Seiteninhalt werden über getrennte Abfragen geladen.
 * - Ein Seitenwechsel lädt den Baum nicht erneut (seitenübergreifender Baum-Cache).
 * - Ohne pageId wird nur der Baum geladen.
 * - Während eines Seitenwechsels darf keepPreviousData keine fremde Wiki-Seite an die Route durchreichen.
 *
 * Fehlerfälle:
 * - Alte WIKI-16-Daten dürfen beim Wechsel auf WIKI-202 nicht als aktive WIKI-202-Seite erscheinen.
 *
 * Ziel:
 * Die Query-Trennung und den Wiki-Hook gegen Content-Verschleppung bei Detailseiten-Navigation absichern.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import type { WikiPage, WikiTreeNode } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as wikiApi from "../../../../apps/web/src/api/wiki";
import { useWiki } from "../../../../apps/web/src/hooks/useWiki";

vi.mock("../../../../apps/web/src/api/wiki", () => ({
  getWikiTree: vi.fn(),
  getWikiPage: vi.fn(),
  createWikiPage: vi.fn(),
  deleteWikiPage: vi.fn(),
  moveWikiPage: vi.fn(),
  updateWikiPage: vi.fn(),
  addWikiPageRelation: vi.fn(),
  removeWikiPageRelation: vi.fn(),
}));

const getWikiTreeMock = vi.mocked(wikiApi.getWikiTree);
const getWikiPageMock = vi.mocked(wikiApi.getWikiPage);

const alpha: WikiPage = {
  id: 10,
  parentId: null,
  title: "Alpha",
  content: "<p>A</p>",
  sortOrder: 0,
  childCount: 0,
  attachmentCount: 0,
  taskCount: 0,
  ticketCount: 0,
  relatedPages: [],
  version: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const beta: WikiPage = { ...alpha, id: 11, title: "Beta", content: "<p>B</p>" };
const wiki202: WikiPage = { ...alpha, id: 202, title: "Detail", content: "<p>Detail</p>" };

const tree: WikiTreeNode[] = [
  { ...alpha, children: [] },
  { ...beta, children: [] },
];

function newClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function Provider({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Harness({ pageId }: { pageId?: number }) {
  const { tree: pages, page, loading, pageLoading } = useWiki(pageId);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="page-loading">{String(pageLoading)}</span>
      <span data-testid="tree-count">{String(pages.length)}</span>
      <span data-testid="page-title">{page?.title ?? "—"}</span>
    </div>
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  getWikiTreeMock.mockReset();
  getWikiPageMock.mockReset();
});

describe("useWiki", () => {
  it("lädt Navigationsbaum und Seiteninhalt über getrennte Abfragen", async () => {
    getWikiTreeMock.mockResolvedValue(tree);
    getWikiPageMock.mockResolvedValue(alpha);

    render(
      <Provider client={newClient()}>
        <Harness pageId={10} />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("page-title")).toHaveTextContent("Alpha"));
    expect(screen.getByTestId("tree-count")).toHaveTextContent("2");
    expect(getWikiTreeMock).toHaveBeenCalledTimes(1);
    expect(getWikiPageMock).toHaveBeenCalledWith(10);
  });

  it("lädt den Baum beim Seitenwechsel nicht erneut", async () => {
    getWikiTreeMock.mockResolvedValue(tree);
    getWikiPageMock.mockImplementation(async (id: number) => (id === 11 ? beta : alpha));

    // Geteilter Client: der Baum-Cache muss den Seitenwechsel überleben.
    const client = newClient();
    const { rerender } = render(
      <Provider client={client}>
        <Harness pageId={10} />
      </Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("page-title")).toHaveTextContent("Alpha"));

    rerender(
      <Provider client={client}>
        <Harness pageId={11} />
      </Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("page-title")).toHaveTextContent("Beta"));

    expect(getWikiTreeMock).toHaveBeenCalledTimes(1);
    expect(getWikiPageMock).toHaveBeenCalledWith(11);
  });

  it("lädt ohne pageId nur den Baum", async () => {
    getWikiTreeMock.mockResolvedValue(tree);

    render(
      <Provider client={newClient()}>
        <Harness pageId={undefined} />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("tree-count")).toHaveTextContent("2"));
    expect(getWikiPageMock).not.toHaveBeenCalled();
  });

  it("gibt beim Seitenwechsel keine vorherige Detailseite als aktive Seite aus", async () => {
    const detailRequest = createDeferred<WikiPage>();
    getWikiTreeMock.mockResolvedValue(tree);
    getWikiPageMock.mockImplementation((id: number) => {
      if (id === 202) {
        return detailRequest.promise;
      }
      return Promise.resolve(alpha);
    });

    const client = newClient();
    const { rerender } = render(
      <Provider client={client}>
        <Harness pageId={10} />
      </Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("page-title")).toHaveTextContent("Alpha"));

    rerender(
      <Provider client={client}>
        <Harness pageId={202} />
      </Provider>,
    );

    expect(screen.getByTestId("page-title")).toHaveTextContent("—");
    expect(screen.getByTestId("page-loading")).toHaveTextContent("true");

    await act(async () => {
      detailRequest.resolve(wiki202);
    });

    await waitFor(() => expect(screen.getByTestId("page-title")).toHaveTextContent("Detail"));
  });
});
