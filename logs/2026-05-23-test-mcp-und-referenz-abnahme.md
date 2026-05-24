# Log: MCP und Referenz Abnahme

**Datum:** 23.05.26  
**Schritt:** Test — MCP und Objekt-Referenzen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Testentwurfs-Skill wurde angewendet. Betroffen sind MCP-Unit-Tests, MCP-Integrationstests mit echter Fastify-App und isolierter Temp-SQLite-Datenbank sowie Web-Unit-Tests für Referenzlogik, Clipboard-Button und Detail-Hero-Platzierung. Bewiesen wird: Update/Create/Resolve-Tools arbeiten über echte Tooldefinitionen, `resolve_reference` löst Kurzreferenzen case-insensitive auf, und die UI kopiert Referenzen ohne Toast mit sichtbarem Icon-Feedback. Die gezielt betroffenen Tests und Builds sind grün. Der vollständige Web-Testlauf bleibt wegen bereits vorhandener Klassen-Erwartungen außerhalb dieser Änderung rot.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/utils/references.test.ts` | neu | Präfix-Konvention für alle sechs Objekttypen |
| `tests/unit/web/components/ui/CopyReferenceButton.test.tsx` | neu | Clipboard- und Event-Bubbling-Verhalten |
| `tests/unit/web/components/ui/FormModal.test.tsx` | geändert | Hero-Copy-Button in Page-Variante abgesichert |

## Probleme und Abweichungen

`npm run test -w apps/web` schlägt weiterhin fehl. Die roten Fälle betreffen bestehende Klassen-Erwartungen in `ProjectForm.test.tsx`, `ListBoardView.test.tsx`, `ActionMenu.test.tsx` und `StatusPill.test.tsx`; sie beziehen sich auf ViewToggle-/ActionMenu-/StatusPill-Klassen und nicht auf die neue Referenzfunktion. Diese Fehler wurden gemäß Testregel nicht nebenbei behoben.

## Offene Punkte / Folgeaufgaben

Die bestehenden Web-Test-Erwartungen für ViewToggle, ActionMenu und StatusPill sollten in einem separaten Folgeauftrag bereinigt oder an den aktuellen UI-Stand angepasst werden.
