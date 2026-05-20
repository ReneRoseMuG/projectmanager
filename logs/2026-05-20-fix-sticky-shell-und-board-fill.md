# Log: Sticky Shell und Board-Fill

**Datum:** 20.05.26  
**Schritt:** Fix — Sticky Shell und Board-Fill  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Page-Varianten von `FormModal` und `DetailModal` rendern nicht mehr als gerundete, schattenwerfende Karte, sondern als volle Shell innerhalb des scrollenden Arbeitsbereichs. Die sticky TabBar und der sticky Footer können dadurch sauber über die verfügbare Seitenbreite laufen. Die Detailseiten-Wrapper für Projekt, Aufgabe, Feature, Meilenstein, Use Case, Ticket und Backlog-Item verwenden keine zentrierte `max-w-7xl`-Breite mehr, sondern füllen die Page-Shell mit `min-h-full`. Zusätzlich wurde die untere Body-Padding-Zone der Page-Shell entfernt, weil sie bei leeren Tab-Inhalten als sichtbare Leerfläche vor dem Footer erschien. `ListBoardView` nutzt nun eine größere Mindesthöhe und ist per Test-ID im E2E-Test messbar, damit leere Board-/Listenflächen den sichtbaren Raum deutlich besser ausfüllen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Page-Shell entkartet, Body als Flex-Spalte ohne unteres Padding, Footer ohne Rundung |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Detail-Page-Shell analog zur Form-Shell angepasst |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Mindesthöhe erhöht und Test-ID ergänzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Zentrierte Maximalbreite der Page-Shell entfernt |
| `apps/web/src/components/ui/__tests__/FormModal.test.tsx` | geändert | Erwartungen an volle Page-Shell angepasst |
| `apps/web/src/components/ui/__tests__/DetailModal.test.tsx` | geändert | Erwartungen an volle Detail-Shell angepasst |
| `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | geändert | Erwartete Board-/Listen-Mindesthöhe angepasst |
| `apps/web/e2e/project.spec.ts` | geändert | Browser-Test prüft breite TabBar/Footer und gefüllte leere ListBoardView |
| `logs/2026-05-20-fix-sticky-shell-und-board-fill.md` | neu | Schritt-Log für diesen Fix |

## Probleme und Abweichungen

Der erste E2E-Gesamtlauf zeigte weiterhin eine 113px-Lücke zwischen leerer `ListBoardView` und Footer. Ursache war nicht nur die `ListBoardView`-Mindesthöhe, sondern zusätzlich die zuvor eingeführte untere `pb-24`-Schutzfläche der Page-Shell. Diese wurde entfernt und anschließend durch gezielte sowie vollständige Testläufe verifiziert.

## Offene Punkte / Folgeaufgaben

Keine.
