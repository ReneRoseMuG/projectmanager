# Log: Test-only Fehlerbehebung

**Datum:** 17.05.26  
**Schritt:** Fix — Test-only Fehlerbehebung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurden ausschließlich Testdateien angepasst, für die kein Produktionscode geändert werden musste. Der API-Dump-Test nutzt für Preview-Caches nun konsequent ein isoliertes temporäres Testverzeichnis und stellt keine produktionsnahen Preview-Pfade in die Laufzeitkonfiguration zurück. Die E2E-Tests wurden an mehreren Stellen stabilisiert, indem ungenaue Text-Locator durch konkrete, sichtbezogene oder rollenbasierte Prüfungen ersetzt wurden. Mutationsschritte in den Browsertests warten jetzt auf die passende API-Antwort, bevor der anschließende Zustand geprüft wird. Damit sind API-, Web- und Browsertests wieder vollständig grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Isolierte Testpfade und sichere Wiederherstellung der Drive-Testkonfiguration |
| `apps/web/e2e/task.spec.ts` | geändert | Stabilere Locator, API-Waits und genaue Assertions für Task-CRUD-Flows |
| `apps/web/e2e/feature.spec.ts` | geändert | Exakte Heading- und Speicher-Waits für Feature-Relations |
| `apps/web/e2e/project.spec.ts` | geändert | Projekt-Feature-E2E-Fluss an tatsächlich verfügbare UI-Bedienung angepasst |
| `logs/2026-05-17-fix-test-only-fehler.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine Produktionscode-Änderungen waren für diese Testkorrekturen nötig. Beim Prüfen der Browserfehler stellte sich heraus, dass mehrere Tests den richtigen Zustand bereits erreicht hatten, aber wegen Strict-Mode-Mehrfachtreffern oder fehlenden API-Waits fehlschlugen.

## Offene Punkte / Folgeaufgaben

Keine.
