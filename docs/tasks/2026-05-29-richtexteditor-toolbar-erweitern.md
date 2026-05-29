# Codex-Auftrag: RichTextEditor – Toolbar erweitern (H4, Trennlinie)

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-126

---

## Ziel

Die `full`-Toolbar des `RichTextInlineField`-Editors um H4 und eine horizontale Trennlinie erweitern. Beide Extensions sind bereits im StarterKit enthalten — es fehlen nur die Toolbar-Buttons.

## Hintergrund & Kontext

Der Editor basiert auf Tiptap v3 mit `StarterKit.configure({ heading: { levels: [1, 2, 3] } })`. Tiptap StarterKit unterstützt Headings bis H6 und enthält `HorizontalRule`. Beide Features sind im Backend aktiv, aber in der Toolbar nicht exponiert. Nutzer haben keinen UI-Zugang zu H4 und können keine Trennlinien einfügen.

## Aufgabe

1. **H4 in StarterKit-Konfiguration freischalten:**
   ```typescript
   StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } })
   ```

2. **H4-Button in `RichTextToolbar` ergänzen:**
   - Analog zu den bestehenden H1–H3-Buttons
   - Position: direkt nach H3
   - `editor.chain().focus().toggleHeading({ level: 4 }).run()`
   - `isActive`: `editor.isActive('heading', { level: 4 })`
   - Icon/Label: `H4` (Text, wie die anderen Heading-Buttons)

3. **HorizontalRule-Button ergänzen:**
   - `editor.chain().focus().setHorizontalRule().run()`
   - Icon: horizontale Linie (z.B. `Minus`-Icon aus `lucide-react` oder ein `<hr>`-ähnliches SVG)
   - Position: nach den Heading-Buttons, vor oder nach den Block-Buttons (Code Block, Blockquote)
   - `isActive` nicht relevant (HorizontalRule ist kein Toggle)

4. **Toolbar-Gruppe:** Heading-Buttons und HorizontalRule können in eine gemeinsame Gruppe mit Trennstrich zu anderen Gruppen gestellt werden, falls die Toolbar-Struktur Gruppen kennt.

## Technische Leitplanken

- Nur `apps/web/src/components/ui/rich-text-inline-field.tsx` ändern
- Keine neue Dependency — `HorizontalRule` und `Heading` sind im StarterKit enthalten
- `toolbar="minimal"`-Variante bleibt unverändert (H4 und HorizontalRule nur in `"full"`)
- Lucide-Icons bevorzugen für Konsistenz mit dem restlichen UI

## Seiteneffekte

- Bestehende Dokumente, die H4 per Markdown oder paste enthalten, werden jetzt korrekt gerendert und editierbar
- `HorizontalRule` war bisher nur per Tastaturkürzel (`---` + Enter) einfügbar; der Button ist eine UI-Alternative

## Testanforderungen

- Manuell: H4-Button klicken → Überschrift level 4 wird gesetzt; erneut klicken → toggle zurück
- Manuell: HorizontalRule-Button klicken → `<hr>` wird im Dokument eingefügt
- Manuell: Dokument mit H4 und `<hr>` speichern und neu laden → korrekte Darstellung

## Abnahmekriterien

- H4-Button erscheint in der `full`-Toolbar direkt nach H3
- HorizontalRule-Button erscheint in der `full`-Toolbar
- Beide Buttons fehlen in der `minimal`-Toolbar
- H4-Formatierung und HorizontalRule werden korrekt gespeichert und nach Reload angezeigt
