# Log: Notizen Board List Modal Editor

**Datum:** 26.05.26  
**Schritt:** Feature — Notizen Board/List und Modal-Editor  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die persistierten Notizen-Tabs für Projekte, Meilensteine, Aufgaben und Tickets nutzen jetzt die gemeinsame Board-/Listenoberfläche. Dafür wurden Notizkarten und Listenzeilen auf die bestehenden `ItemCard`- und `ItemRow`-Patterns umgestellt; beide öffnen den Editor per Doppelklick, während Bearbeiten und Löschen über das Aktionsmenü erreichbar bleiben. Der Notizeditor nutzt nun das FormModal-nahe Detailseiten-Chrome mit steel-Header, stoppt Submit-Propagation und schließt nach dem Speichern zurück in die Notizliste des gleichen Parents. Legacy-/Markdown-Inhalte werden roh an den RichText-Editor übergeben und erst nach Editor-Änderung als HTML gespeichert; reines Titelspeichern bewahrt Legacy-Inhalte. Die Testleitplanken wurden angewendet: Web-Unit-Tests prüfen Komponenteninteraktion und Editor-Serialisierung, ein Browser/E2E-Test prüft den echten Projekt-Notizen-Modalfluss mit API-Testdaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Adapter auf `ListBoardView` mit Board/List-Modus, Suche und Add-Toolbar |
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Notizkarte auf Standard-ItemCard mit Doppelklick-Öffnung umgestellt |
| `apps/web/src/components/notes/NoteListViewItem.tsx` | neu | Listenzeile für Notizen auf Basis von `ItemRow` |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Editor auf FormModal-Chrome, Submit-Propagation und Markdown-Erhalt angepasst |
| `apps/web/src/components/notes/noteContent.ts` | neu | Gemeinsame Konvertierung für Notiz-HTML, Legacy-Markdown und Preview |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Optionales `cancelLabel` ergänzt |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Markdown-/Plain-Text-Leseansicht ohne HTML-Injektion ergänzt |
| `apps/web/src/components/{projects,milestones,tasks,tickets}/*Form.tsx` | geändert | Persistierte Notizen-Tabs auf Fill-Layout für Board/List umgestellt |
| `tests/unit/web/components/notes/NoteList.test.tsx` | neu | Unit-Tests für Board/List, Doppelklick und Toolbar-Create |
| `tests/unit/web/components/notes/NoteEditor.test.tsx` | geändert | Unit-Tests für Markdown-Erhalt und Submit-Propagation ergänzt |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Markdown-Leseansicht abgesichert |
| `tests/browser/web/notes-modal-flow.spec.ts` | neu | E2E-Test für Speichern ohne Rücksprung aus Projekt-Notizen-Tab |

## Probleme und Abweichungen

Der vollständige Web-Unit-Testlauf `npm run test -w apps/web` bleibt rot wegen zwei bestehenden Sidebar-Assertions in `tests/unit/web/components/layout/Sidebar.test.tsx`; beide suchen den Placeholder `Navigation durchsuchen`, der im gerenderten Sidebar-DOM nicht vorhanden ist. Der vollständige E2E-Lauf `npm run e2e -w apps/web` lief in das Tool-Timeout, bevor verwertbare Gesamtergebnisse vorlagen. Der gezielte neue E2E-Test und die gezielten Unit-Tests für diesen Auftrag sind grün.

## Offene Punkte / Folgeaufgaben

Die bestehenden Sidebar-Testfehler und der E2E-Gesamtlauf-Timeout sollten separat bewertet werden. Für diesen Auftrag sind keine offenen Produktionscode-Punkte bekannt.
