# Log: Dashboard Tests und Verifikation

**Datum:** 22.05.26  
**Schritt:** 3 — Dashboard Tests und Verifikation  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für die Dashboard-Domäne wurden API-Integrationstests, Web-Unit-Tests und Browser-Tests ergänzt. Die API-Tests decken Standarddashboards, Rollen, persönliche Defaults, Admin-Defaults sowie echte Widgetdaten für Aufgaben, Tickets und Kommentare ab. Die Web-Unit-Tests sichern Grid-Reihenfolge, Full-Width-Layout und Editor-Save-Pfade. Der neue Browser-Test prüft mit echten Daten die Projektübersicht sowie den Editor inklusive Pointer-Drag und Persistenz.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/dashboard.test.ts` | neu | Rechte, Defaults und Versionierung der Dashboard-API |
| `tests/integration/api/dashboard-widgets.test.ts` | neu | Widgetdaten für Aufgaben, Tickets und Kommentare |
| `tests/unit/web/components/dashboard/DashboardGrid.test.tsx` | neu | Grid-Reihenfolge und Full-Width-Klasse |
| `tests/unit/web/components/dashboard/DashboardBuilder.test.tsx` | neu | Editor-Save-Pfade und Widgetpayload |
| `tests/browser/web/dashboard.spec.ts` | neu | Browserpfad mit echten Daten und Drag-and-Drop |

## Probleme und Abweichungen

Die neu ergänzten Dashboard-Tests sind grün. Der vollständige Browserlauf `npm run e2e -w apps/web` ist jedoch nicht vollständig grün: 45 von 57 Tests liefen durch, 12 bestehende Browserfälle aus Feature-, Freshness-, Owner-Task-, Projekt- und Ticket-Specs schlugen fehl. Die Dashboard-Spec selbst war im vollständigen Lauf grün. Gemäß Testregel wurden die fremden Fehler nicht nebenbei gefixt.

## Offene Punkte / Folgeaufgaben

Die bestehenden E2E-Fehler sollten separat triagiert werden. Auffällig sind unter anderem URL-Erwartungen mit `returnTo`, Strict-Mode-Konflikte durch mehrere `role="status"`-Regionen und ein Erwartungsfehler im Projekt-Aufgaben-Tab.
