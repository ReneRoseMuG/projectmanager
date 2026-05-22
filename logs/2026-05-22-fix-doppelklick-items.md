# Log: Doppelklick Items

**Datum:** 22.05.26  
**Schritt:** Fix — Doppelklick Items  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die zentralen Item-Komponenten `ItemCard` und `ItemRow` öffnen Detailansichten jetzt erst per Doppelklick. Ein einfacher Klick bleibt dadurch für Auswahl-, Fokus- oder Inline-Bedienung frei und löst kein Öffnen mehr aus. Die direkt betroffenen Unit-Tests wurden so angepasst, dass sie sowohl den ausbleibenden Single-Click als auch den erfolgreichen Double-Click prüfen. Die betroffenen Browser-Flows, die Karten oder Listenitems öffnen, verwenden nun ebenfalls Doppelklick. Damit bleibt das neue Verhalten zentral abgesichert und die bestehenden Domänen-Views nutzen weiterhin dieselben Basiskomponenten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Öffnen von `onClick` auf `onDoubleClick` umgestellt |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Öffnen von `onClick` auf `onDoubleClick` umgestellt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Basistests für Single-Click ohne Öffnen und Double-Click mit Öffnen ergänzt |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | geändert | Domänentest auf Doppelklick-Verhalten angepasst |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Domänentest auf Doppelklick-Verhalten angepasst |
| `tests/unit/web/components/ui/ProjectFeaturePanel.test.tsx` | geändert | Panel-Test auf Doppelklick-Verhalten angepasst |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | Domänentest auf Doppelklick-Verhalten angepasst |
| `tests/unit/web/components/ui/UseCaseListBoardView.test.tsx` | geändert | Domänentest auf Doppelklick-Verhalten angepasst |
| `tests/browser/web/feature.spec.ts` | geändert | Kartenöffnung im Browser-Test auf Doppelklick angepasst |
| `tests/browser/web/owner-tasks.spec.ts` | geändert | Item-Öffnung im Browser-Test auf Doppelklick angepasst |
| `tests/browser/web/project.spec.ts` | geändert | Kartenöffnung im Browser-Test auf Doppelklick angepasst |
| `tests/browser/web/task.spec.ts` | geändert | Kartenöffnung im Browser-Test auf Doppelklick angepasst |
| `tests/browser/web/tickets.spec.ts` | geändert | Item-Öffnung im Browser-Test auf Doppelklick angepasst |

## Probleme und Abweichungen

Der volle E2E-Lauf wurde nicht erneut ausgeführt. Die gezielten Browser-Tests für `feature`, `project`, `task` und `tickets` sind grün; `owner-tasks.spec.ts` wurde wegen bereits bekannter, fachlich anderer Owner-Task-Relations-Fehler aus der vorherigen Verifikation nicht in den gezielten Lauf aufgenommen.

## Offene Punkte / Folgeaufgaben

Der vollständige E2E-Lauf inklusive Owner-Task-Relations bleibt als separate Verifikation offen, weil dort bereits vor diesem Fix unabhängige Fehler bekannt waren.
