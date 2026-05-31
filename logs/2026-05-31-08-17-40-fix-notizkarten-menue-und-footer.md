# Log: Notizkarten Menü und Footer

**Datum:** 31.05.26  
**Uhrzeit:** 08:17:40  
**Schritt:** Fix — Notizkarten Menü und Footer  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Notizkarten und Notiz-Listeneinträge wurden um die fehlenden Menüfunktionen ergänzt. `ID kopieren` nutzt jetzt die zentrale `ActionMenu`-Logik mit einer neuen Notiz-Referenz `NOTE-<id>`. `In Tab öffnen` wird über den jeweiligen Notiz-Owner aus der `NoteList` abgeleitet und öffnet den passenden Kontext im Notizen-Tab als Standalone-Ansicht. Der Footer-Inhalt der Notizkarten wurde entfernt, sodass `Notiz #...` nicht mehr gerendert wird. API, Persistenz, Berechtigungen und Query-Invalidierung wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Kartenmenü um ID-Kopie und Tab-Aktion ergänzt; Footer entfernt |
| `apps/web/src/components/notes/NoteListViewItem.tsx` | geändert | Listenmenü um ID-Kopie und Tab-Aktion ergänzt |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Owner-basierte Tab-Ziele für Notizen ergänzt |
| `apps/web/src/lib/references.ts` | geändert | Notiz-Objektreferenz `NOTE-<id>` ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Project-Owner an Notizliste übergeben |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Milestone-Owner an Notizliste übergeben |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Task-Owner an Notizliste übergeben |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticket-Owner an Notizliste übergeben |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | WikiPage-Owner an Notizliste übergeben |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | DayPlan-Owner an Notizliste übergeben |
| `logs/2026-05-31-08-17-40-fix-notizkarten-menue-und-footer.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Eine eigenständige Route `/notes/:id` existiert nicht. Die Tab-Aktion öffnet deshalb den bestehenden Owner-Kontext mit `tab=notes&noteId=<id>` in der Standalone-Ansicht, statt eine neue Notiz-Detailseite anzulegen.

## Offene Punkte / Folgeaufgaben

Falls Notizen später eine echte eigene Detailseite bekommen sollen, müsste dafür ein separater Auftrag eine Route, Datenlade-Logik und direkte Berechtigungsbehandlung planen.
