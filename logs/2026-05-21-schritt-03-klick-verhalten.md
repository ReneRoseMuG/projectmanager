# Log: Klick-Verhalten

**Datum:** 21.05.26  
**Schritt:** 3 — Klick-Verhalten in Listen vereinheitlichen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

`ItemCard` und `ItemRow` öffnen Einträge jetzt per einfachem Klick statt per Doppelklick. Der Titelbereich in `ItemRow` ist kein eigener Button mehr; Action-, Pill-, Meta- und Statusbereiche stoppen die Klickausbreitung, damit Aktionen, Menüs und Badges keine Navigation auslösen. Browser- und Unit-Tests für Projekt-, Ticket-, Feature-, Task-, Owner-Task- und Use-Case-Flows wurden von Doppelklick auf einfachen Klick umgestellt. TLDraw-Doppelklicktests bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei                                                  | Art      | Kurzbeschreibung                                       |
| ------------------------------------------------------ | -------- | ------------------------------------------------------ |
| `apps/web/src/components/ui/ItemCard.tsx`              | geändert | Öffnen per `onClick`                                   |
| `apps/web/src/components/ui/ItemRow.tsx`               | geändert | Öffnen per `onClick`, interaktive Slots abgeschirmt    |
| `tests/unit/web/components/ui/ListBoardView.test.tsx`  | geändert | neue Klickregeln und Propagation abgesichert           |
| `tests/unit/web/components/ui/*ListBoardView.test.tsx` | geändert | Doppelklick-Erwartungen auf Klick umgestellt           |
| `tests/browser/web/*.spec.ts`                          | geändert | betroffene Domain-Flows auf einfachen Klick umgestellt |

## Probleme und Abweichungen

Die betroffenen Klick-Flows sind in Unit-Tests und Browser-Specs grün. Die Gesamt-E2E-Ausführung bleibt wegen der Kalender-Specs rot, die nicht durch das Klick-Verhalten betroffen sind.

## Offene Punkte / Folgeaufgaben

Keine fachlichen offenen Punkte im Klick-Verhalten. Kalender-E2E separat prüfen.
