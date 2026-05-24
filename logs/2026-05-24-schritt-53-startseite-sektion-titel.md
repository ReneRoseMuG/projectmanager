# Log: Startseite Sektion-Titel

**Datum:** 24.05.26  
**Schritt:** 53 — TASK-53 Startseite — Sektion-Titel vereinheitlichen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Startseite zeigt nun einen eigenen Abschnittstitel „Dashboard" direkt oberhalb des Home-Dashboards und einen gleichartig gestylten Abschnittstitel „Kalender" oberhalb der Kalender-Vorschau. Die bisherige Zwischenüberschrift „Startseiten-Dashboard" wird auf der Startseite über eine interne Dashboard-Anzeigeoption ausgeblendet. Der Infotext „Kommende Termine und fällige Aufgaben." unter dem Kalender-Titel wurde entfernt. Die bestehenden Permission-, Lade-, Fehler- und Kalenderdatenpfade der Startseite bleiben unverändert.

Der Testentwurfs-Skill `projekt-manager-test-entwurfsleitplanken` wurde angewendet. Abgedeckte Testebenen: Unit/jsdom für Startseiten-Verdrahtung mit isolierten Dashboard-/Kalender-Kindkomponenten; Browser/E2E für echte Root-Route, Home-Dashboard und Kalender-Vorschau mit isolierter E2E-Testinstanz.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/StartPage.tsx` | geändert | Einheitliche Sektionstitel für Dashboard und Kalender ergänzt, Kalender-Infotext entfernt |
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Interne Option zum Ausblenden des Inline-Headers ergänzt |
| `tests/unit/web/pages/StartPage.test.tsx` | geändert | Erwartungen für neue Abschnittstitel und entfernte Texte ergänzt |
| `tests/browser/web/start-page.spec.ts` | geändert | E2E-Erwartungen für Abschnittstitel und entfernte Texte ergänzt |

## Probleme und Abweichungen

Der direkt betroffene Browserlauf `npm run e2e -w apps/web -- page-hero-alignment.spec.ts start-page.spec.ts` ist grün. Der vollständige Browserlauf `npm run e2e -w apps/web` bleibt wegen zwei Auth-Tests außerhalb des TASK-53-Scopes rot. `npm run lint -w apps/web` bleibt wegen eines ungenutzten Imports in `ListBoardView.tsx` rot; diese Datei wurde im Rahmen von TASK-53 nicht geändert.

## Offene Punkte / Folgeaufgaben

Die Auth-E2E-Erwartungen nach Login und der ungenutzte `CirclePlus`-Import sollten separat bearbeitet werden.
