# Log: Owner Task E2E Selector

**Datum:** 22.05.26  
**Schritt:** Fix — Owner Task E2E Selector  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Browser-Test-Helper für das Verknüpfen von Owner-Aufgaben wurde präzisiert. `linkTaskInBoard` klickt im Dialog nicht mehr den letzten generischen Button mit der Beschriftung `Verknüpfen`, sondern sucht zuerst die Kandidatenzeile mit exakt dem erwarteten Aufgabentitel und klickt dann den Button innerhalb dieser Zeile. Damit ist der Test nicht mehr abhängig von der Reihenfolge mehrerer Suchtreffer, die durch das gekürzte Suchfeld denselben Präfix teilen können. Produktcode, API, Datenmodell, Rollen und Berechtigungen wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/browser/web/owner-tasks.spec.ts` | geändert | Link-Dialog klickt exakt die Kandidatenzeile mit dem erwarteten Titel |
| `logs/2026-05-22-fix-owner-task-e2e-selector.md` | neu | Schritt-Log für den Testfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Analyseannahme hat sich bestätigt: Der rote Browserlauf wurde durch eine mehrdeutige Testauswahl im Dialog ausgelöst, nicht durch die Owner-Task-API.

## Offene Punkte / Folgeaufgaben

Optional kann später geprüft werden, ob das generische Suchfeld in Link-Dialogen wirklich auf 15 Zeichen begrenzt bleiben soll. Für diesen Testfix ist das nicht erforderlich.
