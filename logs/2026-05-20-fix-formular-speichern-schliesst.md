# Log: Formular Speichern schließt

**Datum:** 20.05.26  
**Schritt:** Fix — Formular-Speichern schließt Detailseiten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Detailseiten für Projekte, Meilensteine, Features, Aufgaben, Tickets, Backlog-Items und Use Cases überschreiben den vorhandenen Formularstandard nicht mehr mit `closeOnSubmit={false}`. Dadurch schließen die Formularseiten nach erfolgreichem Speichern wieder automatisch über ihren bestehenden `onClose`-Handler. Der vorherige Zustand wird über den bereits vorhandenen `returnTo`-Parameter wiederhergestellt, sodass Board- und Tab-Ansichten nach dem Speichern sichtbar werden. Die eigentlichen Formular-Komponenten wurden nicht geändert, weil ihr Standardverhalten bereits korrekt war. Die Änderung bleibt rein im Frontend und betrifft keine API-, Schema- oder Persistenzlogik.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Formularseite nutzt wieder den Standard zum Schließen nach Speichern |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Meilenstein-Formular kehrt nach Speichern zur vorherigen Ansicht zurück |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Formular schließt nach erfolgreichem Speichern |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Aufgaben-Formular schließt nach erfolgreichem Speichern |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Ticket-Formular schließt nach Erstellen und Bearbeiten |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Backlog-Item-Formular schließt nach erfolgreichem Speichern |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Use-Case-Formular schließt nach erfolgreichem Speichern |
| `logs/2026-05-20-fix-formular-speichern-schliesst.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
