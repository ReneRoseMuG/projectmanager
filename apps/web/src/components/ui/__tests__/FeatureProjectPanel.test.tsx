/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FeatureProjectPanel zeigt verknüpfte Projekte als Board/List-Ansicht statt RelationPanel-Auswahl.
 * - Der Plus-Flow fügt genau ein vorhandenes Projekt über die Relation-Mutation hinzu.
 * - Projektkarten und Projektzeilen bieten eine Entfernen-Aktion für die Join-Relation.
 *
 * Fehlerfälle:
 * - Der Feature-Projekte-Tab darf keine Checkbox-Auswahl und keinen Speichern-Flow für Relationen anbieten.
 * - Leere Feature-Projekt-Ergebnisse müssen einen EmptyState anzeigen.
 *
 * Ziel:
 * Die Feature-Projekt-Zuordnung gegen Regressionen zurück zum alten RelationPanel und Bulk-Speichern absichern.
 */
import type { Project } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ViewMode } from "../../../types";
import { FeatureProjectPanel } from "../../features/FeatureProjectPanel";
import { buildProjectSet } from "./factories";

function renderFeatureProjectPanel({
  projects = buildProjectSet().filter((project) => project.status === "active" || project.status === "archived"),
  availableProjects = buildProjectSet(),
  viewMode = "kanban",
  onViewModeChange = vi.fn(),
  onAddProject = vi.fn(),
  onRemoveProject = vi.fn(),
  onOpen = vi.fn()
}: {
  projects?: Project[];
  availableProjects?: Project[];
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onAddProject?: (project: Project) => Promise<void>;
  onRemoveProject?: (project: Project) => Promise<void>;
  onOpen?: (project: Project) => void;
} = {}) {
  return render(
    <FeatureProjectPanel
      projects={projects}
      availableProjects={availableProjects}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onAddProject={onAddProject}
      onRemoveProject={onRemoveProject}
      onOpen={onOpen}
    />
  );
}

function requiredProject(project: Project | undefined): Project {
  if (!project) {
    throw new Error("Expected test project to exist");
  }
  return project;
}

afterEach(() => {
  cleanup();
});

describe("FeatureProjectPanel", () => {
  it("zeigt verknüpfte Projekte im Board nach Statusspalten und ohne RelationPanel-Speichern", () => {
    const projects = buildProjectSet().filter((project) => project.status === "active" || project.status === "archived");
    const { container } = renderFeatureProjectPanel({ projects });

    expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projekt hinzufügen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();

    const columns = container.querySelectorAll("section.rounded-lg");
    expect(columns).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Aktiv" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Archiviert" })).toBeInTheDocument();

    const activeColumn = screen.getByRole("heading", { name: "Aktiv" }).closest("section");
    expect(activeColumn).toContainElement(screen.getByText("Projekt Aktiv"));
    const archivedColumn = screen.getByRole("heading", { name: "Archiviert" }).closest("section");
    expect(archivedColumn).toContainElement(screen.getByText("Projekt Archiviert"));
  });

  it("fügt ein ausgewähltes Projekt über den Plus-Flow hinzu", async () => {
    const allProjects = buildProjectSet();
    const linkedProjects = [requiredProject(allProjects[0])];
    const addableProject = requiredProject(allProjects[1]);
    const onAddProject = vi.fn().mockResolvedValue(undefined);
    renderFeatureProjectPanel({ projects: linkedProjects, availableProjects: allProjects, onAddProject });

    fireEvent.click(screen.getByRole("button", { name: "Projekt hinzufügen" }));
    expect(screen.getByRole("heading", { name: "Projekt hinzufügen" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: String(addableProject.id) } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() => expect(onAddProject).toHaveBeenCalledWith(addableProject));
  });

  it("entfernt eine Projekt-Zuordnung über Karten und Zeilen", async () => {
    const projects = buildProjectSet();
    const linkedProject = requiredProject(projects[0]);
    const onRemoveProject = vi.fn().mockResolvedValue(undefined);
    const onViewModeChange = vi.fn();
    const { rerender } = render(
      <FeatureProjectPanel
        projects={[linkedProject]}
        availableProjects={projects}
        viewMode="kanban"
        onViewModeChange={onViewModeChange}
        onAddProject={vi.fn()}
        onRemoveProject={onRemoveProject}
        onOpen={vi.fn()}
      />
    );

    const card = screen.getByText("Projekt Aktiv").closest("article");
    expect(card).toBeInTheDocument();
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Entfernen" }));
    await waitFor(() => expect(onRemoveProject).toHaveBeenCalledWith(linkedProject));

    onRemoveProject.mockClear();
    rerender(
      <FeatureProjectPanel
        projects={[linkedProject]}
        availableProjects={projects}
        viewMode="list"
        onViewModeChange={onViewModeChange}
        onAddProject={vi.fn()}
        onRemoveProject={onRemoveProject}
        onOpen={vi.fn()}
      />
    );

    const row = screen.getByText("Projekt Aktiv").closest("article");
    expect(row).toBeInTheDocument();
    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: "Entfernen" }));
    await waitFor(() => expect(onRemoveProject).toHaveBeenCalledWith(linkedProject));
  });

  it("meldet Moduswechsel und zeigt EmptyState ohne verknüpfte Projekte", () => {
    const onViewModeChange = vi.fn();
    const { container } = renderFeatureProjectPanel({ projects: [], onViewModeChange });

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));

    expect(onViewModeChange).toHaveBeenCalledWith("list");
    expect(screen.getByText("Keine Projekte verknüpft")).toBeInTheDocument();
    expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
  });
});
