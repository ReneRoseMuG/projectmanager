# Log: Notizen Hauptnavigation

**Datum:** 01.07.26  
**Uhrzeit:** 11:11:23  
**Schritt:** Feature — Notizen in der Hauptnavigation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Auftrag wurde als Klasse 5 umgesetzt, weil Navigation, API, Frontend-State, Seite und Tests zusammenspielen. Für Notizen wurde ein geschützter globaler `GET /api/notes`-Endpunkt ergänzt, der vorhandene Notiz-DTOs nach Aktualität liefert und über den bestehenden Auth-Guard `notes:read` nutzt. Im Frontend wurde eine neue `/notes`-Hauptseite angebunden, der Sidebar-Eintrag „Notizen” unter „Tickets” ergänzt und die Darstellung über die bestehende statuslose `ListBoardView`-Logik mit Karten- und Listenmodus umgesetzt. Die globale Ansicht bietet bewusst keinen ownerlosen Erstellen-Button an, weil Notizen fachlich weiterhin an Projekte, Aufgaben, Tickets, Wiki-Seiten oder die persönliche Planung gebunden sind. Die Testentwurfsleitplanken wurden angewendet: API-Integrationstests prüfen echte HTTP-Routen und Auth-Fälle, Web-Unit-Tests prüfen echte Komponenten/Router-Navigation und Query-Invalidierung mit echtem QueryClient.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/notes.service.ts` | geändert | Globale Notizenliste `listNotes` ergänzt |
| `apps/api/src/routes/notes.ts` | geändert | `GET /notes` mit Response-Schema angebunden |
| `apps/web/src/api/notes.ts` | geändert | Web-API-Funktion `getNotes` ergänzt |
| `apps/web/src/hooks/useAllNotes.ts` | neu | TanStack-Query-Hook für globale Notizenliste und Löschen |
| `apps/web/src/queries/queryKeys.ts` | geändert | Globaler `notes.list()`-Query-Key ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Owner- und Detail-Invalidierung aktualisieren globale Notizenliste |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Loading, Empty-State-Text und Suche im Vorschautext ergänzt |
| `apps/web/src/pages/NotesPage.tsx` | neu | Hauptseite für statuslose Notizenübersicht |
| `apps/web/src/App.tsx` | geändert | `/notes`-Route mit `notes:read`-Gating ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationspunkt „Notizen” unter „Tickets” ergänzt |
| `tests/integration/api/notes.test.ts` | geändert | Globale Notizenliste über echte API getestet |
| `tests/integration/api/auth.test.ts` | geändert | 401/403/200-Schutz für globale Notizenroute ergänzt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Sidebar-Erwartungen und Gating für Notizen ergänzt |
| `tests/unit/web/pages/NotesPage.test.tsx` | neu | Hauptseiten-Darstellung, Suche und Detailnavigation getestet |
| `tests/unit/web/queries/notesInvalidation.test.ts` | neu | Query-Key und globale Notes-Invalidierung getestet |

## Probleme und Abweichungen

Graphify konnte die vorhandene Graph-Datei wegen eines lokalen `uv trampoline`-Pfadfehlers nicht abfragen; die Umsetzung wurde deshalb über gezielte Dateianalyse fortgeführt. Ein erster Web-Testversuch mit `tests/integration/web/queries/invalidation.integration.test.ts` brach an einem bestehenden, nicht auftragsbezogenen `queryKeys.dumps.localStatus()`-Fehler ab. Diese Datei wurde nicht geändert und nicht als Abnahme für diesen Auftrag verwendet; stattdessen wurde die neue Notes-Invalidierung in einem fokussierten Unit-Test abgesichert. Keine DB-Migration war nötig.

## Offene Punkte / Folgeaufgaben

Der bestehende `queryKeys.dumps`-Blocker im breiten Web-Query-Integrationstest bleibt außerhalb dieses Auftrags offen.
