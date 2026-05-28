# Log: TKT-32 Kommentar Realtime Nachtrag

**Datum:** 28.05.26  
**Uhrzeit:** 17:58:56  
**Schritt:** Nachtrag — TKT-32 Kommentar-Realtime-Invalidierung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Dieser Nachtrag dokumentiert den aktuellen Stand nach der Umsetzung zu TKT-32. Die Realtime-Scope-Erkennung wurde bereits so geändert, dass verschachtelte Kommentar-Routen als `comments` invalidiert werden. Der API-Integrationstest für diesen Fall ist grün, ebenso API- und Web-Typecheck. Die Browser-Abnahme ist noch nicht fachlich abgeschlossen, weil die E2E-Suite bereits beim Login-Helfer auf ein nicht mehr vorhandenes E-Mail-Feld wartet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-28-17-58-56-nachtrag-tkt-32-kommentar-realtime.md` | neu | Manueller Nachtrags-Log zum TKT-32-Stand |
| `logs/README.md` | geändert | Log-Index um diesen Nachtrag ergänzt |

## Probleme und Abweichungen

Die Browser-Tests sind weiterhin durch die aktuelle Login-UI blockiert. Der Snapshot zeigt den Button „Als Rene anmelden“, während der Test-Helfer `getByLabel("E-Mail")` verwendet. Gemäß Testregel wurde daraus kein eigenständiger Produktions- oder Test-Fix abgeleitet.

## Offene Punkte / Folgeaufgaben

Der Playwright-Login-Helfer muss in einem separaten Auftrag an den Ein-Klick-Login angepasst werden. Danach sollte `npm run e2e -w apps/web -- tests/browser/web/realtime.spec.ts` erneut laufen, um den TKT-32-Browsernachweis abzuschließen.
