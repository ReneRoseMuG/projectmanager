// @vitest-environment jsdom

/**
 * Test Scope:
 * ProjectMilestoneFilterBar
 *
 * Abgedeckte Regeln:
 * - Meilenstein-Optionen werden anhand des gewählten Projekts eingegrenzt.
 * - Projekt- und Meilenstein-Auswahl geben numerische IDs oder null zurück.
 *
 * Fehlerfälle:
 * - Eine leere Auswahl darf nicht als 0 weitergegeben werden.
 *
 * Ziel:
 * Die gemeinsame Filterzeile für Meilensteine, Aufgaben und Tickets absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Milestone, Project } from "@taskmanager/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectMilestoneFilterBar } from "../../../../../apps/web/src/components/ui/ProjectMilestoneFilterBar";

const projects: Project[] = [
  {
    id: 1,
    name: "Alpha",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    milestoneCount: 1,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  },
  {
    id: 2,
    name: "Beta",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    milestoneCount: 1,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  }
];

const milestones: Milestone[] = [
  {
    id: 10,
    projectId: 1,
    name: "Alpha M1",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  },
  {
    id: 20,
    projectId: 2,
    name: "Beta M1",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  }
];

afterEach(() => {
  cleanup();
});

describe("ProjectMilestoneFilterBar", () => {
  it("filtert Meilensteine nach Projekt", () => {
    render(
      <ProjectMilestoneFilterBar
        projects={projects}
        milestones={milestones}
        projectId={1}
        milestoneId={null}
        onProjectChange={vi.fn()}
        onMilestoneChange={vi.fn()}
      />
    );

    const milestoneSelect = screen.getByRole("combobox", { name: "Meilensteinfilter" });
    expect(within(milestoneSelect).getByRole("option", { name: "Alpha M1" })).toBeInTheDocument();
    expect(within(milestoneSelect).queryByRole("option", { name: "Beta M1" })).not.toBeInTheDocument();
  });

  it("meldet Projekt- und Meilenstein-Änderungen mit ID oder null", () => {
    const onProjectChange = vi.fn();
    const onMilestoneChange = vi.fn();
    render(
      <ProjectMilestoneFilterBar
        projects={projects}
        milestones={milestones}
        projectId={null}
        milestoneId={null}
        onProjectChange={onProjectChange}
        onMilestoneChange={onMilestoneChange}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Projektfilter" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Meilensteinfilter" }), { target: { value: "20" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Projektfilter" }), { target: { value: "" } });

    expect(onProjectChange).toHaveBeenNthCalledWith(1, 2);
    expect(onMilestoneChange).toHaveBeenCalledWith(20);
    expect(onProjectChange).toHaveBeenNthCalledWith(2, null);
  });

  it("rendert für Meilenstein-Hauptansichten nur den Projektfilter", () => {
    render(
      <ProjectMilestoneFilterBar
        projects={projects}
        projectId={null}
        onProjectChange={vi.fn()}
      />
    );

    expect(screen.getByRole("combobox", { name: "Projektfilter" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Meilensteinfilter" })).not.toBeInTheDocument();
  });
});
