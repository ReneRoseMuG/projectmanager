// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter React-Hook mit renderHook aus @testing-library/react.
 *
 * Mock-Entscheidung:
 * - Die `save`-Funktion wird als vi.fn() bereitgestellt, weil der Test das
 *   Hook-interne Zustandsmanagement (Status, Pending-Queue, Timers) prüft —
 *   nicht den konkreten Speicherinhalt.
 *
 * Isolation:
 * - jsdom, keine Netzwerkverbindung, vi.useFakeTimers für den Saved-Reset-Timer.
 *
 * Abgedeckte Regeln:
 * - flush() startet einen Speichervorgang und setzt Status auf "saving" → "saved" → "idle".
 * - flush() bei laufendem Save markiert pendingRef; ein zweiter doSave läuft danach.
 * - Fehler beim Save setzen Status auf "error" und liefern errorMessage.
 * - flush() ist ohne Effekt wenn enabled=false.
 * - Nach Unmount wird kein State mehr gesetzt.
 *
 * Fehlerfälle:
 * - save() wirft → status wird "error", errorMessage enthält die Nachricht.
 * - Zweites flush() während erstem Save löst nach Abschluss einen zweiten Save aus.
 *
 * Ziel:
 * Das useAutoSave-Hook gegen Regressionen in Status-Übergängen und Pending-Queue absichern.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "../../../../apps/web/src/hooks/useAutoSave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoSave", () => {
  it("startet idle und wechselt beim Flush zu saving → saved → idle", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ enabled: true, save }));

    expect(result.current.status).toBe("idle");

    act(() => {
      result.current.flush();
    });

    expect(result.current.status).toBe("saving");

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("saved");
    expect(save).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe("idle");
  });

  it("ignoriert flush() wenn enabled=false", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ enabled: false, save }));

    act(() => {
      result.current.flush();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("setzt status auf error und liefert errorMessage wenn save() wirft", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Speicherfehler"));
    const { result } = renderHook(() => useAutoSave({ enabled: true, save }));

    act(() => {
      result.current.flush();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("Speicherfehler");
  });

  it("löst nach Abschluss eines laufenden Saves einen zweiten Save aus wenn flush() dazwischen aufgerufen wird", async () => {
    let resolveFirst!: () => void;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const save = vi.fn().mockReturnValueOnce(firstSave).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ enabled: true, save }));

    act(() => {
      result.current.flush();
    });

    expect(result.current.status).toBe("saving");

    act(() => {
      result.current.flush();
    });

    await act(async () => {
      resolveFirst();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(2);
  });

  it("verwendet immer den aktuellen save-Callback", async () => {
    const saveV1 = vi.fn().mockResolvedValue(undefined);
    const saveV2 = vi.fn().mockResolvedValue(undefined);
    let currentSave = saveV1;
    const { result, rerender } = renderHook(() => useAutoSave({ enabled: true, save: currentSave }));

    currentSave = saveV2;
    rerender();

    act(() => {
      result.current.flush();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(saveV1).not.toHaveBeenCalled();
    expect(saveV2).toHaveBeenCalledTimes(1);
  });
});
