# Log: Meilenstein-Statusfilter

**Datum:** 22.05.26  
**Schritt:** Fix — Meilenstein-Statusfilter  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Meilenstein-Board/List-Ansicht wurde um den fehlenden Statusfilter ergänzt. Der Adapter nutzt jetzt wie die anderen statusbasierten Ansichten die Work-Status-Katalogeinträge, zählt die Meilensteine pro Status und übergibt die Filterchips in den Toolbar-Slot der gemeinsamen `ListBoardView`. Die bestehende Suche und zusätzliche Projektfilterzeile bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Statusfilter-State, Status-Counts und Toolbar-Filter ergänzt |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Toolbar-Statusfilter und Filterwirkung abgesichert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `npm run typecheck -w apps/web`, `npm run test -w apps/web`, `npm run lint -w apps/web` und `npm run build -w apps/web` wurden erfolgreich ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
