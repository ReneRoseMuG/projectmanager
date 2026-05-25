// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Seiten-, Modal-, ListBoardView-, ItemCard- und ItemRow-Komponenten mit kontrollierten Hook-Daten.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks für Admin-Hooks, damit Netzwerk und TanStack Query nicht Gegenstand dieser Tests sind.
 *
 * Isolation:
 * - jsdom ohne produktive Datenbank, Uploads oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Benutzer und Rollen nutzen Board-/Listview und öffnen DetailModal statt Detail-Routen.
 * - Speichern nutzt die vorhandenen Hook-Handler mit aktueller Version.
 * - System-Rollen können nicht gelöscht oder gespeichert werden.
 *
 * Fehlerfälle:
 * - Edit-Aktionen dürfen keinen Navigationssprung benötigen.
 * - System-Rollen dürfen keine aktive Lösch- oder Speichern-Aktion anbieten.
 *
 * Ziel:
 * Die neue Admin-Listen- und Modal-Bedienung gegen Regressionsfehler absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { AdminUser, PermissionCatalog, Role } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RolesPage } from "../../../../apps/web/src/pages/admin/RolesPage";
import { UsersPage } from "../../../../apps/web/src/pages/admin/UsersPage";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
}));

const permissionCatalog: PermissionCatalog = {
  resources: ["users", "roles"],
  actions: ["read", "write", "delete", "admin"],
};

const adminRole: Role = {
  id: 1,
  key: "admin",
  label: "Administrator",
  isSystem: true,
  version: 5,
  createdAt: "2026-05-25T08:00:00.000Z",
  updatedAt: "2026-05-25T08:00:00.000Z",
  permissions: [
    { id: 1, roleId: 1, resource: "users", action: "admin" },
    { id: 2, roleId: 1, resource: "roles", action: "admin" },
  ],
};

const editorRole: Role = {
  id: 2,
  key: "editor",
  label: "Redaktion",
  isSystem: false,
  version: 3,
  createdAt: "2026-05-25T08:00:00.000Z",
  updatedAt: "2026-05-25T08:00:00.000Z",
  permissions: [{ id: 3, roleId: 2, resource: "users", action: "read" }],
};

const users: AdminUser[] = [
  {
    id: 10,
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    address: null,
    phone: null,
    email: "ada@example.test",
    role: adminRole,
    isActive: true,
    version: 7,
    createdAt: "2026-05-25T08:00:00.000Z",
    updatedAt: "2026-05-25T08:00:00.000Z",
  },
];

const roles: Role[] = [adminRole, editorRole];

vi.mock("../../../../apps/web/src/hooks/useAdminUsers", () => ({
  useAdminUsers: () => ({
    users,
    loading: false,
    error: null,
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
    deleteUser: mocks.deleteUser,
    pending: false,
    mutationError: null,
  }),
  useAdminUserDetail: (id: number | null) => ({
    user: id ? users.find((user) => user.id === id) ?? null : null,
    loading: false,
    error: null,
    updateUser: vi.fn(),
    pending: false,
    mutationError: null,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useAdminRoles", () => ({
  useAdminRoles: () => ({
    roles,
    permissionCatalog,
    loading: false,
    error: null,
    createRole: mocks.createRole,
    updateRole: mocks.updateRole,
    deleteRole: mocks.deleteRole,
    pending: false,
    mutationError: null,
  }),
  useAdminRoleDetail: (id: number | null) => ({
    role: id ? roles.find((role) => role.id === id) ?? null : null,
    loading: false,
    error: null,
    updateRole: vi.fn(),
    pending: false,
    mutationError: null,
  }),
}));

afterEach(() => {
  cleanup();
  mocks.createUser.mockReset();
  mocks.updateUser.mockReset();
  mocks.deleteUser.mockReset();
  mocks.createRole.mockReset();
  mocks.updateRole.mockReset();
  mocks.deleteRole.mockReset();
});

describe("UsersPage", () => {
  it("rendert Detail-Hero, Board/Listview und öffnet das Benutzer-Modal", () => {
    render(<UsersPage />);

    expect(screen.getByTestId("page-hero")).toHaveAttribute("data-variant", "detail");
    expect(screen.getByTestId("list-board-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByText("ada@example.test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Neuer Benutzer" }));
    expect(screen.getByText("Neuer Benutzer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByText("Neuer Benutzer")).not.toBeInTheDocument();
  });

  it("speichert Benutzeränderungen mit expectedVersion über den Hook", async () => {
    mocks.updateUser.mockResolvedValue(users[0]);
    render(<UsersPage />);

    fireEvent.doubleClick(screen.getByText("Ada Lovelace").closest("article") as HTMLElement);
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "Augusta" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(10, expect.objectContaining({
        firstName: "Augusta",
        expectedVersion: 7,
      })),
    );
  });
});

describe("RolesPage", () => {
  it("rendert Rollen als Board/Listview und deaktiviert Löschen für System-Rollen", () => {
    render(<RolesPage />);

    expect(screen.getByTestId("page-hero")).toHaveAttribute("data-variant", "detail");
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByText("admin")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Aktionen" })[0] as HTMLElement);

    expect(screen.getByRole("menuitem", { name: "Löschen" })).toBeDisabled();
  });

  it("öffnet System-Rollen read-only im DetailModal", () => {
    render(<RolesPage />);

    fireEvent.doubleClick(screen.getByText("Administrator").closest("article") as HTMLElement);

    expect(screen.getByText("System-Rolle kann nicht bearbeitet werden.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(screen.getByLabelText("Schlüssel")).toBeDisabled();
  });
});
