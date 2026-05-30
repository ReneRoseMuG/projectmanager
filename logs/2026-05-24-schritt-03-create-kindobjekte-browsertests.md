# Log: Create-Kindobjekte Browsertests

**Datum:** 24.05.26  
**Schritt:** 3 — Browser-/E2E-Nachweis für Create-Kindobjekte  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Ein neuer Playwright-Spec deckt direkte Create-Flows und Item-Card-Menü-Flows ab. Die Tests hängen im Create-Modus die jeweils unterstützten Kindobjekte an, speichern das Hauptobjekt, öffnen anschließend die Detailseite und prüfen die Anzeige im passenden Tab oder Abschnitt. Abgedeckt sind Projekt, Meilenstein, Aufgabe, Ticket, Feature, Use Case, Backlog-Item, Wiki-Seite sowie Projekt- und Meilenstein-Kartenmenüs.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/browser/web/create-child-elements.spec.ts` | neu | E2E-Spec für Create-Flows mit Attachments, Notizen und Kommentaren |

## Probleme und Abweichungen

Der E2E-Lauf hat 7 von 13 neuen Create-Kindobjekt-Fällen grün ausgeführt. Grün waren Projekt, Aufgabe, Ticket, Feature, Backlog sowie Projektkarten-Menü für Aufgabe und Ticket. Rot waren Meilenstein-Create und Use-Case-Create wegen abweichender Rücksprungroute, Wiki-Create und Projektkarten-Menü-Meilenstein wegen Timeout sowie Meilensteinlisten-Menü für Aufgabe und Ticket wegen fehlender sichtbarer Kommentar-Verlinkung nach dem Speichern.

## Offene Punkte / Folgeaufgaben

- E2E-Erwartungen für aktuelle Rücksprungrouten präzisieren.
- Wiki-Create-Selector oder Wartebedingung stabilisieren.
- Meilensteinlisten-Menü-Persistenz für Task-/Ticket-Kommentare nachziehen.
