# Codex-Großauftrag: Design System Vereinheitlichung
**Projekt:** Projekt Manager — Monorepo (`apps/web`)  
**Erstellt:** 2026-05-17  
**Status:** Bereit zur Ausführung

---

## Kontext & Ziel

Die Applikation verfügt über eine funktionsfähige Version mit einem neu eingeführten
Design System. Ziel dieses Auftrags ist die vollständige Vereinheitlichung der
Oberfläche auf Basis einer sauberen, bottom-up aufgebauten Komponentenhierarchie.

**Kernprinzipien:**
- Jede UI-Entscheidung wird exakt einmal getroffen (Single Source of Truth pro Atom)
- Alle Listen unterstützen Board- und Listenansicht mit einheitlichem `+`-Button
- Alle Domain-Objekte nutzen dieselben Basis-Organisms (Section, FormField, RelationPanel, CommentThread)
- Stilwechsel sind durch CSS Custom Properties zur Laufzeit möglich
- Kein „Neu"-Button außerhalb der `ListBoardView`-Toolbar

**Tech-Stack:**
- React 18 + TypeScript · Tailwind CSS · Vite
- TipTap (RTF-Editor, neu hinzuzufügen)
- Vitest + React Testing Library (Unit/Integration)
- Playwright (E2E)
- Lucide React (Icons)

**Konventionen:**
- Log-Dateien: `logs/YYYY-MM-DD-schritt-XX-name.md`
- Komponenten: `apps/web/src/components/ui/` (Atome/Moleküle), `apps/web/src/components/` (Organisms+)
- Git-Branches: `feat/design-system-XX-name`
- Commit-Prefix: `feat`, `refactor`, `test`, `chore`
- Alle neuen Komponenten exportieren einen benannten Export (kein default)
- Keine `any`-Typen; alle Props vollständig typisiert

---

## Schrittübersicht

| # | Schritt | Typ | Tests |
|---|---------|-----|-------|
| 0 | CSS Custom Properties — Token-Migration | chore | — |
| 1 | Atom-Extraktion | feat | ✅ Unit |
| 2 | Moleküle: SegmentedControl, RadioList, SectionHeader, ProgressBar | feat | — |
| 3 | RichTextEditor konsolidieren (TipTap) | feat | — |
| 4 | Section-Card & FormField-Wrapper | refactor | — |
| 5 | TabBar & Modal-Templates | feat | — |
| 6 | CommentThread generalisieren | refactor | ✅ Integration |
| 7 | ListBoardView-Infrastruktur (ItemCard, ItemRow, KanbanBoard, +) | feat | ✅ Integration |
| 8 | RelationPanel | feat | ✅ Integration |
| 9 | Domain: Task | refactor | ✅ E2E |
| 10 | Domain: Feature | refactor | ✅ E2E |
| 11 | Domain: Projekt | refactor | ✅ E2E |
| 12 | Domain: Use Case & Backlog | refactor | — |
| 13 | Domain: Wiki & Kalender | refactor | — |
| 14 | Kommentarstränge für alle Domain-Objekte | feat | ✅ Integration |
| 15 | Bereinigung & Dead-Code-Entfernung | chore | — |

---

## Schritt 0 — CSS Custom Properties: Token-Migration

**Branch:** `chore/design-system-00-tokens`

### Ziel
Alle Design-Tokens aus `tailwind.config.ts` werden als CSS Custom Properties definiert.
Tailwind referenziert sie über `var()`. Kein TSX-File wird geändert.

### Aufgaben

1. Datei `apps/web/src/styles/theme.css` anlegen:

```css
:root {
  /* Semantische Aliase */
  --color-ink:   #0F2542;
  --color-shell: #F4F7FA;
  --color-line:  #D5DEE9;

  /* Steel-Skala */
  --color-steel-50:  #F4F7FA;
  --color-steel-100: #E8EFF5;
  --color-steel-200: #D5E1EE;
  --color-steel-300: #BACDE3;
  --color-steel-400: #94B2D1;
  --color-steel-500: #6B92BD;
  --color-steel-600: #4682B4;
  --color-steel-700: #2E5984;
  --color-steel-800: #1B355C;
  --color-steel-900: #0F2542;

  /* Akzentfarben */
  --color-crimson:   #D9416A;
  --color-tangerine: #ED8C3A;
  --color-mustard:   #E2BA2C;
  --color-fern:      #4D9359;
  --color-teal:      #2F8E96;
  --color-violet:    #6A40BE;
  --color-magenta:   #C13D9A;

  /* Schatten */
  --shadow-panel: 0 10px 28px rgba(15,37,66,0.08);
  --shadow-steel: 0 12px 32px rgba(46,89,132,0.16);
  --shadow-sm:    0 1px 2px rgba(15,37,66,0.06);
  --shadow-modal: 0 24px 70px rgba(22,36,52,0.28);
}
```

2. `tailwind.config.ts` anpassen — alle Hex-Werte durch `var()` ersetzen:

```ts
colors: {
  ink:   "var(--color-ink)",
  shell: "var(--color-shell)",
  line:  "var(--color-line)",
  steel: {
    50:  "var(--color-steel-50)",
    /* … */
    900: "var(--color-steel-900)",
  },
  crimson:   "var(--color-crimson)",
  /* … alle weiteren */
},
boxShadow: {
  panel: "var(--shadow-panel)",
  steel: "var(--shadow-steel)",
  sm:    "var(--shadow-sm)",
},
```

3. `theme.css` in `apps/web/src/main.tsx` importieren (vor dem Tailwind-Import).

4. Alle inline `rgba()`-Schatten in TSX-Dateien (`shadow-[0_24px_70px_rgba(22,36,52,0.28)]`)
   durch `shadow-modal` ersetzen, nachdem `--shadow-modal` im Theme definiert ist.

### Abnahmekriterien

- [ ] `npm run build` in `apps/web` schlägt nicht fehl
- [ ] Visuelle Darstellung der App ist identisch mit dem Zustand vor dem Schritt
- [ ] Kein einziger Hex-Wert mehr in `tailwind.config.ts`
- [ ] `grep -r "#[0-9A-Fa-f]\{6\}" apps/web/src/styles/` findet nur `theme.css`
- [ ] Ein Theme-Test: `--color-fern: red` in `theme.css` färbt alle grünen Elemente rot

### Log-Eintrag

Datei `logs/YYYY-MM-DD-schritt-00-token-migration.md` anlegen mit:
- Geänderte Dateien (Liste)
- Anzahl ersetzter Inline-Werte
- Offene Punkte / bekannte Ausnahmen

### Commit

```
chore(tokens): migrate design tokens to CSS custom properties

- Add apps/web/src/styles/theme.css with all color and shadow variables
- Update tailwind.config.ts to reference CSS vars via var()
- Replace inline rgba shadow classes with shadow-modal utility
- No visual changes; enables runtime theming
```

---

## Schritt 1 — Atom-Extraktion

**Branch:** `feat/design-system-01-atoms`

### Ziel
Alle fehlenden Atom-Komponenten werden erstellt. Bestehende Atoms (`Button`, `Badge`,
`Pill`, `Skeleton`) bleiben unverändert, erhalten aber einheitliche JSDoc-Kommentare.

### Aufgaben

#### 1a — `Input`
Datei: `apps/web/src/components/ui/Input.tsx`

```tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "mono";
  iconLeft?: ReactNode;
}
```

- Klasse: `h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-fern focus:ring-2 focus:ring-fern/15`
- Bei `variant="mono"`: zusätzlich `font-mono`
- Bei `iconLeft`: Padding-Left auf `pl-9`, Icon absolut positioniert

#### 1b — `Textarea`
Datei: `apps/web/src/components/ui/Textarea.tsx`

```tsx
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
}
```

- Gleicher Focus-Style wie `Input`
- `autoResize`: wächst mit dem Inhalt via `onInput`-Handler

#### 1c — `Label`
Datei: `apps/web/src/components/ui/Label.tsx`

```tsx
interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}
```

- `text-sm font-semibold text-ink`
- Bei `required`: `<span className="ml-0.5 text-crimson">*</span>` anhängen

#### 1d — `FieldHint` & `FieldError`
Datei: `apps/web/src/components/ui/FieldHint.tsx`

```tsx
export function FieldHint({ children }: { children: ReactNode }) { … }
// text-xs text-slate-500 mt-0.5

export function FieldError({ children }: { children: ReactNode }) { … }
// text-xs text-crimson mt-0.5
```

#### 1e — `Avatar`
Datei: `apps/web/src/components/ui/Avatar.tsx`

```tsx
interface AvatarProps {
  name: string | null;
  size?: "sm" | "md" | "lg";
}
```

- Extrahiert aus `TaskCard.tsx` (`AssigneeAvatar`)
- Größen: `sm` = h-7 w-7 text-[10px], `md` = h-8 w-8 text-[11px], `lg` = h-10 w-10 text-xs
- Gradient: `from-violet to-magenta`
- Kein Name → Initialen „?" anzeigen

#### 1f — `Spinner`
Datei: `apps/web/src/components/ui/Spinner.tsx`

```tsx
interface SpinnerProps { size?: "sm" | "md"; }
```

- SVG-Kreis mit CSS-Animation `animate-spin`
- Farbe: `text-current` (erbt vom Elternelement)
- Wird in `Button` eingebaut wenn `loading`-Prop gesetzt

#### 1g — `Divider`
Datei: `apps/web/src/components/ui/Divider.tsx`

```tsx
interface DividerProps { label?: string; }
```

- Horizontale Linie `border-line`
- Mit `label`: Text mittig, Linien links/rechts

#### 1h — `Button` erweitern
Bestehende Datei anpassen:

```tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";   // neu: sm = h-8, md = h-10 (default)
  icon?: ReactNode;
  loading?: boolean;    // neu: zeigt Spinner, deaktiviert Button
}
```

### Abnahmekriterien

- [ ] Alle 8 Atom-Dateien existieren und exportieren benannte Exports
- [ ] `Input` mit `variant="mono"` zeigt Monospace-Schrift
- [ ] `Input` mit `iconLeft` verschiebt den Text korrekt
- [ ] `Textarea` mit `autoResize` wächst beim Tippen ohne Scrollbar
- [ ] `Avatar` mit `name="Max Muster"` zeigt „MM"
- [ ] `Avatar` mit `name={null}` zeigt „?"
- [ ] `Button` mit `loading={true}` zeigt Spinner und ist `disabled`
- [ ] `Button size="sm"` hat Höhe 32px
- [ ] TypeScript-Kompilierung fehlerfrei: `npm run typecheck`

### Test Suite — Atome (Vitest + React Testing Library)

Datei: `apps/web/src/components/ui/__tests__/atoms.test.tsx`

Pflichtfälle:

```
Button
  ✓ rendert label
  ✓ variant="primary" hat korrekte CSS-Klasse
  ✓ loading=true deaktiviert den Button
  ✓ onClick wird aufgerufen wenn nicht disabled
  ✓ icon-only: kein Label, quadratisch

Input
  ✓ übergibt value und onChange korrekt
  ✓ focus-Klassen werden nicht inline überschrieben
  ✓ variant="mono" enthält font-mono

Avatar
  ✓ "Max Muster" → "MM"
  ✓ "anna" → "A"
  ✓ null → "?"
  ✓ size="lg" hat korrekte Dimension

Badge / Pill / Skeleton
  ✓ jeder Tone rendert ohne Fehler
  ✓ Skeleton aria-hidden="true"
```

Befehl: `npx vitest run apps/web/src/components/ui/__tests__/atoms.test.tsx`

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-01-atoms.md`:
- Neue Dateien (Liste mit Zeilenzahl)
- Geänderte Dateien
- Test-Ergebnis (Pass/Fail-Zähler)

### Commit

```
feat(ui/atoms): extract Input, Textarea, Label, Avatar, Spinner, Divider atoms

- Add Input with mono variant and iconLeft slot
- Add Textarea with autoResize support
- Add Label with required marker
- Add FieldHint and FieldError
- Add Avatar (extracted from TaskCard.AssigneeAvatar)
- Add Spinner (used in Button loading state)
- Add Divider
- Extend Button with size and loading props
- Add atom unit tests (all passing)
```

---

## Schritt 2 — Moleküle: SegmentedControl, RadioList, SectionHeader, ProgressBar

**Branch:** `feat/design-system-02-molecules`

### Ziel
Die vier häufig benötigten, aber bisher inline implementierten Muster werden als
eigenständige Komponenten extrahiert.

### Aufgaben

#### 2a — `SegmentedControl`
Datei: `apps/web/src/components/ui/SegmentedControl.tsx`

```tsx
interface SegmentOption<T extends string> {
  value: T;
  label: string;
  activeClassName?: string;  // Ton-spezifische Klasse (z.B. "data-[active=true]:bg-fern")
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}
```

- Container: `flex flex-wrap gap-2 rounded-xl border border-line bg-steel-50 p-1.5`
- Button: `h-9 rounded-lg px-3 text-xs font-bold uppercase tracking-wide`
- Aktiv-State über `data-active`-Attribut + `activeClassName` aus der Option

Ersetzt: Inline-Status-Auswahl in `FeatureDetail`.

#### 2b — `RadioList`
Datei: `apps/web/src/components/ui/RadioList.tsx`

```tsx
interface RadioOption<T extends string> {
  value: T;
  label: string;
  activeColor?: "fern" | "tangerine" | "crimson" | "violet";
}

interface RadioListProps<T extends string> {
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}
```

- Jedes Item: `flex h-10 items-center justify-between rounded-md border px-3`
- Aktiv: `border-{color} bg-{color}/10 text-ink` + `<Check />` rechts
- Inaktiv: `border-line bg-shell/50 text-slate-600 hover:border-{color}`

Ersetzt: Inline-Status/Priorität-Auswahl in `TaskDetail` und `ProjectForm`.

#### 2c — `SectionHeader`
Datei: `apps/web/src/components/ui/SectionHeader.tsx`

```tsx
interface SectionHeaderProps {
  title: string;
  description?: string;
  variant?: "default" | "label";
  actions?: ReactNode;
}
```

- `default`: `text-sm font-semibold text-ink` + `text-sm text-slate-600`
- `label`: `text-sm font-bold uppercase tracking-wide text-slate-500`
- `actions`: Slot rechts (für Buttons/Badges)

Ersetzt: Alle `<h3>` Inline-Überschriften in Section-Containern.

#### 2d — `ProgressBar`
Datei: `apps/web/src/components/ui/ProgressBar.tsx`

```tsx
interface ProgressBarProps {
  value: number;          // 0–100
  color?: string;         // CSS-Farbe, default: var(--color-fern)
  size?: "xs" | "sm";    // xs = h-1.5, sm = h-2
  label?: string;         // optionale Text-Unterschrift
}
```

- Container: `h-{size} overflow-hidden rounded-full bg-steel-100`
- Balken: `h-full rounded-full transition-all`

Ersetzt: Inline-Fortschrittsbalken in `ProjectCard` und `TaskDetail`.

#### 2e — `ColorPicker`
Datei: `apps/web/src/components/ui/ColorPicker.tsx`

```tsx
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  swatches?: string[];
}
```

- Swatch-Buttons aus `ColorSwatch` (internes Atom)
- Custom-Color via `<input type="color">`

Extrahiert aus: `ProjectForm`.

### Abnahmekriterien

- [ ] `SegmentedControl` zeigt aktives Item mit korrekter `activeClassName`
- [ ] `RadioList` zeigt Check-Icon nur beim aktiven Item
- [ ] `SectionHeader variant="label"` ist uppercase, `variant="default"` ist normal-case
- [ ] `ProgressBar value={75}` füllt exakt 75% der Breite
- [ ] `ColorPicker` ruft `onChange` mit korrektem Hex-Wert auf
- [ ] Keine TypeScript-Fehler

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-02-molecules.md`

### Commit

```
feat(ui/molecules): add SegmentedControl, RadioList, SectionHeader, ProgressBar, ColorPicker

- SegmentedControl replaces inline status tabs in FeatureDetail
- RadioList replaces inline status/priority selectors in TaskDetail, ProjectForm
- SectionHeader unifies h3 usage across form cards
- ProgressBar extracted from ProjectCard and TaskDetail inline implementations
- ColorPicker extracted from ProjectForm
```

---

## Schritt 3 — RichTextEditor konsolidieren (TipTap)

**Branch:** `feat/design-system-03-rich-text`

### Ziel
Alle Beschreibungs- und Inhaltsfelder erhalten einen einheitlichen RTF-Editor auf
Basis von TipTap. Die bestehenden `MarkdownEditor` und `RichTextEditor` Komponenten
werden durch eine einzige ersetzt.

### Aufgaben

1. Abhängigkeiten installieren:
   ```
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-image --workspace=apps/web
   ```

2. Bestehende `apps/web/src/components/ui/RichTextEditor.tsx` vollständig ersetzen:

```tsx
interface RichTextEditorProps {
  content: string;              // HTML-String (Speicherformat)
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;           // CSS-Wert, default "8rem"
  toolbar?: "full" | "minimal"; // full = alle Buttons, minimal = B/I/Link
}
```

- Toolbar-Buttons: Fett, Kursiv, Unterstrichen, Link, H2, H3, Bullet-Liste, Nummerierte Liste, Blockquote, Code
- `minimal`-Toolbar: nur Fett, Kursiv, Link
- Datenspeicherung als HTML (nicht Markdown)
- Placeholder via TipTap-Extension

3. Alte Datei `apps/web/src/components/ui/MarkdownEditor.tsx` löschen.

4. Alle Importe von `MarkdownEditor` und altem `RichTextEditor` auf neue Komponente umstellen:
   - `FeatureDetail.tsx` (Inhalt + Beschreibung)
   - `NoteEditor.tsx`
   - `WikiEditor.tsx`
   - `WikiPageForm.tsx`
   - `CommentSection.tsx`

5. Datenbankschema-Hinweis: Wenn Felder bisher Markdown speichern, muss die Migration
   der Inhalte separat geplant werden. Codex markiert betroffene Felder mit einem
   `// TODO: migrate existing markdown` Kommentar und ändert den Feldtyp nicht.

### Abnahmekriterien

- [ ] `npm run build` erfolgreich
- [ ] Editor rendert HTML korrekt (keine Markdown-Syntax sichtbar)
- [ ] Fett/Kursiv-Buttons togglen korrekt
- [ ] Placeholder erscheint wenn Editor leer
- [ ] `toolbar="minimal"` zeigt nur 3 Buttons
- [ ] `MarkdownEditor` existiert nicht mehr als Import irgendwo
- [ ] `grep -r "MarkdownEditor" apps/web/src` gibt keine Treffer

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-03-rich-text.md`

### Commit

```
feat(ui): replace MarkdownEditor+RichTextEditor with unified TipTap RichTextEditor

- Install @tiptap/react and required extensions
- Implement full and minimal toolbar variants
- Store content as HTML
- Update all consumers: FeatureDetail, NoteEditor, WikiEditor, WikiPageForm, CommentSection
- Remove MarkdownEditor.tsx
```

---

## Schritt 4 — Section-Card & FormField-Wrapper

**Branch:** `refactor/design-system-04-section-formfield`

### Ziel
Den verstreuten `cardClass`-Konstanten und `FormCard`-Inline-Komponenten wird eine
einzige `Section`-Komponente gegenübergestellt. `FormField` unified Label + Steuerelement.

### Aufgaben

#### 4a — `Section`
Datei: `apps/web/src/components/ui/Section.tsx`

```tsx
interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}
```

- Klasse: `rounded-xl border border-line bg-white p-4 shadow-panel`
- Bei `title`: `SectionHeader` oben, dann `<Divider />`, dann `children`
- `actions` erscheint rechts neben dem Titel

Ersetzt: `FormCard` in `FeatureDetail`, `cardClass` in `TaskDetail` und `ProjectForm`.

#### 4b — `FormField`
Datei: `apps/web/src/components/ui/FormField.tsx`

```tsx
interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}
```

- Rendert: `<Label required>` → `children` → `<FieldHint>` oder `<FieldError>`
- Layout: `grid gap-1`

#### 4c — Migration bestehender Formulare
Alle `<label className="grid gap-1 ...">` Inliner in folgenden Dateien auf `FormField` umstellen:
- `FeatureDetail.tsx`
- `TaskDetail.tsx`
- `ProjectForm.tsx`
- `TaskForm.tsx`
- `FeatureForm.tsx`
- `EventForm.tsx`
- `BacklogItemForm.tsx`
- `UseCaseForm.tsx`

Die `Select`- und `DatePicker`-Komponenten werden intern auf `FormField` umgestellt.

### Abnahmekriterien

- [ ] `Section` ohne `title` rendert nur `children` ohne Header
- [ ] `FormField` mit `error` zeigt roten `FieldError`-Text
- [ ] `FormField` mit `required` zeigt `*` in Crimson
- [ ] `grep -r "cardClass\|FormCard" apps/web/src` gibt keine Treffer
- [ ] `grep -r "className=\"grid gap-1 text-sm font-" apps/web/src` gibt keine Treffer
- [ ] Visuelle Darstellung aller Formulare unverändert

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-04-section-formfield.md`

### Commit

```
refactor(ui): introduce Section card and FormField wrapper

- Add Section component replacing all cardClass/FormCard usages
- Add FormField wrapping Label + control + FieldHint/FieldError
- Migrate FeatureDetail, TaskDetail, ProjectForm, TaskForm, FeatureForm,
  EventForm, BacklogItemForm, UseCaseForm to new components
- Update Select and DatePicker to use FormField internally
```

---

## Schritt 5 — TabBar & Modal-Templates

**Branch:** `feat/design-system-05-templates`

### Ziel
TabBar, DetailModal und FormModal werden als eigenständige Template-Komponenten
extrahiert. `TaskDetail` wird als erster Konsument umgebaut.

### Aufgaben

#### 5a — `TabBar`
Datei: `apps/web/src/components/ui/TabBar.tsx`

```tsx
interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (tab: T) => void;
}
```

- Container: `flex gap-1 overflow-x-auto border-b border-line bg-white px-4`
- Tab-Button: `flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition`
- Aktiv: `border-fern text-ink`
- Inaktiv: `border-transparent text-slate-500 hover:text-ink`
- Count-Badge: `rounded-full px-2 py-0.5 text-xs` — aktiv: `bg-fern/10 text-fern`, inaktiv: `bg-shell text-slate-500`

Extrahiert aus: `TaskDetail.tsx`.

#### 5b — `DetailModal`
Datei: `apps/web/src/components/ui/DetailModal.tsx`

```tsx
interface DetailModalProps<T extends string> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;               // z.B. "TASK-42"
  metaPills?: ReactNode;           // Status, Priorität etc.
  metaInfo?: ReactNode;            // Datum, Assignee etc.
  breadcrumb?: string[];
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  footer?: ReactNode;
  children: ReactNode;
}
```

- Setzt `Modal size="xl" showHeader={false}`
- Gradient-Header: `bg-gradient-to-br from-steel-900 via-steel-800 to-steel-700`
- Schließen-, Link-kopieren-, Optionen-Buttons oben rechts (Icon-only)
- `TabBar` direkt unter dem Header
- Scrollbarer `<main>`-Bereich
- Optionaler Sticky-Footer

#### 5c — `FormModal`
Datei: `apps/web/src/components/ui/FormModal.tsx`

```tsx
interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving?: boolean;
  submitLabel?: string;
  children: ReactNode;
}
```

- Setzt `Modal size="xl" showHeader={false}`
- Gleicher Gradient-Header wie `DetailModal`, aber ohne TabBar
- Footer mit Abbrechen + Speichern-Button (immer sichtbar)
- `children` im scrollbaren Body (Slot für `Section`-Karten)

#### 5d — `TaskDetail` umbauen
`TaskDetail.tsx` wird vollständig auf `DetailModal` umgestellt:
- Alle Tab-Definitionen → `tabs`-Prop
- Gradient-Header → `DetailModal`-Header-Slot
- Footer → `DetailModal`-Footer-Slot
- Eigene Schroffheiten (inline Gradient, inline Tab-Buttons) entfernen

### Abnahmekriterien

- [ ] `TabBar` mit `count={0}` zeigt die Zahl, nicht undefined
- [ ] `TabBar` scrollt horizontal bei vielen Tabs (kein Overflow-Clip)
- [ ] `DetailModal` öffnet und schließt korrekt
- [ ] Schließen-Button ruft `onClose` auf
- [ ] Tab-Wechsel in `TaskDetail` funktioniert wie vorher
- [ ] `FormModal` zeigt Footer immer sichtbar (auch wenn Body scrollt)
- [ ] `npm run typecheck` fehlerfrei

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-05-templates.md`

### Commit

```
feat(ui/templates): add TabBar, DetailModal, FormModal; migrate TaskDetail

- Add TabBar extracted from TaskDetail inline implementation
- Add DetailModal with gradient header, TabBar, scrollable body, sticky footer
- Add FormModal for create/edit workflows
- Migrate TaskDetail to use DetailModal
```

---

## Schritt 6 — CommentThread generalisieren

**Branch:** `refactor/design-system-06-comments`

### Ziel
`CommentSection` (bisher Task-spezifisch) wird zu einem generischen `CommentThread`
Organism, das von jedem Domain-Objekt genutzt werden kann.

### Aufgaben

1. Neue Datei `apps/web/src/components/ui/CommentThread.tsx`:

```tsx
interface CommentThreadProps {
  comments: Comment[];
  onCreate: (input: { body: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  entityLabel?: string;  // z.B. "Projekt", "Feature" — für EmptyState-Text
}
```

2. `CommentItem` als interne Subkomponente:
   - `Avatar` aus Schritt 1
   - Body-Text mit `RichTextEditor` (readonly-Modus)
   - Icon-only Delete-Button (kein Label)

3. `CommentComposer` als interne Subkomponente:
   - `RichTextEditor toolbar="minimal"`
   - Senden-Button: Icon `<Send />` + Label „Kommentar" (primary)
   - Enter-to-Submit optional

4. Bestehende `CommentSection.tsx` löschen, alle Importe auf `CommentThread` umstellen
   (aktuell nur `TaskDetail.tsx`).

### Abnahmekriterien

- [ ] `CommentThread` rendert `EmptyState` wenn `comments.length === 0`
- [ ] Neuer Kommentar erscheint nach `onCreate` in der Liste
- [ ] Delete-Button ruft `onDelete` mit korrekter ID auf
- [ ] `CommentSection.tsx` existiert nicht mehr
- [ ] `grep -r "CommentSection" apps/web/src` gibt keine Treffer

### Test Suite — CommentThread (Vitest + React Testing Library)

Datei: `apps/web/src/components/ui/__tests__/CommentThread.test.tsx`

```
CommentThread
  ✓ zeigt EmptyState wenn comments=[]
  ✓ rendert alle übergebenen Kommentare
  ✓ onCreate wird mit body aufgerufen beim Absenden
  ✓ onCreate mit leerem body wird nicht aufgerufen
  ✓ onDelete wird mit korrekter id aufgerufen
  ✓ entityLabel erscheint im EmptyState-Text
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-06-comments.md`

### Commit

```
refactor(ui): generalize CommentSection into CommentThread organism

- Add CommentThread with CommentItem and CommentComposer subcomponents
- Use Avatar atom for author display
- Use RichTextEditor in minimal mode for composer
- Remove CommentSection.tsx
- Add CommentThread integration tests
```

---

## Schritt 7 — ListBoardView-Infrastruktur

**Branch:** `feat/design-system-07-list-board`

### Ziel
Die zentrale Listenansicht mit Board/Listen-Toggle und `+`-Button wird als
eigenständiges Organism etabliert. `ItemCard` und `ItemRow` bilden die Basis
für alle Domain-Karten.

### Aufgaben

#### 7a — `ItemCard`
Datei: `apps/web/src/components/ui/ItemCard.tsx`

```tsx
interface ItemCardProps {
  accentColor?: string;     // 1px Accent-Bar oben, optional
  onOpen?: () => void;      // Click + DblClick Handler
  onEdit?: () => void;      // Edit-Icon-Button (Pencil)
  onDelete?: () => void;    // Delete-Icon-Button (Trash)
  header: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  className?: string;
}
```

- `rounded-2xl border border-line bg-white p-5 shadow-sm`
- Hover: `hover:-translate-y-0.5 hover:shadow-panel transition duration-200`
- Doppelklick ruft `onOpen` auf
- Edit-Button: `<Edit3 />` Icon-only ghost, `z-20` relativ
- Delete-Button: `<Trash2 />` Icon-only ghost, `z-20` relativ
- Accent-Bar als `absolute inset-x-0 top-0 h-1`

#### 7b — `ItemRow`
Datei: `apps/web/src/components/ui/ItemRow.tsx`

```tsx
interface ItemRowProps {
  accentColor?: string;     // 4px linker Border
  statusIndicator?: ReactNode;
  title: string;
  description?: string;
  pills?: ReactNode;
  meta?: ReactNode;         // Datum, Assignee etc.
  actions?: ReactNode;      // Edit/Delete Buttons
  onOpen?: () => void;
  className?: string;
}
```

- `grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-4`
- `rounded-xl border border-l-[4px] border-line bg-white px-4 py-3.5 shadow-sm`
- Hover: `hover:border-steel-300 hover:shadow-md transition`
- Doppelklick ruft `onOpen` auf

#### 7c — `KanbanColumn` refactoring
Bestehende `KanbanColumn.tsx` wird auf `ItemCard` umgestellt.
`+`-Button pro Spalte ruft `onAddItem(status)` Callback auf.

#### 7d — `CardGrid`
Datei: `apps/web/src/components/ui/CardGrid.tsx`

```tsx
interface CardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}
```

- `grid gap-4` mit responsiven Spalten
- Wird genutzt wenn keine Status-Gruppierung (kein Kanban nötig)

#### 7e — `ListBoardView`
Datei: `apps/web/src/components/ui/ListBoardView.tsx`

```tsx
type ListBoardMode = "list" | "board";

interface ListBoardViewProps<T> {
  items: T[];
  mode: ListBoardMode;
  onModeChange: (mode: ListBoardMode) => void;
  onAdd: () => void;                            // + Button
  addLabel?: string;                            // aria-label für + Button
  statusKey?: keyof T;                          // → Kanban wenn gesetzt
  statusColumns?: StatusColumn[];               // Kanban-Spalten-Definitionen
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;                          // FilterChips-Slot
  emptyState?: ReactNode;
  loading?: boolean;
}
```

- Toolbar: `SearchInput` + `filters`-Slot + `ViewToggle` + `+`-Button
- `+`-Button: `Button variant="primary" icon={<Plus />}` ohne Label (Icon-only), `aria-label={addLabel}`
- Bei `loading`: zeigt Skeleton-Variante
- Bei `items.length === 0`: zeigt `emptyState`
- Board-Modus + `statusKey`: `KanbanBoard`
- Board-Modus ohne `statusKey`: `CardGrid`
- Listen-Modus: vertikale `ItemRow`-Liste

### Abnahmekriterien

- [ ] `ItemCard` mit `accentColor` zeigt farbigen Top-Border
- [ ] Doppelklick auf `ItemCard` ruft `onOpen` auf
- [ ] Edit- und Delete-Buttons haben kein sichtbares Label (nur `aria-label`)
- [ ] `ListBoardView` wechselt korrekt zwischen Board und Liste
- [ ] `+`-Button in `ListBoardView` ruft `onAdd` auf
- [ ] `KanbanBoard` ohne `statusKey` fällt auf `CardGrid` zurück
- [ ] `SearchInput` filtert sichtbare Items (Filterlogik liegt im Elternelement)
- [ ] `loading={true}` zeigt Skeleton statt leere Liste

### Test Suite — ListBoardView (Vitest + React Testing Library)

Datei: `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx`

```
ListBoardView
  ✓ rendert Items als Karten im Board-Modus
  ✓ rendert Items als Zeilen im Listen-Modus
  ✓ ViewToggle wechselt Modus
  ✓ + Button ruft onAdd auf
  ✓ EmptyState erscheint wenn items=[]
  ✓ loading=true zeigt Skeleton, kein EmptyState
  ✓ SearchInput-Änderung ruft onSearchChange auf

ItemCard
  ✓ Doppelklick ruft onOpen auf
  ✓ Edit-Button ruft onEdit auf (nicht onOpen)
  ✓ Delete-Button ruft onDelete auf
  ✓ accentColor setzt backgroundColor

ItemRow
  ✓ rendert title und description
  ✓ Doppelklick ruft onOpen auf
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-07-list-board.md`

### Commit

```
feat(ui): add ListBoardView infrastructure with ItemCard, ItemRow, CardGrid

- Add ItemCard base with accent bar, hover lift, dbl-click, icon-only actions
- Add ItemRow base for list mode
- Add CardGrid for statusless board mode
- Refactor KanbanColumn to use ItemCard and per-column add callback
- Add ListBoardView with toolbar (Search + Filter + ViewToggle + AddButton)
- Add ListBoardView and ItemCard/ItemRow integration tests
```

---

## Schritt 8 — RelationPanel

**Branch:** `feat/design-system-08-relation-panel`

### Ziel
Der generische n:m-Relation-Manager wird erstellt. `FeaturePicker`, `UseCasePicker`
und `ProjectFeaturePanel` werden abgelöst.

### Aufgaben

#### 8a — `RelationPanel<T>`
Datei: `apps/web/src/components/ui/RelationPanel.tsx`

```tsx
interface RelationItem {
  id: number;
  [key: string]: unknown;
}

interface RelationPanelProps<T extends RelationItem> {
  items: T[];                            // Alle verfügbaren Items
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  renderItem: (item: T, checked: boolean) => ReactNode;
  searchKeys?: Array<keyof T>;           // Felder für Suche
  groupBy?: keyof T;                     // Optionale Gruppierung
  groupLabel?: (groupValue: unknown) => string;
  emptyAvailable?: ReactNode;
  emptySelected?: ReactNode;
  title: string;
}
```

- Header: `title` + „{n} verknüpft" Badge + Speichern-Button (Icon `<Save />` + Label)
- `SearchInput` zum Filtern
- Sortierung: Verknüpfte Items zuerst (oben), dann nicht verknüpfte
- Checkbox-Toggle per `renderItem`-Slot
- Optionale Gruppierung über `groupBy` mit `<Divider label>` zwischen Gruppen

#### 8b — `FeatureRelationPanel`
Datei: `apps/web/src/components/features/FeatureRelationPanel.tsx`

Wrapper um `RelationPanel<Feature>` mit vordefinierten `renderItem` und `searchKeys`.
Ersetzt `FeaturePicker` und `ProjectFeaturePanel`.

#### 8c — `UseCaseRelationPanel`
Datei: `apps/web/src/components/usecases/UseCaseRelationPanel.tsx`

Wrapper um `RelationPanel<UseCase>` mit `groupBy="featureId"`.
Ersetzt `UseCasePicker`.

#### 8d — Ablösung
- `FeaturePicker.tsx` löschen
- `UseCasePicker.tsx` löschen
- `ProjectFeaturePanel.tsx` löschen (Features-Tab im Projekt nutzt `FeatureRelationPanel`)
- `FeatureProjectLinksPanel.tsx` löschen (Projekte-Tab im Feature nutzt `RelationPanel<Project>`)

### Abnahmekriterien

- [ ] `RelationPanel` zeigt verknüpfte Items oben, unverknüpfte unten
- [ ] Suche filtert korrekt nach `searchKeys`
- [ ] `onSave` wird nur beim Klick auf Speichern ausgelöst, nicht bei jedem Toggle
- [ ] `groupBy` rendert `<Divider>` zwischen Gruppen
- [ ] `FeaturePicker.tsx`, `UseCasePicker.tsx`, `ProjectFeaturePanel.tsx`, `FeatureProjectLinksPanel.tsx` existieren nicht mehr

### Test Suite — RelationPanel (Vitest + React Testing Library)

Datei: `apps/web/src/components/ui/__tests__/RelationPanel.test.tsx`

```
RelationPanel
  ✓ rendert alle items
  ✓ verknüpfte Items erscheinen vor unverknüpften
  ✓ Toggle ändert selectedIds
  ✓ Speichern ruft onSave auf
  ✓ Suche filtert items nach searchKeys
  ✓ groupBy rendert Trennlinien
  ✓ emptyAvailable erscheint wenn items=[]
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-08-relation-panel.md`

### Commit

```
feat(ui): add RelationPanel generic n:m relation manager

- Add RelationPanel<T> with search, grouping, linked-first sorting, save action
- Add FeatureRelationPanel and UseCaseRelationPanel domain wrappers
- Remove FeaturePicker, UseCasePicker, ProjectFeaturePanel, FeatureProjectLinksPanel
- Add RelationPanel integration tests
```

---

## Schritt 9 — Domain: Task

**Branch:** `refactor/design-system-09-task`

### Ziel
Die gesamte Task-Domäne wird auf die neue Komponentenhierarchie umgestellt.
`TaskDetail` bekommt dedizierte Features- und Use-Cases-Tabs.

### Aufgaben

#### 9a — TaskCard → ItemCard
`TaskCard.tsx` wird auf `ItemCard` aufgebaut:
- `header`: Titel + Prioritäts-/Status-Pills
- `body`: Beschreibung (3-zeilig geclampt)
- `footer`: Subtask-Count + Fälligkeitsdatum + Tags
- Prioritäts-Accent via `accentColor`-Prop
- `onOpen` = Click + DblClick, `onEdit` = Edit-Icon, `onDelete` = Delete-Icon
- `TaskRow` analog über `ItemRow`

#### 9b — TaskForm — Full Payload
`TaskForm.tsx` wird auf `FormModal` umgestellt und erhält vollständigen Payload:
- Felder (via `FormField` + Atom): Titel, Beschreibung (`RichTextEditor`), Status (`RadioList`), Priorität (`RadioList`), Assignee (`Input`), Fälligkeitsdatum (`DatePicker`)
- Abschnitte (via `Section`): Basisdaten · Status & Priorität · Zuweisung · Tags · Features · Use Cases
- `TagPicker`, `FeatureRelationPanel`, `UseCaseRelationPanel` eingebunden
- Kein separater Speichern-Button für Relationen — alles in einem Submit

#### 9c — TaskDetail — Tab-Aufteilung
`TaskDetail.tsx` (bereits auf `DetailModal` umgestellt in Schritt 5) erhält neue Tabs:

| Tab | Inhalt |
|---|---|
| Details | Formulärfelder via `Section` + `FormField` |
| **Features** | `FeatureRelationPanel` (eigener Tab, eigener Save) |
| **Use Cases** | `UseCaseRelationPanel` mit `groupBy="featureId"` (eigener Tab, eigener Save) |
| Subtasks | `SubtaskList` |
| Kommentare | `CommentThread` |
| Notizen | `NoteList` |
| Dateien | `AttachmentList` |

Der bisherige kombinierte „Features & UCs"-Tab entfällt.

#### 9d — TaskListBoardView
`TaskList.tsx` und `KanbanBoard.tsx` werden durch eine `TaskListBoardView` ersetzt,
die `ListBoardView` mit `statusKey="status"` und `statusColumns` für todo/in_progress/done nutzt.
`+`-Button öffnet `TaskForm`. Alle anderen „Neue Aufgabe"-Buttons auf der Seite entfallen.

### Abnahmekriterien

- [ ] TaskCard zeigt kein Text-Label an Edit/Delete-Buttons
- [ ] Doppelklick auf TaskCard öffnet TaskDetail
- [ ] TaskForm mit `featureIds` und `useCaseIds` im Submit-Payload
- [ ] TaskDetail: Features-Tab zeigt `FeatureRelationPanel`
- [ ] TaskDetail: Use-Cases-Tab zeigt `UseCaseRelationPanel` gruppiert nach Feature
- [ ] Kein „Neue Aufgabe"-Button außerhalb der `ListBoardView`-Toolbar
- [ ] Board-Modus zeigt Kanban-Spalten (todo / in_progress / done)

### Test Suite — Task CRUD (Playwright E2E)

Datei: `apps/web/e2e/task.spec.ts`

```
Task CRUD
  ✓ Task erstellen: + Button → Form → Speichern → Task erscheint in Liste
  ✓ Task erstellen mit Tags → Tags erscheinen auf TaskCard
  ✓ Task erstellen mit Feature-Relation → Feature im Features-Tab sichtbar
  ✓ Task öffnen: Doppelklick → TaskDetail Modal öffnet sich
  ✓ Task bearbeiten: Titel ändern → Speichern → neuer Titel auf TaskCard
  ✓ Task löschen: Delete-Icon → ConfirmDialog → Task verschwindet aus Liste
  ✓ View Toggle: Board-Modus zeigt Kanban-Spalten
  ✓ View Toggle: Listen-Modus zeigt Zeilen-Layout
  ✓ Kommentar erstellen → erscheint im Kommentare-Tab
  ✓ Kommentar löschen → verschwindet
  ✓ Feature verknüpfen im Features-Tab → Speichern → bleibt verknüpft
```

Playwright-Konfiguration: `apps/web/playwright.config.ts` anlegen falls nicht vorhanden.

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-09-domain-task.md`

### Commit

```
refactor(domain/task): migrate Task to unified design system

- Rebuild TaskCard on ItemCard base (icon-only actions, dbl-click, accent bar)
- Upgrade TaskForm to FormModal with full payload (tags, features, use cases)
- Split TaskDetail docs tab into separate Features and Use Cases tabs
- Add TaskListBoardView using ListBoardView with Kanban statusKey
- Remove all secondary "Neue Aufgabe" buttons
- Add Task E2E test suite
```

---

## Schritt 10 — Domain: Feature

**Branch:** `refactor/design-system-10-feature`

### Ziel
Feature-Karte, -Formular und -Detailseite werden vereinheitlicht.

### Aufgaben

#### 10a — FeatureCard → ItemCard
- `header`: Icon-Box + Titel + Slug + Status-Pill
- `footer`: UC-Count + ArrowRight-Icon (Hover-Effekt bleibt)
- DblClick → navigiert zu `/features/:id`

#### 10b — FeatureForm — Full Payload
`FormModal` mit:
- `Section` Stammdaten: Titel (`Input`), Slug (`Input variant="mono"`), Sortierung (`Input type="number"`)
- `Section` Status: `SegmentedControl` mit 4 Zuständen
- `Section` Kurzbeschreibung: `RichTextEditor toolbar="minimal"`
- `Section` Inhalt: `RichTextEditor toolbar="full"`
- `Section` Tags: `TagPicker` (falls Features Tags haben — sonst weglassen)

#### 10c — FeatureDetail → Tabs
`FeatureDetailPage.tsx` erhält `DetailPage`-Layout mit Tabs:

| Tab | Inhalt |
|---|---|
| Stammdaten | `FeatureDetail`-Formular via `Section` + `FormField` |
| **Projekte** | `RelationPanel<Project>` |
| Use Cases | `UseCaseList` als `ListBoardView` (1:n, kein Picker) + `+`-Button |
| Aufgaben | `RelationPanel<Task>` (Gegenrichtung) |
| Kommentare | `CommentThread` |
| Dateien | `AttachmentList` |

`FeatureProjectLinksPanel.tsx` wird dabei abgelöst (bereits in Schritt 8).

#### 10d — FeatureListBoardView
Ersetzt `FeatureList.tsx`, `statusKey="status"` → Kanban.

### Abnahmekriterien

- [ ] FeatureCard: Icon-only Edit/Delete, DblClick navigiert
- [ ] FeatureForm: RTF-Editor für Beschreibung und Inhalt
- [ ] FeatureDetailPage: 6 Tabs korrekt dargestellt
- [ ] Projekte-Tab: `RelationPanel<Project>` verknüpft/trennt korrekt
- [ ] Use-Cases-Tab: `ListBoardView` mit `+`-Button zum Erstellen neuer UCs
- [ ] Feature E2E Tests

### Test Suite — Feature CRUD (Playwright E2E)

Datei: `apps/web/e2e/feature.spec.ts`

```
Feature CRUD
  ✓ Feature erstellen: + Button → Form → Speichern → erscheint in Liste
  ✓ Feature öffnen: Doppelklick → navigiert zu /features/:id
  ✓ Feature bearbeiten: Titel + RTF-Inhalt → Speichern → Änderung sichtbar
  ✓ Feature löschen: Delete → Confirm → verschwindet
  ✓ Projekt verknüpfen im Projekte-Tab → Speichern → bleibt verknüpft
  ✓ Use Case erstellen im UC-Tab → erscheint in UC-Liste
  ✓ Board / Listen Toggle in Feature-Übersicht
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-10-domain-feature.md`

### Commit

```
refactor(domain/feature): migrate Feature to unified design system

- Rebuild FeatureCard on ItemCard base
- Upgrade FeatureForm to FormModal with RichTextEditor for description+content
- Add FeatureDetailPage tab structure with RelationPanel<Project>, CommentThread
- Replace FeatureList with FeatureListBoardView
- Add Feature E2E test suite
```

---

## Schritt 11 — Domain: Projekt

**Branch:** `refactor/design-system-11-project`

### Ziel
Projektkarte, -formular und -detailseite werden vereinheitlicht.

### Aufgaben

#### 11a — ProjectCard → ItemCard
- `header`: Farbiger Avatar + Name + Status-Pill + Tags
- `body`: Beschreibung
- `footer`: `ProgressBar` + Task-Zähler + Avatar-Reihe
- Accent-Bar oben in Projektfarbe

#### 11b — ProjectForm — Full Payload
`FormModal` mit:
- `Section` Stammdaten: Name (`Input`), Beschreibung (`RichTextEditor`)
- `Section` Identität: `ColorPicker` + `SegmentedControl` für Status
- `Section` Zeitraum: Start (`DatePicker`) + Fällig (`DatePicker`)
- `Section` Tags: `TagPicker`
- `Section` Features: `FeatureRelationPanel` (Vorauswahl für neue Projekte)
- Kein separater Speichern-Button für Relationen

#### 11c — ProjectDetailPage — Tabs
Vollständiger Umbau der `ProjectDetailPage`:

| Tab | Inhalt |
|---|---|
| Stammdaten | `ProjectForm`-Felder (Inline-Edit, kein Modal) |
| **Features** | `FeatureRelationPanel` |
| Aufgaben | `TaskListBoardView` (projekt-gefiltert) |
| Kommentare | `CommentThread` |
| Dateien | `AttachmentList` |
| Notizen | `NoteList` |

#### 11d — ProjectListBoardView
Ersetzt `ProjectList.tsx`, `statusKey="status"` → Kanban.

### Abnahmekriterien

- [ ] ProjectCard: ProgressBar sichtbar wenn Tasks vorhanden
- [ ] ProjectCard: Accent-Bar in Projektfarbe
- [ ] ProjectForm: RTF-Editor für Beschreibung
- [ ] Projekte-Übersicht: Board zeigt Kanban nach Status
- [ ] Features-Tab: `FeatureRelationPanel` speichert korrekt
- [ ] Kein „Neues Projekt"-Button außerhalb der ListBoardView

### Test Suite — Projekt CRUD (Playwright E2E)

Datei: `apps/web/e2e/project.spec.ts`

```
Projekt CRUD
  ✓ Projekt erstellen: + Button → Form → Speichern → erscheint in Liste
  ✓ Farbe wählen → Accent-Bar in korrekter Farbe
  ✓ Projekt öffnen: Doppelklick → navigiert zu /projects/:id
  ✓ Projekt bearbeiten: Name → Speichern → neuer Name sichtbar
  ✓ Projekt löschen: Delete → Confirm → verschwindet
  ✓ Feature verknüpfen im Features-Tab
  ✓ Aufgabe erstellen im Aufgaben-Tab (+ Button)
  ✓ Board / Listen Toggle
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-11-domain-project.md`

### Commit

```
refactor(domain/project): migrate Project to unified design system

- Rebuild ProjectCard on ItemCard base with ProgressBar, accent color
- Upgrade ProjectForm to FormModal with RichTextEditor, ColorPicker, FeatureRelationPanel
- Add ProjectDetailPage tab structure with CommentThread
- Replace ProjectList with ProjectListBoardView
- Add Project E2E test suite
```

---

## Schritt 12 — Domain: Use Case & Backlog

**Branch:** `refactor/design-system-12-uc-backlog`

### Aufgaben

#### Use Case
- `UseCaseCard` / `UseCaseRow` auf `ItemCard` / `ItemRow`
- `UseCaseForm` auf `FormModal` mit `RichTextEditor`, Feature-Auswahl (`Select`)
- `UseCaseDetail` auf `DetailModal` mit Tabs: Stammdaten · Aufgaben (`RelationPanel<Task>`) · Kommentare · Dateien
- `UseCaseList` → `UseCaseListBoardView` (kein `statusKey` → `CardGrid`)

#### Backlog
- `BacklogItemRow` auf `ItemRow`
- `BacklogItemForm` auf `FormModal` mit `RichTextEditor`
- `BacklogList` → `BacklogListBoardView` (kein `statusKey` → `CardGrid`)
- `BacklogItemCommentThread` = `CommentThread`

### Abnahmekriterien

- [ ] Use Case erstellen mit Feature-Zuordnung funktioniert
- [ ] Use Case öffnen zeigt Aufgaben-Relation im Tab
- [ ] Backlog-Item erstellen und löschen funktioniert
- [ ] `CommentThread` im Backlog-Item-Detail funktioniert

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-12-domain-uc-backlog.md`

### Commit

```
refactor(domain): migrate UseCase and Backlog to unified design system
```

---

## Schritt 13 — Domain: Wiki & Kalender

**Branch:** `refactor/design-system-13-wiki-calendar`

### Aufgaben

#### Wiki
- `WikiPageDetail` erhält `CommentThread`-Tab
- `WikiPageForm` erhält `RichTextEditor toolbar="full"`
- `WikiEditor` wird auf neuen `RichTextEditor` umgestellt
- `WikiImportPanel` bleibt strukturell unverändert

#### Kalender
- `EventForm` wird auf `FormModal` + `FormField` + `RichTextEditor toolbar="minimal"` umgestellt
- `CalendarView` bleibt strukturell unverändert (spezialisiert)
- `UpcomingEvents` wird auf `ItemRow` aufgebaut

### Abnahmekriterien

- [ ] Wiki-Seiteninhalt wird im RTF-Editor bearbeitet
- [ ] Wiki-Seite hat Kommentare-Tab mit `CommentThread`
- [ ] Event-Formular nutzt `FormModal`

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-13-domain-wiki-calendar.md`

### Commit

```
refactor(domain): migrate Wiki and Calendar to unified design system
```

---

## Schritt 14 — Kommentarstränge für alle Domain-Objekte

**Branch:** `feat/design-system-14-comments-rollout`

### Ziel
`CommentThread` wird in allen Domain-Objekten aktiviert, die noch keinen haben.
Dies erfordert API-Erweiterungen im Backend.

### Betroffene Domain-Objekte

| Objekt | Bereits vorhanden | Neu |
|---|---|---|
| Task | ✅ | — |
| Feature | — | ✅ |
| Projekt | — | ✅ |
| Use Case | — | ✅ |
| Backlog-Item | — | ✅ |
| Wiki-Seite | — | ✅ |

**Nicht:** Tags, Attachments, Notizen, Kalender-Events.

### Backend-Aufgaben (`apps/api`)

Für jedes neue Domain-Objekt:
1. Route `GET /api/{entity}/{id}/comments` → Liste
2. Route `POST /api/{entity}/{id}/comments` → Erstellen (`{ body: string }`)
3. Route `DELETE /api/{entity}/{id}/comments/:commentId` → Löschen

Datenbankschema: Die bestehende `comments`-Tabelle prüfen ob sie `entityType`/`entityId`
unterstützt (polymorphes Pattern) oder ob separate Tabellen sinnvoller sind.

### Frontend-Aufgaben

Je Domain-Objekt:
- Hook `use{Entity}Comments(id)` mit `createComment` und `removeComment`
- `CommentThread` im zugehörigen Detail-Tab einbinden

### Abnahmekriterien

- [ ] Kommentar an Feature erstellen → erscheint im Feature-Kommentare-Tab
- [ ] Kommentar an Projekt erstellen → erscheint im Projekt-Kommentare-Tab
- [ ] Kommentar an Use Case erstellen → erscheint
- [ ] Kommentar an Backlog-Item erstellen → erscheint
- [ ] Kommentar an Wiki-Seite erstellen → erscheint
- [ ] Kommentar löschen funktioniert für alle Objekte

### Test Suite — Comment Rollout (Integration)

Datei: `apps/web/src/components/ui/__tests__/CommentThread.integration.test.tsx`

```
CommentThread API Integration (MSW mock)
  ✓ lädt Kommentare beim Öffnen
  ✓ erstellt Kommentar → Liste aktualisiert
  ✓ löscht Kommentar → verschwindet aus Liste
  ✓ API-Fehler → Toast mit Fehlermeldung
```

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-14-comments-rollout.md`

### Commit

```
feat(comments): roll out CommentThread to Feature, Project, UseCase, Backlog, Wiki

- Add API routes for comments on Feature, Project, UseCase, BacklogItem, WikiPage
- Add useComments hooks per entity
- Wire CommentThread into detail views for all entities
- Add Comment integration tests with MSW mocks
```

---

## Schritt 15 — Bereinigung & Dead-Code-Entfernung

**Branch:** `chore/design-system-15-cleanup`

### Aufgaben

1. **Veraltete Komponenten entfernen** (sollten nach Schritten 8–14 leer sein):
   - `ProjectFeaturePanel.tsx` (→ Schritt 8)
   - `FeatureProjectLinksPanel.tsx` (→ Schritt 8)
   - `CommentSection.tsx` (→ Schritt 6)
   - `FeaturePicker.tsx` (→ Schritt 8)
   - `UseCasePicker.tsx` (→ Schritt 8)

2. **Ungenutzten Code prüfen:**
   ```
   npx ts-prune apps/web/src
   ```
   Alle gemeldeten ungenutzten Exports entfernen oder begründen.

3. **Doppelte Definitionen entfernen:**
   - Alle lokalen `cardClass`-Konstanten (→ durch `Section` ersetzt)
   - Alle lokalen `statusLabels`/`statusTones`-Records in Domain-Komponenten
     → in `apps/web/src/utils/domainLabels.ts` zentralisieren

4. **CSS-Audit:**
   - `grep -r "shadow-\[" apps/web/src` → alle inline Schatten durch Tokens ersetzen
   - `grep -r "rounded-\[" apps/web/src` → prüfen, ob Standardwerte verwendbar

5. **Dokumentation:**
   - `docs/design-system.md` anlegen mit Komponentenübersicht und Tone-Referenz

### Abnahmekriterien

- [ ] `npx ts-prune apps/web/src` meldet 0 ungenutzte Exports (oder alle Ausnahmen begründet)
- [ ] `grep -r "cardClass\|FormCard" apps/web/src` → keine Treffer
- [ ] `grep -r "CommentSection\|FeaturePicker\|UseCasePicker" apps/web/src` → keine Treffer
- [ ] `npm run build` fehlerfrei
- [ ] `docs/design-system.md` existiert

### Log-Eintrag

`logs/YYYY-MM-DD-schritt-15-cleanup.md`

### Commit

```
chore(cleanup): remove dead code, centralize domain labels, add design system docs

- Remove deprecated component files (CommentSection, FeaturePicker, etc.)
- Centralize statusLabels/statusTones in utils/domainLabels.ts
- Replace all remaining inline shadow and rounded values with tokens
- Add docs/design-system.md component reference
```

---

## Anhang A — Test-Strategie Übersicht

| Test-Art | Tool | Wann | Was wird getestet |
|---|---|---|---|
| Unit | Vitest + RTL | Schritt 1 | Atom-Rendering, Props, Events |
| Integration | Vitest + RTL | Schritte 6, 7, 8, 14 | Organism-Verhalten, State-Übergänge |
| E2E | Playwright | Schritte 9, 10, 11 | Vollständige CRUD-Flows im Browser |

**Grundsatz:** Unit-Tests prüfen Atome isoliert. Integration-Tests prüfen Organisms
mit gemockten API-Aufrufen (MSW). E2E-Tests laufen gegen den echten Dev-Server mit
einer Testdatenbank.

**Pflicht-Testfälle für alle CRUD-fähigen Domain-Objekte:**
1. Erstellen via `+`-Button → Item erscheint in Liste
2. Öffnen via Doppelklick → Detail öffnet sich
3. Bearbeiten → Änderung bleibt erhalten
4. Löschen via Delete-Icon → ConfirmDialog → Item verschwindet
5. View-Toggle → Board und Liste beide funktional

---

## Anhang B — Commit-Konventionen

```
<typ>(<scope>): <kurze Beschreibung>

<optionaler Body>
```

| Typ | Bedeutung |
|---|---|
| `feat` | Neue Funktionalität |
| `refactor` | Umstrukturierung ohne Verhaltensänderung |
| `fix` | Bugfix |
| `test` | Tests hinzufügen oder ändern |
| `chore` | Build, Tooling, Dokumentation |

**Scopes:** `ui`, `ui/atoms`, `ui/templates`, `domain/task`, `domain/feature`,
`domain/project`, `domain/uc`, `comments`, `tokens`, `cleanup`

---

## Anhang C — Log-Datei Vorlage

```markdown
# Schritt XX — {Name}
**Datum:** YYYY-MM-DD  
**Branch:** feat/design-system-XX-name  
**Status:** ✅ Abgeschlossen / 🔄 In Arbeit / ❌ Blockiert

## Geänderte Dateien
- `path/to/file.tsx` — Beschreibung der Änderung
- …

## Neue Dateien
- `path/to/new.tsx` — Kurzbeschreibung

## Gelöschte Dateien
- `path/to/old.tsx` — Begründung

## Test-Ergebnis
- Unit: XX/XX passed
- Integration: XX/XX passed
- E2E: XX/XX passed

## Offene Punkte / Bekannte Einschränkungen
- …

## Abnahme
- [ ] Alle Abnahmekriterien erfüllt
- [ ] Review durchgeführt
- [ ] Commit erstellt
```

---

*Ende des Codex-Großauftrags*  
*Gesamtschritte: 15 · Test-Suites: 6 · Geschätzter Umfang: 8–12 Entwicklertage*
