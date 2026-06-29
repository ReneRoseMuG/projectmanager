# Log: Wiki Tree Frontend State

**Datum:** 29.06.26  
**Uhrzeit:** 06:40:41  
**Schritt:** 2 — Frontend-UX  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Wiki-Tree liest seinen Anzeigezustand nicht mehr aus `localStorage` und hält die eingeklappten Seiten nicht mehr nur intern im React-State. Stattdessen steuert `WikiPage` den Zustand über den neuen Hook `useWikiTreeState`, der optimistisch aktualisiert und dauerhaft in das USER-Setting schreibt. `WikiTree` ist dadurch kontrolliert: Ein- und Ausklappen meldet den nächsten Tree-State nach außen, und die Sidebar offen/geschlossen wird ebenfalls serverseitig gespeichert. D&D liefert jetzt immer die vollständige Zielreihenfolge an den Parent, damit das Backend den Move als einen atomaren Vorgang speichern kann. Während Wiki-Daten oder Settings noch laden, bleibt die Skeleton-Ansicht aktiv, damit der Tree nicht kurz in einen falschen Default-Zustand springt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useWikiTreeState.ts` | neu | Hook für serverseitigen, optimistischen Wiki-Tree-State |
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Tree-State kontrolliert, `localStorage` entfernt, D&D-Zielreihenfolge erweitert |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Wiki-Tree-State und atomare Move-Mutation verdrahtet |
| `apps/web/src/hooks/useWiki.ts` | geändert | Move-Mutation ergänzt |
| `apps/web/src/api/wiki.ts` | geändert | API-Client für `wiki/tree/move` ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
