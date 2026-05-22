# UI Design Richtlinien – Projekt Manager

> Status: Entwurf (erarbeitet aus Codebase-Analyse, Mai 2026)  
> Ziel: Verbindliche Grundlage für konsistentes UI-Design im gesamten Frontend.  
> Scope: `apps/web/src`

---

## 1. Design-Token-System

Alle Farben werden ausschließlich über die definierten CSS-Custom-Properties aus `src/styles/theme.css` und die zugehörigen Tailwind-Aliases referenziert. **Raw-Tailwind-Farben wie `slate-*` oder `gray-*` sind verboten.**

### 1.1 Semantische Farb-Tokens

| Token         | Hex       | Verwendung                                 |
|---------------|-----------|--------------------------------------------|
| `ink`         | `#0F2542` | Primärer Fließtext, Überschriften           |
| `shell`       | `#F4F7FA` | Seitenhintergrund, neutrale Flächen        |
| `line`        | `#D5DEE9` | Rahmen, Trennlinien, Divider               |
| `white`       | `#FFFFFF`  | Kartenoberflächen, Eingabefelder, Modals   |

### 1.2 Steel-Skala (Primärfarbe)

Die Steel-Skala ist die Hauptmarkenfarbe. Sie wird für interaktive Elemente, den Sidebar-Hintergrund, aktive Zustände und CTAs eingesetzt.

| Token         | Hex       | Typischer Einsatz                           |
|---------------|-----------|---------------------------------------------|
| `steel-50`    | `#F4F7FA` | = `shell`; Hover-Hintergründe               |
| `steel-100`   | `#E8EFF5` | Skeleton, SearchInput-Hintergrund, Chips    |
| `steel-200`   | `#D5E1EE` | Subtile Rahmen                              |
| `steel-300`   | `#BACDE3` | Blockquote-Rand, Divider                    |
| `steel-400`   | `#94B2D1` | Placeholder-Icons, Sidebar-Abschnittslabel |
| `steel-500`   | `#6B92BD` | Pill-Hintergrund (Neutral-Status)           |
| `steel-600`   | `#4682B4` | Input-Focus-Rahmen                          |
| `steel-700`   | `#2E5984` | **Primär-CTA**, aktiver Tab, Sidebar-Aktiv  |
| `steel-800`   | `#1B355C` | Sidebar-Hintergrund (Ende des Verlaufs)     |
| `steel-900`   | `#0F2542` | = `ink`; Sidebar-Hintergrund (Anfang), SegmentedControl-Aktiv |

### 1.3 Akzentfarben

Werden ausschließlich für semantische Zustände (Status, Priorität, Kategorie) und UI-Betonungen eingesetzt. Niemals als allgemeines Designelement verwenden.

| Token        | Bedeutung                      |
|--------------|-------------------------------|
| `crimson`    | Fehler, Gefahr, Lösch-Aktionen |
| `tangerine`  | Warnung, langsam               |
| `mustard`    | Hinweis, niedrige Priorität    |
| `fern`       | Erfolg, aktiv, offen           |
| `teal`       | Info, geerbte Relation         |
| `violet`     | Feature, Use Case              |
| `magenta`    | Sonderkategorie                |

### 1.4 Schatten-Tokens

| Token           | Einsatz                                      |
|-----------------|----------------------------------------------|
| `shadow-sm`     | Standardschatten auf Karten/Rows (ruhig)     |
| `shadow-panel`  | Hover-Zustand Karte, Dropdowns, Menüs        |
| `shadow-card`   | Alternativschatten für Cards (leichter)      |
| `shadow-modal`  | Modals und Dialoge                           |
| `shadow-steel`  | EmptyState first-run, Sonderbetonungen       |
| `shadow-steel-icon` | Icon-Avatare, Logo-Badge                 |

---

## 2. Typografie

**Schrift:** Inter (über Tailwind `fontFamily.sans` definiert).  
**Rendering:** `-webkit-font-smoothing: antialiased` ist global gesetzt.

### 2.1 Textgrößen-Hierarchie

| Ebene                | Klassen                            | Beispiel-Einsatz                    |
|----------------------|------------------------------------|-------------------------------------|
| Seitenüberschrift    | `text-2xl font-semibold text-ink`  | `<h1>` auf Listen-/Übersichtsseiten |
| Modal-/Abschnittstitel | `text-lg font-semibold text-ink` | `Modal`-Header, Abschnittsköpfe    |
| Sekundärer Abschnittstitel | `text-sm font-semibold text-ink` | `SectionHeader` default            |
| Label-Abschnittstitel | `text-sm font-bold uppercase tracking-wide text-steel-400` | `SectionHeader` variant="label" |
| Navigationsabschnitt | `text-[10px] font-semibold uppercase tracking-widest text-steel-400` | Sidebar `NavSection` |
| Body / Interface     | `text-sm`                          | Buttons, Inputs, Listentexte        |
| Metainfo             | `text-xs`                          | Badge, Hinweistexte                 |
| Pill / Status        | `text-[11px]`                      | `Pill`-Komponente                   |

> **Regel:** Für Sekundärtext wird **ausschließlich `text-steel-*`** verwendet. `text-slate-*`-Klassen sind nicht erlaubt (siehe Inkonsistenz #1).

### 2.2 Schriftgewichte

| Gewicht         | Klasse          | Verwendung                          |
|-----------------|-----------------|-------------------------------------|
| Regular         | `font-normal`   | Fließtext (selten im UI)            |
| Medium          | `font-medium`   | Navigation, Menüeinträge, Labels    |
| Semibold        | `font-semibold` | Überschriften, Card-Titel, Buttons  |
| Bold            | `font-bold`     | Abschnittslabels, EmptyState-Titel  |
| Extrabold / uppercase | `font-bold uppercase tracking-wide` | Label-Varianten, Pill |

---

## 3. Spacing & Layout

### 3.1 Abstände

Das Spacing-System basiert auf dem Tailwind-Standard (4px-Raster). Häufig verwendete Werte:

| Klasse | px   | Typischer Einsatz                        |
|--------|------|------------------------------------------|
| `gap-1` | 4px | Icon + Text im Button, Nav-Items intern |
| `gap-2` | 8px | Pill-Reihen, kleine Gruppen              |
| `gap-3` | 12px| Card-Inhaltsabstände                    |
| `gap-4` | 16px| Row-Spaltenabstände                     |
| `gap-6` | 24px| Seiten-Abschnitte (Page-Layout)         |
| `p-4`  | 16px | Sidebar-Innenabstand, TopBar            |
| `p-5`  | 20px | Modal-Body, Card-Innenabstand           |
| `p-8`  | 32px | EmptyState-Innenabstand                 |

### 3.2 Layout-Struktur

```
┌─────────────────────────────────────────┐
│  TopBar (h-16, border-b, bg-white)      │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Content Area                │
│ w-64     │  flex flex-col gap-6        │
│ steel-   │  overflow-y-auto            │
│ 700→800  │                             │
│ (hidden  │                             │
│  <md)    │                             │
└──────────┴──────────────────────────────┘
```

- Content Area: `flex flex-col gap-6` mit `h-full min-h-0 w-full min-w-0`
- Seitenheader (`<header>`): immer mit `<h1>` + optionalem Untertitel (`<p class="text-sm text-steel-500">`)
- Responsive Breakpoint: `md:` für Sidebar-Einblendung und TopBar-Umschaltung

---

## 4. Interaktive Komponenten

### 4.1 Button

**Datei:** `src/components/ui/Button.tsx`

| Variant     | Aussehen                                              | Verwendung                    |
|-------------|-------------------------------------------------------|-------------------------------|
| `primary`   | `bg-steel-700 text-white hover:bg-steel-600`          | Primäre CTA-Aktion            |
| `secondary` | `border border-line bg-white text-ink hover:border-fern` | Standardaktion, Abbrechen  |
| `ghost`     | `text-ink hover:bg-steel-100`                         | Icon-Buttons, Sekundäraktionen |
| `danger`    | `bg-crimson text-white hover:bg-crimson/90`           | Lösch-/Gefahrenaktionen       |

**Größen:** `sm` (h-8 / w-8), `md` (h-10 / w-10)  
**Radius:** `rounded-md`  
**Icon-only:** kein `px`, quadratische Dimension

> **Regel:** Niemals Button-Varianten mit Ad-hoc-`className`-Overrides umgehen (Ausnahme: `EmptyState` first-run – siehe Inkonsistenz #2).

### 4.2 Input / Select

**Dateien:** `Input.tsx`, `Select.tsx`

Beide Felder haben `h-11`, `border border-line`, `bg-white`, `rounded-lg`/`rounded-md`, `text-sm`, Focus-Ring `focus:ring-2 focus:ring-steel-700/10`.

> **⚠ Inkonsistenz:** `Input` verwendet `rounded-lg`, `Select` verwendet `rounded-md`. Ziel: Angleichung auf `rounded-lg`.

**Regel:** Alle Texteingaben stehen immer in einer `FormField`-Wrapper-Komponente (Label + optionaler Hinweis/Fehler).

### 4.3 SearchInput

Visuell abgesetzt vom normalen Input: `bg-steel-100`, kein Rahmen, `h-10`, `rounded-md`, maximal `max-w-[15rem]`.  
Ausschließlich für kontextuelle Suchfelder in Toolbar-Bereichen verwenden.

---

## 5. Label-Komponenten (Badge, Pill)

Das System hat **zwei Klassen** von Inline-Labels. Ihre Abgrenzung muss klar sein:

### 5.1 Badge

**Datei:** `src/components/ui/Badge.tsx`  
Form: `rounded-full`, Rahmen + weicher Hintergrund-Tint, farbiger Text  
Größe: `min-h-6 px-2 text-xs font-semibold`

**Verwendung:**  
- Metadaten-Tags (Parent, geerbte Relation, Custom-Tags)
- `PriorityBadge` (mit `filled=true` → solide Füllfarbe, weißer Text)
- `TicketTypeBadge` (mit `filled=true`)
- `ParentBadge` (ohne `filled`)

**Tones:** `crimson | tangerine | mustard | fern | teal | violet | magenta | steel | mute`

### 5.2 Pill

**Datei:** `src/components/ui/Pill.tsx`  
Form: `rounded-full`, solide Füllfarbe, **immer** weißer Text  
Größe: `px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider`

**Verwendung:**  
- Statusanzeige (via `StatusPill`)
- Kompakte Domainstatus-Indikatoren mit hoher Betonung

**Tones:** `fern | tangerine | violet | crimson | steel | mustard`

> **⚠ Inkonsistenz:** `Badge(filled=true)` und `Pill` sind funktional äquivalent (solide Farbe, weißer Text), aber visuell unterschiedlich (Textgröße, Gewicht, Schreibweise). Langfristig sollte `Badge(filled=true)` durch `Pill` ersetzt oder eine explizite Trennregel festgelegt werden.  
> **Trennregel bis zur Bereinigung:** `Pill` = Status (änderbar, Workflow). `Badge(filled)` = Typ/Kategorie (fest, klassifizierend).

---

## 6. Selektions- und Filter-Komponenten

### 6.1 FilterChips

Horizontale Chip-Reihe für Status-/Kategorie-Filter auf Übersichtsseiten.  
Aktiv: `bg-steel-900 text-white`  
Inaktiv: `border-line bg-white text-slate-700 hover:border-fern`  
Form: `h-10 rounded-md px-3 text-sm font-medium`

### 6.2 TabBar

Horizontale Tab-Navigation innerhalb einer Detail-Seite (unterhalb des Page-Headers).  
Aktiv: `border-b-2 border-steel-700 text-steel-700`  
Inaktiv: `border-transparent text-slate-500 hover:text-ink`  
Höhe: `h-12`, Hintergrund: `bg-white`

### 6.3 SegmentedControl

Kompakter Inline-Selektor für 2–4 gleichwertige Optionen (z. B. Zeiträume, Ansichtstypen).  
Container: `rounded-xl border border-line bg-steel-50 p-1.5`  
Option aktiv: `bg-steel-700 text-white rounded-lg`  
Option inaktiv: `text-slate-500 hover:bg-white rounded-lg h-9 px-3`

### 6.4 ViewToggle

Icon-basierter Umschalter zwischen Liste und Kanban.  
Aktiv: `border-2 border-ink`  
Inaktiv: `border-line`  
Form: `h-8 w-8 rounded-md`

> **⚠ Inkonsistenz:** Die vier Selektions-Komponenten verwenden vier unterschiedliche Paradigmen für den Aktiv-Zustand:
> - FilterChips: gefüllter dunkler Hintergrund (`steel-900`)
> - TabBar: farbiger Unterstrich (`steel-700`)
> - SegmentedControl: gefüllter Mittelton (`steel-700`)
> - ViewToggle: doppelter Rahmen (`border-2 border-ink`)
>
> Solange keine übergreifende Vereinheitlichung stattfindet, gelten diese Stile **pro Komponente als verbindlich** und dürfen nicht vermischt werden.

---

## 7. Karten und Rows

### 7.1 ItemCard (Board/Grid-Ansicht)

**Datei:** `src/components/ui/ItemCard.tsx`  
Radius: `rounded-2xl`  
Rahmen: `border border-line`  
Schatten: `shadow-sm` → `shadow-panel` (Hover)  
Hover-Effekt: `-translate-y-0.5` + Schatten  
Padding: `p-5`  
Optionaler Akzentstreifen: `h-1` oben, volle Breite, `rounded-t-2xl`

### 7.2 ItemRow (Listen-Ansicht)

**Datei:** `src/components/ui/ItemRow.tsx`  
Radius: `rounded-xl`  
Rahmen: `border border-l-[4px] border-line` → linke Seite als farbiger Akzent  
Schatten: `shadow-sm` → `shadow-md` (Hover)  
Padding: `px-4 py-3.5`

> **⚠ Inkonsistenz:** `ItemCard` verwendet `rounded-2xl`, `ItemRow` verwendet `rounded-xl`. Beide sind direkte Darstellungsvarianten desselben Domainobjekts. Angleichung auf `rounded-2xl` wird empfohlen.

---

## 8. Overlay-Komponenten

### 8.1 Modal

**Datei:** `src/components/ui/Modal.tsx`  
Backdrop: `bg-steel-900/55 backdrop-blur-[2px]`  
Container: `rounded-2xl bg-white shadow-modal`  
Header: `px-5 py-4 border-b border-line` mit `text-lg font-semibold text-ink`  
Body: `p-5 overflow-auto`

**Größen:** `md` (max-w-xl), `lg` (max-w-3xl), `xl` (min(1100px, 100vw-32px)), `full`

### 8.2 Dropdowns / Menüs

Einheitliches Muster für ActionMenu, StatusPill-Dropdown:  
`rounded-lg border border-line bg-white shadow-panel`  
Items: `px-3 py-2 text-sm font-medium hover:bg-steel-50`  
Gefahr-Item: `text-crimson hover:bg-crimson/5`

### 8.3 ConfirmDialog

Über `ConfirmDialogProvider` und `useConfirm()` aufrufen.  
Niemals native `window.confirm()` verwenden.

---

## 9. Zustandsdarstellungen

### 9.1 EmptyState

**Datei:** `src/components/ui/EmptyState.tsx`

| Variant      | Einsatz                                             |
|--------------|-----------------------------------------------------|
| `default`    | Leere gefilterte Liste, kein Inhalt gefunden        |
| `tinted`     | Leere Unterliste in einem Detail-Kontext            |
| `first-run`  | Erstes Anlegen (noch kein einziger Eintrag)         |

Icon-Container: `rounded-2xl`  
Buttons in `first-run`: Ausnahme-Styling (Weiß auf dunklem Hintergrund), kein `variant="primary"`.

### 9.2 Skeleton

Klasse `skeleton-shimmer` (CSS-Animation in `styles.css`).  
Verwenden für: Listen, Cards und Felder im Ladezustand.  
Niemals Spinner für komplette Seiteninhalte verwenden.

### 9.3 Fehlermeldung (inline)

Muster aus den Seiten-Komponenten:
```tsx
<div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
  {errorText}
</div>
```
Gilt als Standard-Inline-Fehler auf Page-Ebene.

### 9.4 Toast

Über `useToast()` aus `ToastProvider` aufrufen.  
Tones: `success` (fern), `error` (crimson), `info` (steel).

---

## 10. Formular-Konventionen

- Jedes Eingabefeld wird in `<FormField label="...">` gewrappt.
- Labels über `<Label>` (aus `Label.tsx`), nie als rohes `<label>`-Element.
- Fehlertext über `error`-Prop von `FormField`.
- Pflichtfelder über `required`-Prop markieren.
- Modals mit Formularen: `<FormModal>` verwenden (beinhaltet Footer mit Aktionen).

---

## 11. Bekannte Inkonsistenzen (priorisiert)

Die folgende Liste ist Grundlage für Refactoring-Aufgaben. Jeder Eintrag beschreibt den Ist-Zustand, den Soll-Zustand und die betroffenen Dateien.

---

### ❶ `text-slate-*` statt Design-Tokens (Priorität: Hoch)

**Problem:** Sekundärtext verwendet häufig `text-slate-400/500/600/700` — eine Raw-Tailwind-Farbe, die nicht im Token-System (`theme.css`) definiert ist. Das Farbsystem wird dadurch unterlaufen: Designänderungen an Steel wirken sich nicht auf Slate aus.

**Betroffene Dateien (Auswahl):** `SearchInput.tsx`, `ItemRow.tsx`, `SectionHeader.tsx`, `Sidebar.tsx`, `TabBar.tsx`, `FilterChips.tsx`, `SegmentedControl.tsx`

**Soll:** Alle `text-slate-*`-Klassen durch äquivalente `text-steel-*`-Klassen ersetzen:
- `slate-400` → `steel-400`
- `slate-500` → `steel-400` oder `steel-500` (je nach Kontext)
- `slate-600` → `steel-600`
- `slate-700` → `steel-700`

---

### ❷ Button-Overrides in `EmptyState` first-run (Priorität: Mittel)

**Problem:** Im `first-run`-Variant von `EmptyState` werden Button-Klassen direkt per `className`-Override gesetzt, statt das Variant-System zu nutzen. Das ist fragil und schwer wartbar.

**Betroffene Datei:** `EmptyState.tsx`

**Soll:** Einen neuen Button-Variant `"inverted"` einführen (weißer Hintergrund / Steel-Text auf dunklem Elternelement) und diesen in EmptyState verwenden.

---

### ❸ Input `rounded-lg` vs. Select `rounded-md` (Priorität: Mittel)

**Problem:** `Input` und `Select` sind visuell gleichwertige Eingabeelemente, verwenden aber unterschiedliche Radii.

**Betroffene Dateien:** `Input.tsx`, `Select.tsx`

**Soll:** Beide auf `rounded-lg` vereinheitlichen.

---

### ❹ ItemCard `rounded-2xl` vs. ItemRow `rounded-xl` (Priorität: Niedrig)

**Problem:** Card- und Row-Variante desselben Domainobjekts haben unterschiedliche Border-Radii.

**Betroffene Dateien:** `ItemCard.tsx`, `ItemRow.tsx`

**Soll:** Beide auf `rounded-2xl` vereinheitlichen.

---

### ❺ `Badge(filled=true)` und `Pill` – Dopplung (Priorität: Niedrig)

**Problem:** `Badge` mit `filled=true` und `Pill` produzieren beide ein gefülltes Label mit weißem Text, jedoch mit unterschiedlicher Typografie:
- `Badge(filled)`: `text-xs font-semibold`, keine Großschreibung
- `Pill`: `text-[11px] font-bold uppercase tracking-wider`

**Betroffene Dateien:** `Badge.tsx`, `Pill.tsx`, `PriorityBadge.tsx`, `TicketTypeBadge.tsx`

**Soll:** Semantische Trennregel formalisieren (Status = `Pill`, Typ/Kategorie = `Badge(filled)`) oder eine gemeinsame Basis-Komponente extrahieren.

---

### ❻ Sidebar NavLink – dreifache Code-Duplizierung (Priorität: Niedrig)

**Problem:** Das Aktiv/Inaktiv-Klassenset für `NavLink` im Sidebar wird identisch dreimal wiederholt (Navigation, Einstellungen, Administration).

**Betroffene Datei:** `Sidebar.tsx`

**Soll:** Eine lokale Hilfsfunktion `navLinkClass(isActive: boolean): string` extrahieren.

---

### ❼ Fehlende `PageHeader`-Komponente (Priorität: Niedrig)

**Problem:** Alle Übersichtsseiten (`ProjectsPage`, `TicketsPage` etc.) duplizieren denselben `<header>`-Block mit `h1 + p` manuell.

**Soll:** Eine `PageHeader`-Komponente mit `title`-, `subtitle`- und `actions`-Slot erstellen und auf allen Seiten einsetzen.

---

## 12. Verbotene Muster

| Verboten | Begründung | Alternative |
|----------|------------|-------------|
| `text-slate-*` | Nicht im Token-System | `text-steel-*` |
| `window.confirm()` | Kein Design-System-Kontext | `useConfirm()` |
| Inline `style={{ color: '...' }}` für Struktur-Styling | Schwer überschreibbar | Tailwind-Klassen / Token |
| `className`-Override auf `Button` für Farben | Umgeht Variant-System | Neuen Variant definieren |
| Raw `<label>` ohne `<Label>` | Kein einheitliches Styling | `<Label>` / `<FormField>` |
| `border-gray-*`, `bg-gray-*` | Nicht im Token-System | `border-line`, `bg-shell`, `bg-steel-*` |
