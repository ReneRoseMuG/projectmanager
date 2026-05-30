# Log: Meilenstein-Karten-Kindobjekte

**Datum:** 24.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Create-Aktionen auf Meilenstein-Karten verarbeiten jetzt dieselben vorgemerkten Kindobjekte wie die entsprechenden Detail- und Projektkarten-Flows. Beim Anlegen von Aufgaben und Tickets aus einer Meilenstein-Karte werden Tags, Subtasks beziehungsweise Subtickets, verknüpfte Tickets, Kommentare, Notizen und Attachments nach dem Hauptobjekt gespeichert. Zusätzlich wurden die Browser-Tests für Wiki-Create und projektgescopes Meilenstein-Create präzisiert, weil dort dynamische Formularüberschriften und der projektbezogene API-Endpunkt bisher falsche Testannahmen erzeugt haben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/MilestonesPage.tsx` | geändert | Post-Create-Verarbeitung für Aufgaben und Tickets aus Meilenstein-Karten ergänzt |
| `tests/unit/web/pages/MilestonesPage.test.tsx` | geändert | Unit-Test um vorgemerkte Kindobjekte und QueryClient-Kontext erweitert |
| `tests/browser/web/create-child-elements.spec.ts` | geändert | Browser-Erwartungen für Wiki-Formular, Kartenmenüs und projektgescopten Meilenstein-Endpunkt korrigiert |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. Der zuvor rote Meilenstein-Karten-Browserfall war teilweise testseitig: Der Test wartete auf `/api/milestones`, während der Kartenfluss korrekt `/api/projects/:id/milestones` verwendet.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Verifikation

Der Testentwurfs-Skill wurde angewendet. Betroffen waren Unit- und Browser/E2E-Tests mit echten API- und Browser-Flows gegen die bestehende E2E-Testisolation. Bewiesen wurde, dass vorgemerkte Kindobjekte nach dem Create des Hauptobjekts persistiert und auf der Detailseite sichtbar werden.

Ausgeführt:
- `npm run e2e -w apps/web -- create-child-elements.spec.ts -g "Projektkarten-Menü erstellt Meilenstein"` — 1/1 grün
- `npm run e2e -w apps/web -- create-child-elements.spec.ts` — 13/13 grün
- `npm run test -w apps/web` — 431/431 grün
