# Log: Seitenzahl-Pagination für Listen (Prio 4 des Datenzugriffs-Audits)

**Datum:** 04.07.26
**Uhrzeit:** 12:43:03
**Schritt:** Feature — serverseitige Seitenzahl-Pagination über die Haupt-Listen
**Status:** ✅ Abgeschlossen (technisch vollständig, Typecheck grün; eine Board/Kanban-Designfrage benannt)

## Was wurde umgesetzt

Abschluss des Datenzugriffs-Audits: Große Listen laden nicht mehr alle Zeilen ins Frontend, sondern seitenweise. Vom Nutzer gewählte Darstellung: **Seitenzahlen**.

- **Fundament:** generischer Typ `Paginated<T>` (shared-types), `paginationQuerySchema` + `paginatedResponseSchema` (route-schemas), wiederverwendbare UI-Komponente `components/ui/Pagination.tsx` (Vor/Zurück, Ellipsis, „X–Y von Z"; blendet sich bei ≤1 Seite aus), State-Hook `usePagination`.
- **Rückwärtskompatibel (opt-in):** Ohne `page`-Query liefert jede Route weiterhin das bisherige nackte Array — MCP-Server und interne Aufrufer bleiben unberührt. Mit `page` → `Paginated<T>`.
- **Serverseitige Filter/Suche:** Die bislang clientseitige Filter-/Suchlogik der Listen wurde serverseitig nachgebaut (echte SQL-Pagination `WHERE`+`ORDER BY`+`LIMIT/OFFSET`+`COUNT(*)` wo möglich; nur die Seiten-Zeilen werden angereichert). Für die Nutzer bleibt das Filtern gleich, es wird nur serverseitig ermittelt.
- **Voll umgesetzt (Backend + Frontend):** Dokumente, Notizen, Projekte, Features, Meilensteine.
- **Backend paginierbar, UI bleibt Board:** Aufgaben und Backlog (Kanban-/Board-Ansichten) — Seitenzahlen würden die Spalten zerschneiden; das Backend ist vorbereitet.
- **Tickets:** nach der ersten Umsetzung an das saubere Projekt-Muster angeglichen (Server-Filter verdrahtet).

## Geänderte / angelegte Dateien

Umfang: ~70 Dateien. Kern: `packages/shared-types/src/index.ts`, `apps/api/src/utils/route-schemas.ts`, je Domäne `routes/*` + `services/*` + `repositories/*`, `apps/web/src/queries/queryKeys.ts`, je Domäne `api/*` + `hooks/*` + `pages/*` + `components/*/*ListBoardView.tsx`, neu: `components/ui/Pagination.tsx`, `hooks/usePagination.ts`, `docs/audit-datenzugriffe.md`.

## Probleme und Abweichungen

- **Umsetzung via parallele Subagents** über disjunkte Domänen-Stacks; `queryKeys.ts` zentral vorab erweitert, um Konflikte zu vermeiden. Zentrale Absicherung durch Typecheck (API + Web grün) und Review der Referenz (DMS) sowie der Board-Angleichung (Tickets). Ein Generics-Typfehler (`mapWithBoundedConcurrency`) wurde behoben.
- **Board/Kanban + Seitenzahlen (Designfrage, benannt):** Listen mit ViewToggle (Projekte/Meilensteine/Features/Tickets) zeigen im Kanban-Modus die paginierte Seite als Ausschnitt über die Statusspalten — funktional und serverseitig gefiltert, aber konzeptionell eigenwillig. Saubere Option für später: Pagination nur im Listen-Modus.
- **Chip-Counts** basieren weiter auf der vollen Liste (unverändertes Verhalten); serverseitige `GROUP BY`-Counts wären ein Folgeschritt.
- **Design-Leitfaden:** Der Stop-Hook meldete das neue UI-Muster. Formulierungsvorschlag für `docs/design-leitfaden.md` liegt im Chat; Aufnahme nach Freigabe (nicht ungefragt geändert).

## Offene Punkte / Folgeaufgaben

- Board/Kanban-Pagination sauber lösen (Pagination nur im Listen-Modus + Kanban-Virtualisierung) — Bedienkonzept-Entscheidung.
- Chip-Gesamt-Counts serverseitig aggregieren.
- Notiz-Suche: serverseitig `LIKE` auf HTML-Content vs. clientseitig gerenderter Text (Randfälle) — im Notizen-Log dokumentiert.
- Keine Testläufe (auf Nutzerwunsch); Integrationstests der paginierten Endpunkte wären sinnvoll, sobald die Test-DB greift.
