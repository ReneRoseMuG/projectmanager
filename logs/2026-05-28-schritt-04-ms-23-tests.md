# Log: MS-23 Tests

**Datum:** 28.05.26  
**Schritt:** 4 — Tests ergänzen und anpassen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die API-Integrationstests für persönliche Planung wurden an das entfernte `notes`-Feld angepasst und um DayPlan-Notizen, DayPlan-Kommentare sowie Fremd-User-Zugriff per DayPlan-ID erweitert. Die Dashboard-API-Tests prüfen jetzt den Kontext `dayPlan`, das erlaubte Widget `noteList` und das abgelehnte `attachmentJournal`. Im Web wurden Query-Invalidierung, DashboardPicker, `noteList`-Widget und das geänderte WeekCalendar-Label abgedeckt.

Testleitplanken angewendet: Integrationstests nutzen echte Fastify-App und echte temporäre SQLite-Testdatenbank; Web-Tests nutzen jsdom ohne API/DB; E2E wäre Playwright mit isolierter Runtime. Beweisen sollen die Tests vor allem: Datenmigration/Relationen ohne Datenverlust, Ownership-Schutz für persönliche Pläne, Dashboard-Widget-Katalog, Query-Invalidierung und UI-Regressionsschutz für Picker und noteList.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/day-plans.test.ts` | geändert | DayPlan-Notes/-Comments und Ownership-Tests ergänzt |
| `tests/integration/api/dashboard.test.ts` | geändert | `dayPlan`-Dashboard und `noteList` validiert |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | DayPlan-Notes/-Comments/Dashboards-Invalidierung ergänzt |
| `tests/unit/web/components/dashboard/DashboardPicker.test.tsx` | neu | Picker-Aktionen, Read-only-Zustand und localStorage getestet |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | noteList und DayPlan-Kommentarlink getestet |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Label auf „Persönliche Planung“ angepasst |

## Probleme und Abweichungen

Die API-Integrationstests konnten wegen fehlender Altmigrationsdateien nicht ausgeführt werden. Der Fehler tritt vor den eigentlichen Testfällen beim Aufbau der Testdatenbank auf: `0000_special_shaman.sql` fehlt, ist aber im bestehenden Migrations-Journal referenziert. Der vollständige Web-Testlauf hat zusätzlich einen bestehenden, fachfremden Fehler in `FeatureForm.test.tsx` gezeigt.

## Offene Punkte / Folgeaufgaben

Migrations-Journal reparieren und danach API-Integration sowie E2E erneut ausführen. Den bestehenden FeatureForm-Testfehler separat klären.
