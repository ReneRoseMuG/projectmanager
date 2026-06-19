# Log: Wiki Autosave Lost Update (TKT-129)

**Datum:** 19.06.26  
**Uhrzeit:** 09:36:00  
**Schritt:** Fix — TKT-129 Wiki-Autosave Lost Update  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

**TKT-129:** Autosave überschrieb externe Änderungen an einer Wiki-Seite still, weil als `expectedVersion` die Live-Cache-Version (`wiki.page.version`) statt der Version des im Editor geladenen Inhalts (`baseVersion`) verwendet wurde. Bei parallelem Bearbeiten (z. B. über MCP + Web-UI) konnte so der externe Stand verloren gehen.

**Kernursache:** `autoSaveInlineForm` in `WikiPage.tsx` las `wiki.page.version` zur Laufzeit aus — diese wird nach jedem Refetch aktualisiert. Eine extern gespeicherte Version erhöhte die Versionsnummer im Cache, aber der Editor zeigte noch den alten Stand. Der nächste Autosave sendete die neue Versionsnummer als `expectedVersion` und überschrieb die externe Änderung damit erfolgreich (kein 409).

**Fix:** `baseVersionRef` im `WikiPageForm` verfolgt die Version des zuletzt erfolgreich geladenen oder gespeicherten Stands:

- Initialisierung auf `page.version` beim Formularöffnen (+ bei `resetCount`-Erhöhung).
- Nach erfolgreichem Autosave: `baseVersionRef.current = result.version` (Antwort vom Server).
- Beim Autosave: `expectedVersion = baseVersionRef.current` statt `wiki.page.version`.
- Bei 409: Fehler wird in der `save`-Callback gefangen, `conflictDetected = true` gesetzt, Fehler NICHT weitergereicht (→ `useAutoSave` sieht Erfolg, kein generischer Error-State).
- Konflikt-Banner zeigt „Neu laden" (refetcht Server-Stand, setzt `resetCount` hoch) und „Trotzdem speichern" (`baseVersionRef = page.version`, `flush()`).

## Geänderte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | `isConflictError`, `baseVersionRef`, `conflictDetected`, `resetCount`, Konflikt-Banner, `handleForceOverwrite`, `handleReload`; `onAutoSave`-Signatur um `baseVersion`-Parameter erweitert; `onReloadRequested`-Prop hinzugefügt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | `autoSaveInlineForm` nimmt `baseVersion`-Parameter, gibt `{ version }` zurück; `handleReloadRequest` hinzugefügt; beides an inline `WikiPageForm` weitergereicht |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | `makeConflictError`-Hilfsfunktion + 3 neue TKT-129-Tests: baseVersion-Weiterleitung, 409-Banner, Trotzdem-speichern-Flow |

## Testergebnis

- 40/40 Wiki-Unit-Tests grün (davon 24 in `WikiPageForm.test.tsx`, inkl. 3 neue)
- TypeScript sauber

Vorhandene Pre-existing Failures (andere Komponenten) — nicht durch diese Änderung verursacht.

## Offene Punkte / Folgeaufgaben

- TKT-65: Task zwischen Meilensteinen verschieben
