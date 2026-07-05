# Log: Parent Context Referenz

**Datum:** 05.07.26  
**Uhrzeit:** 07:55:34  
**Schritt:** Fix - Parent Context Referenz  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`ParentContextField` zeigt Parent-Kontexte nun mit eindeutiger Objekt-Referenz statt nur mit Typ-Präfix an. Aus `PROJ` wird beispielsweise `PROJ-30`, während Label, Icon, Badge-Layout und Unlink-Verhalten unverändert bleiben. Der direkte Komponenten-Test wurde auf die neue Referenzanzeige geschärft. Zusätzlich prüft der TaskForm-Test nun konkret `PROJ-30` statt nur `PROJ`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ParentContextField.tsx` | geändert | Parent-Badge-Referenz um ID erweitert |
| `tests/unit/web/components/ui/ParentContextField.test.tsx` | geändert | Erwartung auf eindeutige Parent-Referenzen aktualisiert |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Parent-Kontext-Assertion auf konkrete Referenz geschärft |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der ungefilterte gezielte Lauf über ParentContextField-, Backlog-, Ticket- und TaskForm-Tests hatte weiterhin einen bereits bekannten roten Flex-Fill-Test in `TicketForm.test.tsx`. Der isolierte Testnamen-Lauf für die Parent-Kontext-Gruppe war grün. Testleitplanken: Web-Unit-/Komponententests mit jsdom und vorhandenen Fixtures; keine API, DB oder E2E-Isolation betroffen.

## Offene Punkte / Folgeaufgaben

Die Details-Tab-Flex-Fill-Gruppe bleibt als nächste Web-Unit-Gruppe offen.
