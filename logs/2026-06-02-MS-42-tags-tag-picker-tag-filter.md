# MS-42: Tags, Tag Picker, Tag Filter

**Datum:** 2026-06-02
**Branch:** work

## Übersicht

Meilenstein mit 4 Bug-Tickets zur Tag-Domäne. Alle Änderungen auf Branch `work` umgesetzt.

## Erledigte Tickets

### TICK-59 — Tag Badges: Remove-Button korrigiert

- `TagPicker.tsx` — `TagPill`: Icon von `X` auf `Minus` geändert (Import angepasst)
- `CardFooterBar.tsx` — `TagPill` erhält optionalen `onRemove`-Prop; wenn `canEditTags` aktiv, wird `toggleTag` übergeben → Minus-Button direkt auf Karten-Badges sichtbar

### TICK-60 — Tag Picker: Panel-Positionierung korrigiert

- `TagPicker.tsx` — `dropUp`-State hinzugefügt
- Beim Öffnen wird `getBoundingClientRect()` des Containers geprüft; weniger als 300 px zum unteren Viewport-Rand → `dropUp = true`
- Dropdown-Klasse wechselt zwischen `top-full mt-1` und `bottom-full mb-1`

### TICK-61 — Tag Picker: Farb-Picker für neues Tag

- `TagPicker.tsx` — `newColor`-State (default `var(--color-steel-600)`) + `showNewColorPicker`-State
- Layout der Neues-Tag-Zeile: `grid-cols-[auto_1fr_auto]` → Farb-Kreis | Textfeld | Button
- Farb-Kreis-Button öffnet inline `ColorPicker`-Komponente darunter
- `createAndAdd` nutzt `newColor` statt hardcodiertem Standardwert
- Panel-Breite von `w-52` auf `w-64` erhöht

### TICK-62 — Admin Tags: Zähler, Status-Label, Color Picker

- `packages/shared-types` — `TagUsageCounts`-Interface und `usageCounts?`-Feld auf `Tag` hinzugefügt
- `apps/api/src/services/tags.service.ts` — `listTags` erweitert: SQL-Subqueries für Verwendungszähler je Tag (Projekte, Meilensteine, Aufgaben, Tickets); `sql` aus drizzle-orm importiert
- `TagManager.tsx`:
  - Palette-Buttons durch `ColorPicker`-Komponente ersetzt (Neuer-Tag-Bereich + Bearbeiten-Modus in `TagRow`)
  - Hardcodierte "0"-Zähler → dynamisch aus `tag.usageCounts`
  - "verwaist"-Label nur noch wenn Gesamtnutzung === 0; sonst grünes "aktiv"-Label

## Geänderte Dateien

| Datei | Tickets |
|---|---|
| `packages/shared-types/src/index.ts` | TICK-62 |
| `apps/api/src/services/tags.service.ts` | TICK-62 |
| `apps/web/src/components/tags/TagPicker.tsx` | TICK-59, TICK-60, TICK-61 |
| `apps/web/src/components/tags/TagManager.tsx` | TICK-62 |
| `apps/web/src/components/ui/CardFooterBar.tsx` | TICK-59 |
