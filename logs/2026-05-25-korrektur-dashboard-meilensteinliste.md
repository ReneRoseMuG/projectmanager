# Log: Korrektur Dashboard Meilensteinliste

**Datum:** 25.05.26  
**Schritt:** Fix / Feature — Korrektur Dashboard Meilensteinliste  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die fälschliche Umbenennung von `milestoneList` wurde zurückgenommen; die bestehende Widget-ID heißt wieder „Meilensteinkarte“. Für die gewünschte Meilensteinliste wurde stattdessen ein neues Widget `milestoneListView` ergänzt. Dieses neue Widget ist in den Kontexten `global`, `project` und `home` auswählbar und rendert die vorhandene `MilestoneListBoardView` im festen Listenmodus. Der Datenpfad ist bewusst vom bisherigen projektgebundenen `getDashboardMilestones` getrennt: ohne Owner lädt das Widget alle Meilensteine, im Projektkontext die Projekt-Meilensteine.

Die Doppelklick-Navigation wurde für das neue Widget ebenfalls abgesichert. Bei der Testplanung wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Testebene: Unit/jsdom; bewiesen wird, dass echte Widget-Zeilen per Doppelklick zur Detailseite navigieren und dass bestehende „Meilensteinkarte“ und neue „Meilensteinliste“ im Katalog getrennt sind.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `milestoneListView` als neue Dashboard-Widget-ID und Allowed-Widget ergänzt |
| `apps/web/src/api/dashboard.ts` | geändert | Neuer Datenpfad `getDashboardMilestoneList` für allgemeine und projektbezogene Meilensteinlisten |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | `milestoneList` zurück auf „Meilensteinkarte“, neues Widget „Meilensteinliste“ ergänzt |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Neues Meilensteinlisten-Widget gerendert und Doppelklick-Navigation angebunden |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Tests um `milestoneListView` und Label-Trennung erweitert |
| `logs/2026-05-25-korrektur-dashboard-meilensteinliste.md` | neu | Schritt-Log für diese Korrektur |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Ursache der Korrektur war die falsche Annahme, dass die vorhandene ID `milestoneList` als gewünschtes neues Widget umbenannt werden sollte. Stattdessen bleibt die vorhandene ID bestehen und das neue Widget wurde separat ergänzt.

## Offene Punkte / Folgeaufgaben

Keine.
