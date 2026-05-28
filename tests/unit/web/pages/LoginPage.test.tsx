// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - LoginPage bietet nur den Ein-Klick-Login für Rene an.
 * - Serverfehler werden als sichtbare Fehlermeldung gerendert.
 *
 * Fehlerfälle:
 * - Fehlgeschlagener Ein-Klick-Login bleibt auf der Seite und zeigt den API-Fehler.
 *
 * Ziel:
 * Den Login-Screen gegen Ein-Klick- und Fehlerregressionen absichern.
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../../../../apps/web/src/pages/LoginPage";

const loginAsReneMock = vi.fn();

vi.mock("../../../../apps/web/src/hooks/useAuth", () => ({
  useAuth: () => ({
    loginAsRene: loginAsReneMock,
    loginAsRenePending: false,
  }),
}));

afterEach(() => {
  cleanup();
  loginAsReneMock.mockReset();
});

describe("LoginPage", () => {
  it("meldet Rene über den Auth-Hook an", async () => {
    loginAsReneMock.mockResolvedValue({ requiresPasswordSetup: false });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als Rene anmelden" }));

    await waitFor(() => expect(loginAsReneMock).toHaveBeenCalledTimes(1));
  });

  it("fokussiert den Ein-Klick-Button und rendert Rene als Untertitel", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: "Als Rene anmelden" });
    await waitFor(() => expect(button).toHaveFocus());
    expect(screen.queryByLabelText("E-Mail")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Passwort")).not.toBeInTheDocument();
    expect(screen.getByText("Rene Rose")).toHaveClass("text-steel-500");
  });

  it("zeigt Fehler aus fehlgeschlagenem Ein-Klick-Login", async () => {
    loginAsReneMock.mockRejectedValue(new Error("Authentication required"));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als Rene anmelden" }));

    expect(await screen.findByText("Authentication required")).toBeInTheDocument();
  });
});
