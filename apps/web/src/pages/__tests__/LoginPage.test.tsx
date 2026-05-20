// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - LoginPage sendet E-Mail und Passwort an den Auth-Hook.
 * - Serverfehler werden als sichtbare Fehlermeldung gerendert.
 *
 * Fehlerfälle:
 * - Fehlgeschlagener Login bleibt auf der Seite und zeigt den API-Fehler.
 *
 * Ziel:
 * Den Login-Screen gegen Formular- und Fehlerregressionen absichern.
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../LoginPage";

const loginMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: loginMock,
    loginPending: false
  })
}));

afterEach(() => {
  cleanup();
  loginMock.mockReset();
});

describe("LoginPage", () => {
  it("sendet Login-Daten an den Auth-Hook", async () => {
    loginMock.mockResolvedValue({ requiresPasswordSetup: false });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith({ email: "user@example.test", password: "password123" }));
  });

  it("zeigt Fehler aus fehlgeschlagenem Login", async () => {
    loginMock.mockRejectedValue(new Error("Invalid email or password"));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });
});
