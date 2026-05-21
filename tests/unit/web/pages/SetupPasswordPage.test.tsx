// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - SetupPasswordPage verlangt zwei übereinstimmende Passwortwerte.
 * - Bei gültiger Eingabe wird der Auth-Hook zum initialen Passwortsatz aufgerufen.
 *
 * Fehlerfälle:
 * - Abweichende Bestätigung blockiert den Request und zeigt eine Fehlermeldung.
 *
 * Ziel:
 * Den First-Login-Passwortflow gegen Formularregressionen absichern.
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupPasswordPage } from "../../../../apps/web/src/pages/SetupPasswordPage";

const setInitialPasswordMock = vi.fn();

vi.mock("../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({
    setInitialPassword: setInitialPasswordMock,
    setPasswordPending: false
  })
}));

afterEach(() => {
  cleanup();
  setInitialPasswordMock.mockReset();
});

describe("SetupPasswordPage", () => {
  it("blockiert abweichende Passwortbestätigung", async () => {
    render(
      <MemoryRouter>
        <SetupPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Neues Passwort"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Bestätigung"), { target: { value: "password124" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Passwörter stimmen nicht überein")).toBeInTheDocument();
    expect(setInitialPasswordMock).not.toHaveBeenCalled();
  });

  it("sendet ein gültiges Passwort", async () => {
    setInitialPasswordMock.mockResolvedValue({});
    render(
      <MemoryRouter>
        <SetupPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Neues Passwort"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Bestätigung"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(setInitialPasswordMock).toHaveBeenCalledWith({ password: "password123" }));
  });
});
