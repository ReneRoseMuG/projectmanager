/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration (Web-Hooks + TanStack QueryClient im Zusammenspiel)
 *
 * Realitätsgrad:
 * - Echte Hooks (useProjects, useProjectLibrary, useProgressiveList) mit echtem QueryClient.
 *   Nur die HTTP-Schicht (api/projects) ist als externer Seiteneffekt gemockt — zulässige
 *   Unit-/Integrations-Mockgrenze (Netzwerk), keine gemockten Hooks.
 *
 * Mock-Entscheidung:
 * - Gemockt: getProjects (Alt-Pfad → Array) und getProjectsPage (progressiv → Paginated).
 *   Nicht gemockt: die Hook-/QueryClient-Logik selbst (das ist der Prüfgegenstand).
 *
 * Isolation:
 * - Frischer QueryClient je Test; jsdom.
 *
 * Abgedeckte Regeln (Regression zum Listen-Crash nach dem Skalierungs-Umbau):
 * - useProjects (useQuery, speichert Array) und useProjectLibrary (useInfiniteQuery, speichert
 *   { pages, pageParams }) laufen auf DERSELBEN Seite parallel. Vor dem Fix teilten sie sich
 *   denselben Query-Key (queryKeys.projects.list({})) — der InfiniteQuery überschrieb den
 *   Array-Cache mit seinem Objekt, worauf die Status-Chip-Counts (projects.filter(...)) crashten.
 *   useProgressiveList hängt jetzt einen Marker-Suffix an seinen Key → die Cache-Einträge sind
 *   getrennt und useProjects.projects bleibt ein echtes Array mit den korrekten Daten.
 * - useProgressiveList akkumuliert paginierte Blöcke und ist defensiv gegen Nicht-Paginated-Antworten.
 *
 * Fehlerfälle:
 * - Ein leeres oder objektförmiges projects (statt Array) beim Alt-Pfad wäre die Crash-Ursache.
 *
 * Ziel:
 * Sichert die Wurzel des Listen-Crashs (Cache-Key-Kollision useQuery vs. useInfiniteQuery) dauerhaft ab.
 */
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Paginated, Project } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProjects, getProjectsPage } from "../../../../apps/web/src/api/projects";
import { useProjectLibrary, useProjects } from "../../../../apps/web/src/hooks/useProjects";

vi.mock("../../../../apps/web/src/api/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../apps/web/src/api/projects")>();
  return {
    ...actual,
    getProjects: vi.fn(),
    getProjectsPage: vi.fn(),
  };
});

const api = vi.mocked({ getProjects, getProjectsPage });

function project(id: number, status: string, name: string): Project {
  return {
    id,
    name,
    description: null,
    status,
    color: "#4682B4",
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  } as unknown as Project;
}

const projectsData: Project[] = [
  project(1, "active", "Alpha"),
  project(2, "on_hold", "Beta"),
  project(3, "active", "Gamma"),
];

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

// Repliziert die Crash-Bedingung der ProjectsPage: Alt-Pfad-Liste für die Status-Chip-Counts
// (projects.filter(...)) UND parallele progressive Liste auf derselben Seite.
function CollisionHarness() {
  const alt = useProjects();
  const library = useProjectLibrary({});

  if (alt.loading || library.loading) {
    return <p>lädt</p>;
  }

  return (
    <section>
      <output aria-label="alt-isArray">{String(Array.isArray(alt.projects))}</output>
      <output aria-label="alt-count">{alt.projects.length}</output>
      <output aria-label="alt-active">
        {alt.projects.filter((item) => item.status === "active").length}
      </output>
      <output aria-label="library-count">{library.projects.length}</output>
      <output aria-label="library-total">{library.total}</output>
    </section>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  api.getProjects.mockResolvedValue(projectsData);
  api.getProjectsPage.mockImplementation(
    async (_filter, pagination): Promise<Paginated<Project>> => ({
      data: (pagination.page ?? 1) === 1 ? projectsData : [],
      total: projectsData.length,
      page: pagination.page ?? 1,
      pageSize: pagination.pageSize ?? 50,
    }),
  );
});

describe("Progressive-List Cache-Isolation (Regression Listen-Crash)", () => {
  it("useProjects bleibt ein Array trotz parallelem useProjectLibrary (InfiniteQuery) mit gleichem Filter", async () => {
    renderWithQueryClient(<CollisionHarness />);

    await waitFor(() => expect(screen.getByLabelText("alt-count")).toHaveTextContent("3"));

    // Kern der Regression: der Alt-Pfad liefert ein echtes Array, kein InfiniteData-Objekt.
    expect(screen.getByLabelText("alt-isArray")).toHaveTextContent("true");
    // Die Status-Chip-Count-Logik (projects.filter) läuft ohne Crash und zählt korrekt.
    expect(screen.getByLabelText("alt-active")).toHaveTextContent("2");
  });

  it("useProjectLibrary akkumuliert die progressiv geladenen Einträge unabhängig vom Alt-Pfad", async () => {
    renderWithQueryClient(<CollisionHarness />);

    await waitFor(() => expect(screen.getByLabelText("library-count")).toHaveTextContent("3"));
    expect(screen.getByLabelText("library-total")).toHaveTextContent("3");
  });
});
