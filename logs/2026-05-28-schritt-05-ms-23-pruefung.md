# Log: MS-23 Prüfung

**Datum:** 28.05.26  
**Schritt:** 5 — Serieller Prüflauf und Abnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die vorgesehenen Prüfungen wurden seriell gestartet. `npm run build` ist vollständig grün und baut Shared Types, API, MCP-Server und Web. Die fokussierten Web-Tests für MS-23 sind grün: DashboardPicker, DashboardWidgets, Query-Invalidierung und WeekCalendar liefen mit 32 erfolgreichen Tests. Die neue Migration wurde separat auf die lokale Dev-DB angewendet; danach hatte `day_plans` kein `notes`-Feld mehr, `day_plan_notes` und `day_plan_comments` existierten und `foreign_key_check` meldete keine Fehler.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/README.md` | geändert | Log-Index um MS-23-Einträge ergänzt |
| `logs/2026-05-28-schritt-04-ms-23-tests.md` | neu | Teständerungen und Blocker dokumentiert |
| `logs/2026-05-28-schritt-05-ms-23-pruefung.md` | neu | Seriellen Prüflauf dokumentiert |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` scheitert am bestehenden Drizzle-CLI/Meta-Zustand. `npm run db:migrate -w apps/api`, `npm run test -w apps/api` und `npm run e2e -w apps/web` scheitern am fehlenden Migrations-SQL `0000_special_shaman.sql`. `npm run test -w apps/web` läuft größtenteils grün, hat aber einen bestehenden Fehler in `FeatureForm.test.tsx`: `feature-form-content-view` hat `data-image-upload="enabled"` statt erwartet `disabled`.

## Offene Punkte / Folgeaufgaben

Keine MS-23-Codeänderung ist aufgrund der Prüfergebnisse unmittelbar offen. Für vollständige Abnahme müssen der Migrations-Journal-Blocker und der fachfremde FeatureForm-Testfehler separat behoben und danach die blockierten Testläufe wiederholt werden.
