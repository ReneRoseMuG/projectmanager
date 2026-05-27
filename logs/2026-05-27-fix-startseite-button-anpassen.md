# Log: Startseite Button Anpassen

**Datum:** 27.05.26  
**Schritt:** Fix — Startseiten-Dashboard-Button umbenennen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Dashboard-Anpassungsbutton wurde von „Tab-Editor“ in „Anpassen“ umbenannt. Geändert wurden die sichtbare Button-Beschriftung, `aria-label` und `title`, damit Screenreader-Name, Tooltip und UI-Text konsistent sind. Da der Button aus der gemeinsamen `DashboardView` kommt, gilt die Beschriftung für die betroffenen Dashboard-Kontexte einheitlich. Die Browser-Tests wurden auf den neuen Button-Namen angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Button-Text, `aria-label` und `title` auf „Anpassen“ geändert |
| `tests/browser/web/start-page.spec.ts` | geändert | Startseiten-E2E-Selektor auf „Anpassen“ aktualisiert |
| `tests/browser/web/dashboard.spec.ts` | geändert | Dashboard-E2E-Selektoren auf „Anpassen“ aktualisiert |
| `logs/2026-05-27-fix-startseite-button-anpassen.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Ein erster E2E-Aufruf mit Workspace-relativen Dateipfaden fand keine Tests. Ein zweiter Root-Aufruf startete ohne die Web-Workspace-Playwright-Konfiguration und scheiterte deshalb an fehlender Base-URL bzw. nicht gestarteter API. Der korrekt konfigurierte Lauf über `npm run e2e -w apps/web -- start-page.spec.ts dashboard.spec.ts` war anschließend erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
