# Log: CardFooterBar Untere Kartenkante

**Datum:** 26.05.26  
**Schritt:** Fix — CardFooterBar untere Kartenkante  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Footer-Reihenfolge der gemeinsamen `PlanningItemCard` wurde korrigiert. Der Aufgaben-Progress bleibt im Footerbereich, aber die neue `CardFooterBar` wird jetzt danach gerendert und bildet damit die unterste Footer-Zeile der Board-Card. Das betrifft Projekt- und Meilenstein-Karten, weil beide über `PlanningItemCard` laufen. Die Listenansicht bleibt unverändert, dort wird der Footer weiterhin als eigene Row-Footer-Zeile gerendert.

Testleitplanken wurden angewendet: Web-Unit-Tests in jsdom prüfen die echte DOM-Reihenfolge von Aufgabenblock und Counter-/Tag-Zeile. Es wurden keine API-, DB- oder Permission-Regeln verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | CardFooterBar als letzte Board-Card-Footer-Zeile platziert |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | DOM-Reihenfolge des Projektkarten-Footers abgesichert |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | DOM-Reihenfolge des Meilensteinkarten-Footers abgesichert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
