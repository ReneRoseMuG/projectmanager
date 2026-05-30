# Codex-Auftrag: RichTextEditor – Layout-Shift-Fix (always-mounted pattern)

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-125

---

## Ziel

Den Layout-Shift beim Aktivieren des `RichTextInlineField`-Editors beseitigen. Nach der Änderung darf sich der umgebende Seiteninhalt weder beim Klick in das Feld noch beim Verlassen des Feldes verschieben.

## Hintergrund & Kontext

`RichTextInlineField` in `apps/web/src/components/ui/rich-text-inline-field.tsx` verwendet einen `isEditing`-State. Wenn `isEditing = false`, wird die Read-View gerendert (statisches HTML). Wenn `isEditing = true`, wird der `RichTextInlineEditor` mit Toolbar gemountet (~42 px Toolbar-Höhe). Dieser Mount/Unmount-Zyklus verschiebt alle Inhalte unterhalb des Editors bei jedem Klick und beim Verlassen.

## Aufgabe

1. **`isEditing`-Toggle-Pattern entfernen:**
   - Read-View (statisches HTML) entfernen oder als unsichtbares Overlay belassen
   - `RichTextInlineEditor` (inkl. Toolbar) wird **immer gemountet**, unabhängig vom Fokus-Zustand

2. **Toolbar-Sichtbarkeit über CSS steuern (nicht über Mount/Unmount):**
   ```tsx
   // Unfokussiert:
   <div className={cn("transition-opacity duration-150", isFocused ? "opacity-100" : "opacity-40 pointer-events-none")}>
     <RichTextToolbar ... />
   </div>
   ```
   - `opacity-40`: Toolbar bleibt im Layout, ist aber visuell zurückgenommen
   - `pointer-events-none`: Toolbar-Buttons reagieren nicht auf Klicks wenn unfokussiert

3. **Fokus-State tracken:**
   ```typescript
   const [isFocused, setIsFocused] = useState(false)
   // In EditorOptions:
   onFocus: () => setIsFocused(true),
   onBlur: () => setIsFocused(false),
   ```

4. **Container-Höhe stabilisieren:**
   - Container hat immer: Toolbar-Höhe + `minRows * line-height` als Mindesthöhe
   - `min-h` via Tailwind oder Inline-Style setzen, damit der Container nicht springt

5. **Visuelles Feedback unfokussiert:**
   - Border: `border-transparent` (unfokussiert) → `border-primary` (fokussiert)
   - Hintergrund: leicht gedimmt unfokussiert (`bg-background/50`) → normal fokussiert
   - Cursor: `cursor-text` auf dem gesamten Container, damit Klick in die Read-Area intuitiv ist

6. **`commitOnBlur`-Verhalten erhalten:**
   - `onBlur`-Handler aus `EditorOptions` weiterhin aufrufen; `onCommit` auslösen wenn `commitOnBlur === true`

## Technische Leitplanken

- Keine Änderung an der Extension-Konfiguration (StarterKit, Highlight, Markdown etc.)
- `ToolbarButton`-`onMouseDown` bleibt `event.preventDefault()` — das ist korrekt und verhindert Blur beim Klick auf Toolbar-Buttons
- Die Änderung betrifft nur `rich-text-inline-field.tsx` — keine anderen Dateien
- Tiptap v3 API verwenden (`@tiptap/react ^3.23.5`)

## Seiteneffekte

- Alle Stellen, die `RichTextInlineField` verwenden, profitieren automatisch (WikiPageDetail, TaskForm, MilestoneForm etc.)
- Der Editor ist jetzt immer im DOM — bei sehr vielen gleichzeitigen Editor-Instanzen auf einer Seite könnte Memory-Verbrauch steigen. Im aktuellen Kontext (eine Seite = ein oder wenige Editoren) unkritisch.

## Testanforderungen

- Manuell: Klick in Editor → kein Layout-Shift; Tab/Klick aus Editor → kein Layout-Shift
- Manuell: In WikiPageDetail mehrfach hintereinander fokussieren/verlassen
- Manuell: In einem Modal mit kurzem Viewport — kein Scroll-Jump beim Aktivieren

## Abnahmekriterien

- Kein messbarer Layout-Shift (CLS = 0) beim Fokussieren und Verlassen des Editors
- Toolbar ist im unfokussierten Zustand sichtbar aber abgedimmt (opacity ~40%)
- Toolbar-Buttons sind im unfokussierten Zustand nicht klickbar
- `commitOnBlur`-Verhalten funktioniert unverändert
- Bestehende Tiptap-Funktionalität (Markdown-Paste, Highlight, Links etc.) ist unverändert
