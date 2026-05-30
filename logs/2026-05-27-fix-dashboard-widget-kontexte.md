# Log: Dashboard Widget Kontexte

**Datum:** 27.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dashboard-Widgetdaten für Startseite und globale Dashboards wurden vereinheitlicht. Kommentare ohne Owner liefern nun globale Kommentaraktivität statt nur selbst erstellte Kommentare und werden nach `updatedAt` sortiert, damit kürzlich bearbeitete Kommentare im Widget erscheinen. Die globale Kommentaraktivität umfasst Projekt-, Meilenstein-, Aufgaben-, Ticket-, Feature-, Use-Case-, Backlog- und Wiki-Kommentare. Dateien ohne Owner liefern ebenfalls globale Dateiaktivität inklusive Feature-Dateien; der bestehende Spezialfilter `mine=true` bleibt für eigene Kommentare und Dateien erhalten. Meilenstein-Widgets laden ohne Owner globale Meilensteine statt leer zu bleiben, während projektbezogene Meilenstein-Widgets weiter auf das jeweilige Projekt eingegrenzt bleiben. Die Tests wurden auf API-Integrationsebene mit echter Fastify-App, echter isolierter SQLite-Test-DB, echten Sessions/Rollen und ohne Mocks erweitert; zusätzlich sichert ein Web-Unit-Test den no-owner Meilenstein-Pfad im Dashboard-API-Client ab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/comments.service.ts` | geändert | Globale no-owner Kommentare, `mine=true`-Filter und `updatedAt`-Sortierung ergänzt |
| `apps/api/src/routes/comments.ts` | geändert | `mine` an den Kommentar-Service weitergereicht |
| `apps/api/src/services/attachments.service.ts` | geändert | Globale no-owner Dateien und `mine=true`-Filter ergänzt |
| `apps/api/src/routes/attachments.ts` | geändert | `mine` an den Datei-Service weitergereicht |
| `apps/web/src/api/dashboard.ts` | geändert | Meilenstein-Widgets ohne Owner laden globale Meilensteine |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Kommentar-Widget zeigt das Aktualisierungsdatum und verlinkt Wiki-/Backlog-Träger |
| `packages/shared-types/src/index.ts` | geändert | `RecentComment.updatedAt` ergänzt |
| `tests/integration/api/dashboard-widgets.test.ts` | geändert | No-owner Widgetdaten, globale Aktivität, `mine=true` und Datei-Uploads abgesichert |
| `tests/unit/web/api/dashboard.test.ts` | neu | Dashboard-API-Client für no-owner Meilenstein-Widgets abgesichert |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Kommentar-Links für Wiki- und Backlog-Träger abgesichert |

## Probleme und Abweichungen

Der erste fokussierte API-Testlauf war durch fehlende Test-Isolation für `PREVIEW_CACHE_DIR` blockiert, weil das erweiterte Widgetdaten-Setup Attachment-Routen registriert. Die Testdatei wurde um einen temporären Preview-Cache ergänzt; danach lief der fokussierte API-Test grün. Keine Produktionsabweichung.

## Offene Punkte / Folgeaufgaben

Keine.
