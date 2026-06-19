# Log: Wiki D&D Sort Order (TKT-139)

**Datum:** 19.06.26  
**Uhrzeit:** 07:42:22  
**Schritt:** Feat — TKT-139 Wiki-Seitenreihenfolge per Drag & Drop ändern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

**TKT-139:** Reihenfolge von Wiki-Seiten per Drag & Drop änderbar. Bisher war D&D nur für Elternwechsel (Re-Parent) vorhanden; die Sortierung war fest durch `(sortOrder, title)` im Backend.

**Ansatz:** Insert-Slot-Drop-Zonen zwischen Geschwisterknoten. Während eines Drags erscheinen dünne Drop-Ziele (8px, teal bei Hover) zwischen allen Geschwistern auf derselben Ebene. Drop auf einen Insert-Slot → alle Geschwister bekommen normalisierte `sortOrder = index * 1000`, die gezogene Seite landet an der Zielposition.

**Warum Normalisierung aller Geschwister:** Alle Seiten haben Default `sortOrder = 0`. Midpoint-Berechnung `(0 + 0) / 2 = 0` wäre ein No-Op. Durch Neuvergabe aller `index * 1000`-Werte wird Kollision dauerhaft vermieden.

**Insert-Slot-IDs:** `wiki-insert:{parentId|root}:{index}` — eindeutig je Eltern-Ebene.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | `WIKI_INSERT_PREFIX`, `insertSlotId`, `InsertSlotDropData`, `WikiInsertSlot`, `onReorder` in Props; `WikiNodeProps` um `nodeIndex`, `siblings`, `parentId`, `activeDragPage` erweitert; `handleDragEnd` erkennt Insert-Slot-Drops |
| `apps/web/src/pages/WikiPage.tsx` | geändert | `reorderWikiPage` ergänzt; `onReorder={reorderWikiPage}` an `WikiTree` übergeben |

## Probleme und Abweichungen

Keine. 37/37 Wiki-Unit-Tests grün. TypeScript sauber.

Vorhandene Pre-existing Failures (30 Tests in anderen Komponenten) — nicht durch diese Änderung verursacht, betreffen ListBoardView, BacklogItemForm, NoteEditor-Markdown u.a.

## Offene Punkte / Folgeaufgaben

- TKT-129: Wiki-Autosave Lost Update — codex-auftrag unter `docs/tasks/codex-auftrag-wiki-autosave-lost-update.md`
- TKT-65: Task zwischen Meilensteinen verschieben
- TKT-136, TKT-138 in Ticket-App auf gelöst setzen
