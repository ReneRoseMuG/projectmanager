# Log: Progressives Nachladen ersetzt Seitenzahl-Pagination

**Datum:** 04.07.26
**Uhrzeit:** 13:06:59
**Schritt:** Feature — Listen und Boards laden progressiv/sequenziell statt per Seitenzahlen
**Status:** ✅ Abgeschlossen (Typecheck API + Web grün)

## Was wurde umgesetzt

Auf Nutzerwunsch wurde die zuvor gebaute Seitenzahl-Pagination im Frontend durch **progressives, sequenzielles Nachladen** ersetzt (Seitenzahlen passen konzeptionell nicht zu Kanban-Boards und wirken auch in Listen unelegant). Das Backend blieb unverändert — die opt-in-paginierte API (`?page=&pageSize=` + `total`) dient jetzt als Chunk-Quelle.

- **Zentraler Hook** `useProgressiveList(queryKey, fetchPage, opts)`: nutzt TanStack `useInfiniteQuery`; lädt den ersten Block sofort und danach die weiteren Blöcke **einen nach dem anderen** automatisch nach (nächster Abruf erst nach Abschluss des vorigen → nie mehr als ein Request gleichzeitig, Pool wird nie geflutet), mit kleiner Pause (Default 50 pro Block, 200 ms) fürs flüssige Rendern. Gibt `items, total, loadedCount, loading, loadingMore, isComplete, error` zurück.
- **UI-Komponente** `LoadMoreIndicator` (ersetzt `Pagination`): dezenter „Lädt … X von Y"-Hinweis, blendet sich aus, wenn alles geladen ist.
- **Umgestellt (Library-Hook + Seite):** Dokumente, Notizen, Projekte, Features, Meilensteine, Tickets.
- **Board-Ansichten progressiv verdrahtet:** Aufgaben-Board und Backlog-Board laden jetzt blockweise progressiv statt alles auf einen Schlag; das Board füllt sich sichtbar.
- **Entfernt:** `components/ui/Pagination.tsx` und `hooks/usePagination.ts` (verwaist).
- Serverseitige Filter/Suche bleiben erhalten und gehen in jeden Chunk-Abruf; Filterwechsel startet das progressive Laden automatisch neu (queryKey-Wechsel).

## Geänderte / angelegte Dateien

Neu: `apps/web/src/hooks/useProgressiveList.ts`, `apps/web/src/components/ui/LoadMoreIndicator.tsx`.
Geändert: je Domäne `hooks/*` + `pages/*` (+ `api/tasks.ts` um `getTasksPage`, `components/projects/ProjectForm.tsx` fürs Backlog-Board).
Entfernt: `components/ui/Pagination.tsx`, `hooks/usePagination.ts`.
Backend: unverändert.

## Probleme und Abweichungen

- **Umsetzung via parallele Subagents** (8 Domänen, disjunkte Stacks) + zentrales Fundament (Hook/Indikator) durch mich; Absicherung durch Typecheck (API + Web grün).
- **Backlog-Board:** Der Alt-Hook `useBacklog` läuft im `ProjectForm` weiter parallel (liefert Mutationen + Tab-Badge-Count) — dessen Voll-Array-Query feuert also weiterhin einmal. Bewusst so belassen, um `useBacklog` (Alt) nicht anzufassen; kleiner Overhead, kein Funktionsproblem.
- **Aufgaben-Board:** serverseitige Filter (`status`/`q`) sind angebunden, aber ungenutzt (leerer Filter, Verhalten identisch zu vorher); clientseitige Filter greifen weiter über der geladenen Menge.

## Offene Punkte / Folgeaufgaben

- Bei sehr großen Mengen (viele Tausend) landet am Ende alles im DOM — progressives Laden entlastet Server und Übertragung, das reine Rendern sehr vieler Zeilen wäre ein separater Schritt (Virtualisierung).
- Design-Leitfaden: neues Muster (progressives Nachladen + `LoadMoreIndicator`) ergänzen — Formulierungsvorschlag im Chat, Aufnahme nach Freigabe.
- Keine Testläufe (auf Nutzerwunsch).
