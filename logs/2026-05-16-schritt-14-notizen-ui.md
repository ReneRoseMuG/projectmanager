# Log: Notizen UI

**Datum:** 16.05.26  
**Schritt:** 14 — Notizen-UI (TipTap, NoteEditor, NoteList, Autosave)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Notizen-UI wurde mit Liste, Karten und Editor-Modal umgesetzt. Der generische TipTap-Wrapper enthält Formatierung, Überschriften, Listen, Checklisten, Tabellen, Links, Bilder, Farbe, Highlight, Undo, Redo und Vollbild-Umschaltung. Autosave speichert zwei Sekunden nach der letzten Änderung. Notizen sind in Projekten und Aufgaben verfügbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteList.tsx` | neu | Notizenliste |
| `apps/web/src/components/notes/NoteCard.tsx` | neu | Notizkarte |
| `apps/web/src/components/notes/NoteEditor.tsx` | neu | Editor-Modal mit Autosave |
| `apps/web/src/components/ui/RichTextEditor.tsx` | neu | Generischer TipTap-Wrapper |
| `apps/web/src/hooks/useNotes.ts` | neu | Notizen-Datenlogik |

## Probleme und Abweichungen

Für die geforderte Unterstreichung wurde zusätzlich `@tiptap/extension-underline` aufgenommen.

## Offene Punkte / Folgeaufgaben

Keine.
