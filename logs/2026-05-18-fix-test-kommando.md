# Log: Test-Kommando

**Datum:** 18.05.26  
**Schritt:** Fix — Test-Kommando präzisieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Kurzkommando `test` wurde in `agents.md` präzisiert. Der vollständige Testlauf umfasst jetzt ausdrücklich API-Tests, Web-Tests und Browser-/E2E-Tests und wird seriell ausgeführt. Außerdem wurde festgelegt, dass ein fehlgeschlagenes Kommando den weiteren Testlauf nicht abbricht. Der Ergebnisbericht muss künftig ausgeführte, grüne, rote, übersprungene und blockierte Tests zählen und Infrastrukturfehler getrennt von fachlichen Testfehlern ausweisen. Fehler werden anschließend in testseitig lösbare Probleme und produktionscode-relevante Probleme gruppiert; letztere werden nach Schweregrad absteigend sortiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Kurzkommando `test` und voller Testlauf inklusive Browser-/E2E-Tests präzisiert |
| `logs/2026-05-18-fix-test-kommando.md` | neu | Schritt-Log für diese Änderung |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
