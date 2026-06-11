# Log: Wiki-Export seitenlokale Bilder

**Datum:** 11.06.26  
**Uhrzeit:** 14:47:51  
**Schritt:** Fix — Wiki-Export seitenlokale Bilder  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Wiki-Export legt eingebettete Content-Bilder jetzt im jeweiligen Seitenordner ab. Dadurch enthält ein exportierter Seitenordner bzw. Wiki-Unterordner seine benötigten Bilddateien selbst unter `assets/images/` und kann ohne den Export-Root kopiert werden. Die HTML-Datei der Seite verweist auf `assets/images/<datei>` statt auf einen zentralen Root-Asset-Ordner. Gleichzeitig bleibt die robustere Erkennung von internen Bildquellen erhalten, inklusive Query-Strings und absoluten Browser-URLs.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki.service.ts` | geändert | Wiki-Export schreibt Content-Bilder seitenlokal in den jeweiligen Exportordner |
| `tests/integration/api/wiki.test.ts` | geändert | Integrationstest prüft Unterordner-Kopierbarkeit und seitenlokale Bildpfade |
| `logs/2026-06-11-14-47-51-fix-wiki-export-seitenlokale-bilder.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Testebene ist Integration/API mit echter Test-App, echter Testdatenbank und echtem temporärem Exportverzeichnis. Der Test soll beweisen, dass eine Wiki-Unterseite ihre Bilder im eigenen Ordner enthält und das exportierte HTML nur seitenlokale Bildpfade verwendet. Mocks werden nicht verwendet.

## Probleme und Abweichungen

Der gezielte Testlauf `npm run test -w apps/api -- wiki` wurde zweimal gestartet, scheiterte aber jeweils bereits beim Laden der Vitest-Konfiguration mit `spawn EPERM` im Vite/Rolldown-Startpfad. Es wurden keine Test-Assertions ausgeführt. Der API-Typecheck `npm run typecheck -w apps/api` war erfolgreich.

## Offene Punkte / Folgeaufgaben

Den blockierten Wiki-Integrationstest erneut ausführen, sobald der lokale `spawn EPERM`-Runner-Blocker nicht mehr auftritt.
