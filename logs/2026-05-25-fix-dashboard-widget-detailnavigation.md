# Log: Dashboard Widget Detailnavigation

**Datum:** 25.05.26  
**Schritt:** Fix / Feature — Dashboard Widget Detailnavigation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Dashboard-Widget `milestoneList` wurde im Widget-Katalog sichtbar als „Meilensteinliste“ benannt. Die read-only Board/List-Widgets für Aufgaben, Tickets, Meilensteine und Projekte erhalten nun echte `onOpen`-Callbacks statt No-op-Handlern. Ein Doppelklick auf Karten oder Listenzeilen navigiert zur jeweiligen Detailseite und setzt den aktuellen Dashboard-Pfad als `returnTo`, damit der Rückweg erhalten bleibt. Die bestehende read-only-Logik der Widgets bleibt unverändert; es wurden keine API- oder Datenmodelländerungen vorgenommen.

Bei der Testplanung wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Testebene: Unit/jsdom. Bewiesen wird das beobachtbare Verhalten „Dashboard-Widget rendert echten Eintrag, Doppelklick ändert die Router-Location zur Detailseite“ für alle acht Board/List-Widget-IDs. Die Tests nutzen echte Komponenten mit gemocktem Dashboard-Query-Hook und gemockten Katalogdaten; es gibt keinen Zugriff auf produktive Daten, DBs oder Dateisystempfade.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Board/List-Widget-Wrapper navigieren per Doppelklick zur Detailseite |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | `milestoneList` sichtbar als „Meilensteinliste“ benannt |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | neu | Unit-Test für Doppelklick-Navigation aller Board/List-Dashboard-Widgets |
| `logs/2026-05-25-fix-dashboard-widget-detailnavigation.md` | neu | Schritt-Log für diese Änderung |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
