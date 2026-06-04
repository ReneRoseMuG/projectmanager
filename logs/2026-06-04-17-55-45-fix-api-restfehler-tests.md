# Log: API-Restfehler Tests

**Datum:** 04.06.26  
**Uhrzeit:** 17:55:45  
**Schritt:** Fix  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die vier zuletzt analysierten roten API-Fälle wurden testseitig adressiert. Die Catalog-DELETE-Tests lesen die zu löschenden Katalog-IDs nun direkt aus der aktuellen Testdatenbank, damit sie nicht von gecachten API-Listenwerten abhängen. Zusätzlich setzt der Catalog-Test nach `truncateAll` den Service-Cache über einen kleinen API-Create/Delete-Zyklus zurück, damit direkte DB-Resets und Service-Cache wieder synchron sind. Der Dashboard-Widget-Test verwendet für die Aufgabe „In Arbeit“ ein stabiles Zukunftsdatum, damit dieser Datensatz nicht abhängig vom aktuellen Kalendertag in der Überfällig-Liste landet. Produktionscode wurde nicht geändert.

Testleitplanken: API-Integrationsebene, reale Test-DB über die vorhandenen Fixtures, keine Mocks, Dateisystem-Isolation unverändert über `tests/.runtime` beziehungsweise Temp-Verzeichnisse. Bewiesen werden soll das beobachtbare API-Verhalten beim Katalog-Löschen mit Fallbacks sowie die Abgrenzung zwischen Recent Tasks und Overdue Tasks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/catalogs.test.ts` | geändert | Katalog-DELETE-Tests gegen stale Cache/IDs isoliert |
| `tests/integration/api/dashboard-widgets.test.ts` | geändert | Zeitabhängiges Nicht-Overdue-Datum stabilisiert |
| `logs/2026-06-04-17-55-45-fix-api-restfehler-tests.md` | neu | Schritt-Log für die Test-Fixes |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der gezielte Nachtest wurde durch Nutzerunterbrechung beendet, bevor das Ergebnis nach dem letzten Cache-Reset vorlag. Ein vorheriger gezielter Lauf zeigte bereits, dass die ursprünglichen drei 404-DELETE-Fehler und der Dashboard-Overdue-Fehler nicht mehr auftraten, offenbarte aber noch einen Folgefehler durch den Catalog-Service-Cache nach einem DELETE. Genau dafür wurde anschließend der zusätzliche Cache-Reset im Test ergänzt.

## Offene Punkte / Folgeaufgaben

Den gezielten API-Lauf für `catalogs.test.ts` und `dashboard-widgets.test.ts` erneut ausführen. Danach den vollständigen API-Testlauf erneut starten und den Gesamtstatus berichten.
