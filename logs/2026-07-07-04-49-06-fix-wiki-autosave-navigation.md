# Log: Wiki Autosave Navigation

**Datum:** 07.07.26  
**Uhrzeit:** 04:49:06  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Wiki-Autosave wurde gegen Content-Verschleppung beim Navigieren zwischen Wiki-Seiten abgesichert. `useWiki` reicht während eines Seitenwechsels keine per `keepPreviousData` gehaltene fremde Detailseite mehr durch, und die Wiki-Detailform wird pro `page.id` neu gemountet. Autosave ist nun an den echten Bearbeitungsmodus gebunden; der Lesemodus bleibt dadurch passiv. Interne Wiki-Link-Navigation respektiert ein abgelehntes `onBeforeNavigate` und bleibt auf der aktuellen Seite, wenn eine vorgeschaltete Sicherheitsprüfung abbricht. Zusätzlich fragt der Autosave per `ConfirmDialog`, wenn eine zuvor gefüllte Wiki-Seite leer gespeichert werden soll; reine Medieninhalte zählen dabei nicht als leer. Die Testentwurfsleitplanken wurden angewendet: Testebene Unit/jsdom, echte React-Hooks/-Komponenten mit gemockter API-Schicht, zu beweisendes Verhalten ist Seitenwechsel/Autosave/Confirm-Abbruch ohne Netzwerk- oder DB-Zugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useWiki.ts` | geändert | Filtert fremde Placeholder-Detaildaten beim Seitenwechsel heraus. |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Remountet die Detailform per Wiki-ID und aktiviert Autosave nur im Bearbeitungsmodus. |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Trennt Lesemodus von Autosave, ergänzt Leerseiten-Confirm und stoppt Navigation nur bei bewusst abgelehntem Save. |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Wiki-Link-Navigation kann durch `onBeforeNavigate` abgebrochen werden. |
| `apps/web/src/hooks/useAutoSave.ts` | geändert | Unterstützt bewusst abgebrochene Saves ohne Fehlerstatus. |
| `apps/web/src/lib/html-utils.ts` | geändert | Erkennt Medien-/Zeichnungsinhalte als sichtbaren Inhalt. |
| `tests/unit/web/hooks/useWiki.test.tsx` | geändert | Ergänzt Regressionstest für WIKI-16 → WIKI-202 mit ausstehender Detailabfrage. |
| `tests/unit/web/hooks/useAutoSave.test.ts` | geändert | Ergänzt Test für bewusst abgebrochenen Save. |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Ergänzt Tests für Leerseiten-Confirm, Bestätigung und Medieninhalt. |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Ergänzt Test für abgebrochene Wiki-Link-Navigation. |

## Probleme und Abweichungen

Der ursprüngliche Inhalt von WIKI-202 konnte mit den verfügbaren Daten nicht reproduziert werden. Das Journal enthält für Inhaltsänderungen nur Längeninformationen; das lokale Backup-Manifest vom 28.05.26 enthält `wikiPages` mit `rowCount: 0`. Der vollständige Web-Lint schlägt weiterhin an vorbestehenden, nicht berührten Dateien fehl; die von diesem Fix geänderten Source-Dateien wurden gezielt per ESLint geprüft und sind grün.

## Offene Punkte / Folgeaufgaben

Falls der alte WIKI-202-Inhalt wiederhergestellt werden soll, wird eine externe oder produktive Sicherung mit Wiki-Seiteninhalt von vor dem 06.07.26 17:51:15 MESZ benötigt.
