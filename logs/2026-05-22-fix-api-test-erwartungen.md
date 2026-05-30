# Log: API-Test-Erwartungen

**Datum:** 22.05.26  
**Schritt:** Fix — API-Test-Erwartungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Zwei veraltete API-Test-Erwartungen wurden an das aktuelle Verhalten angepasst. Der Content-Service-Test erwartet nun den ID-basierten Dateinamen `feature-42.md`, passend zur aktuellen `buildFilename`-Signatur ohne Slug-Anteil. Der Wiki-Import-Integrationstest sucht den importierten Use Case nun mit Doppelpunkt im Titel, konsistent zum dedizierten Wiki-Import-Test und zum importierten Markdown-Titel. Es wurde kein Produktionscode geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/api/services/content.service.test.ts` | geändert | Erwartung für ID-basierten Content-Dateinamen aktualisiert |
| `tests/integration/api/app.integration.test.ts` | geändert | Erwartung für importierten Use-Case-Titel korrigiert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `npm run test -w apps/api` wurde erfolgreich ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
