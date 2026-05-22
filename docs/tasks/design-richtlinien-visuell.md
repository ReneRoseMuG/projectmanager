# Visuelle Design-Richtlinien – Projekt Manager

> Version 1.1 · Mai 2026  
> Verbindliche Grundlage für das gesamte Frontend (`apps/web`).  
> Codex liest dieses Dokument, macht eine Bestandsaufnahme der Codebase gegen diese Regeln und setzt Abweichungen eigenständig um.

---

## 1. Design-Philosophie

Der Projekt Manager ist ein **datenintensives Desktop-Business-Tool**. Die visuelle Sprache folgt daraus:

- **Struktur vor Dekoration.** Formen, Farben und Abstände transportieren Bedeutung — nicht Stimmung.
- **Ruhige Oberfläche, klare Hierarchie.** Wenig visuelle Konkurrenz. Der Inhalt steht im Vordergrund.
- **Konsistenz schlägt Originalität.** Gleichartige Elemente sehen überall gleich aus.

---

## 2. Farben

### 2.1 Token-Pflicht

Alle Farbwerte kommen ausschließlich aus `src/styles/theme.css` über die definierten Tailwind-Aliases. **Raw-Tailwind-Farben wie `slate-*`, `gray-*`, `blue-*` sind verboten.**

Einzige Ausnahme: `white` (= `var(--color-white)`) und explizit im Token-System referenzierte Werte.

### 2.2 Semantische Zuordnung

| Verwendung | Token |
|---|---|
| Primärer Text | `text-ink` |
| Sekundärer / Hilfstext | `text-steel-400` bis `text-steel-600` je nach Betonung |
| Deaktiviert / Placeholder | `text-steel-400` |
| Hintergrund Seite | `bg-shell` |
| Hintergrund Karten / Eingaben | `bg-white` |
| Rahmen / Trennlinien | `border-line` |
| Primäre Interaktionsfarbe | `steel-700` |
| Fehler / Gefahr | `crimson` |
| Erfolg / Aktiv | `fern` |
| Warnung | `tangerine` |
| Hinweis / Info | `teal` |

### 2.3 Akzentfarben

Werden ausschließlich für **semantische Zustände** eingesetzt (Status, Priorität, Typ, Kategorie). Niemals für allgemeine Layoutgestaltung oder Dekoration.

---

## 3. Typografie

**Schrift:** Inter. Immer über die Tailwind-`font-sans`-Klasse.

### 3.1 Größenhierarchie

| Ebene | Klassen | Einsatz |
|---|---|---|
| Seitenüberschrift | `text-2xl font-semibold text-ink` | `<h1>` auf Übersichtsseiten |
| Detail-Header | `text-2xl md:text-3xl font-bold text-white` | FormModal / DetailModal Header |
| Modale Überschrift | `text-lg font-semibold text-ink` | Standard-Modal-Header |
| Abschnittstitel (Standard) | `text-sm font-semibold text-ink` | SectionHeader |
| Abschnittstitel (Label) | `text-sm font-bold uppercase tracking-wide text-steel-400` | SectionHeader variant="label" |
| Interface-Text | `text-sm` | Buttons, Inputs, Listeneinträge |
| Metainfo | `text-xs` | Badge-Inhalt, Datum, Hinweise |

### 3.2 Regeln

- **Uppercase + tracking** nur in Label-Positionen (Navigationsabschnitte, Label-Varianten). Niemals in Fließtext, Titeln oder Buttons.
- **`font-bold`** nur für Überschriften und EmptyState-Titel. Buttons und Labels verwenden `font-semibold` oder `font-medium`.
- Keine Texte kleiner als `text-xs` außer in explizit definierten Ausnahmen (Navigations-Sections: `text-[10px]`).

---

## 4. Abstände

Spacing folgt dem Tailwind-4px-Raster. Keine beliebigen `px-`/`py-`-Werte außerhalb der Tailwind-Skala.

**Häufige Werte:**

| Ebene | Klasse |
|---|---|
| Innenabstand Karte / Modal-Body | `p-5` |
| Innenabstand kompakter Container | `p-4` |
| Innenabstand EmptyState | `p-8` |
| Abstand zwischen Seiten-Abschnitten | `gap-6` |
| Abstand innerhalb Abschnitte | `gap-4` |
| Abstand zwischen kompakten Elementen | `gap-2` |

---

## 5. Border-Radius-System

Dies ist die zentrale gestalterische Regel. Die Anwendung folgt einem **einheitlichen Vokabular mit wenigen Stufen**.

### 5.1 Erlaubte Radii und ihre Verwendung

| Radius | Tailwind-Klasse | Verwendung |
|---|---|---|
| 0 | — | Seitenstruktur: TopBar, Sidebar, Seiten-Chrome |
| 4 px | `rounded` | Winzige UI-Elemente: Count-Badges in Tabs |
| 6 px | `rounded-md` | Schaltflächen (Button), Eingabefelder (Input, Select), Inline-Labels (Badge, Pill), FilterChips, SearchInput |
| 8 px | `rounded-lg` | Karten (ItemCard), List-Rows (ItemRow), Modals, Dialoge, Dropdowns / Menüs, Section-Container, EmptyState |
| 12 px | `rounded-xl` | Großer Hintergrund-Container (SegmentedControl-Wrapper), Dekorationselemente im Detail-Header |
| 9999 px | `rounded-full` | Nur: Avatar (Benutzerbild), ProgressBar-Leiste und -Füllung, Dekorations-Blob im Detail-Header-Hintergrund |

### 5.2 Verbotene Verwendungen

- `rounded-2xl` und `rounded-3xl` sind **nicht erlaubt**. Keine Ausnahmen.
- `rounded-full` für Labels (Badge, Pill), Karten, Rows, Modals oder Schaltflächen ist **verboten**.
- `rounded-full` für Icon-Only-Schaltflächen auf **weißem Hintergrund** ist verboten — `rounded-md` verwenden. Ausnahme: Icon-Buttons innerhalb des steel-farbigen Detail-Headers (dort: `rounded-full` als kontextuelles Gegenstück zur hellen Fläche erlaubt).

### 5.3 Begründung

Das Seitenlayout (TopBar, Sidebar) hat keinerlei Rundungen. Labels und Karten mit `rounded-full` bzw. `rounded-2xl` bilden dazu keinen kohärenten Kontrast — sie wirken wie Fremdkörper. Das Radius-Vokabular bleibt flach und sachlich, analog zur Struktur der Anwendung.

---

## 6. Schatten

Schatten signalisieren Ebene und Interaktivität. Sie werden sparsam eingesetzt.

| Token | Verwendung |
|---|---|
| `shadow-sm` | Standardzustand von Karten und Rows (ruhig, kaum sichtbar) |
| `shadow-panel` | Hover-Zustand von Karten, Dropdowns, Menüs, Section-Container |
| `shadow-modal` | Modals und Dialoge |
| `shadow-steel` | EmptyState first-run, Sonder-Hervorhebungen |
| `shadow-card` | Alternative für leichte Card-Schatten |

Kein `shadow-lg`, `shadow-xl` oder andere raw-Tailwind-Schatten. Nur Token verwenden.

---

## 7. Seitenlayout

### 7.1 Grundstruktur

```
TopBar (h-16, bg-white, border-b border-line)
├── Sidebar (w-64, bg-gradient steel-700→steel-800, hidden <md)
└── Content Area (flex-1, overflow-y-auto, bg-shell)
    ├── <header> mit <h1> + optionalem Untertitel
    └── Inhalt mit gap-6 zwischen Abschnitten
```

### 7.2 Regeln

- Content Area: immer `flex flex-col gap-6 h-full min-h-0 w-full min-w-0`.
- Seitenheader (`<header>`): `<h1 class="text-2xl font-semibold text-ink">` + optional `<p class="text-sm text-steel-500">` für Untertitel / Zähler.
- Kein eigenes Layout außerhalb dieser Struktur ohne explizite Begründung.

---

## 8. Komponenten-Regeln

### 8.1 Button

Vier Varianten: `primary`, `secondary`, `ghost`, `danger`. Keine anderen.  
Zwei Größen: `md` (h-10), `sm` (h-8).  
Radius: `rounded-md`.  
Schrift: `text-sm font-medium`.

**Verboten:** Button-Klassen mit Ad-hoc-`className`-Overrides für Farben umgehen. Stattdessen einen neuen Variant definieren.

### 8.2 Input / Select

Beide: `h-11`, `border border-line`, `bg-white`, `rounded-md`, `text-sm`.  
Focus: `focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10`.  
Immer in `<FormField>` gewrappt (Label + Fehler/Hinweis).

### 8.3 Badge

Rechteckiges Inline-Label für Metadaten, Typen, Kategorien, Relationen.  
Form: `rounded-md border px-2 text-xs font-semibold`.  
Farbe: über `tone`-Prop oder `color`-Prop (Katalogfarbe).  
Zwei Modi: standard (Rahmen + Tint + farbiger Text), `filled` (solide Füllfarbe + weißer Text).

### 8.4 Pill

Hochbetontes Inline-Label für **Statuswerte** (änderbar, Workflow-orientiert).  
Form: `rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide`.  
Farbe: immer solide Füllfarbe + weißer Text.  
Ausschließlich für Status verwenden — nicht für Typen oder Kategorien.

> **Trennregel Badge vs. Pill:** `Pill` = Workflow-Status (änderbar). `Badge(filled)` = Klassifikation (fest, typ-beschreibend). Nicht mischen.

### 8.5 FilterChips

Horizontale Chip-Reihe für Status-/Kategorie-Filter.  
Form: `h-10 rounded-md border px-3 text-sm font-medium`.  
Aktiv: `bg-steel-900 text-white border-ink`.  
Inaktiv: `border-line bg-white text-steel-600 hover:border-fern`.

### 8.6 TabBar

Horizontale Tab-Navigation, stets unterhalb des Detail-Headers.  
Form: `h-12 border-b-2 px-3 text-sm font-semibold`.  
Aktiv: `border-steel-700 text-steel-700`.  
Inaktiv: `border-transparent text-steel-500 hover:text-ink`.  
Count-Badge: `rounded px-2 py-0.5 text-xs` (kein `rounded-full`).

### 8.7 SegmentedControl

Kompakter Inline-Selektor für 2–4 Optionen.  
Container: `rounded-xl border border-line bg-steel-50 p-1.5`.  
Option: `h-9 rounded-md px-3 text-xs font-bold uppercase tracking-wide`.  
Aktiv: `bg-steel-700 text-white`.  
Inaktiv: `text-steel-500 hover:bg-white`.

### 8.8 ViewToggle

Icon-basierter Umschalter.  
Form: `h-8 w-8 rounded-md border`.  
Aktiv: `bg-steel-700 text-white border-steel-700` (gefülltes Styling — kein `border-2`).  
Inaktiv: `border-line text-steel-700 hover:border-steel-400`.

### 8.9 ItemCard (Board/Grid)

Container: `rounded-lg border border-line bg-white p-5 shadow-sm hover:shadow-panel hover:-translate-y-0.5`.  
Optionaler Akzentstreifen: `h-1 rounded-t-lg` oben (Farbe aus Domain-Daten).  
Kein `rounded-2xl`.

### 8.10 ItemRow (Liste)

Container: `rounded-lg border border-l-[4px] border-line bg-white px-4 py-3.5 shadow-sm hover:shadow-panel`.  
Linker farbiger Akzentrand als Status-Signal (ersetzt Pill in der Listenansicht).  
Kein `rounded-xl`.

### 8.11 Modal

Container: `rounded-lg bg-white shadow-modal`.  
Backdrop: `bg-steel-900/55 backdrop-blur-[2px]`.  
Header: `px-5 py-4 border-b border-line` mit `text-lg font-semibold text-ink`.  
Body: `p-5 overflow-auto`.  
Kein `rounded-2xl`.

### 8.12 ConfirmDialog

Wie Modal, aber `role="alertdialog"`.  
Container: `rounded-lg`.  
Icon-Container im Header: `rounded-md` (kein `rounded-xl`).

### 8.13 FormModal / DetailModal (Detail-Header)

Der Detail-Header (steel-Gradient) ist eine Sonderzone. Hier gelten eigene Regeln:  
- Schließen/Öffnen-Buttons: `rounded-full` ist hier erlaubt (kontextuell, auf farbigem Hintergrund).
- Dekorations-Blob: `rounded-full` ist erlaubt (rein dekorativ, kein funktionales Element).
- Icon-Container im Header: `rounded-xl` (als Kontrapunkt zur Hintergrundfläche).  
- Subtitle-Badge im Detail-Header: `rounded-md border border-white/15 bg-white/10`.

### 8.14 Section

Nicht-fill-Variante: `rounded-lg border border-line bg-white p-4 shadow-panel`.  
Kein `rounded-xl`.

### 8.15 EmptyState

Alle Varianten: Section-Container `rounded-lg`.  
Icon-Container: `rounded-lg` (kein `rounded-2xl`).  
`first-run`-Variante: Buttons über `variant="inverted"` (noch zu definieren) — kein Ad-hoc-`className`-Override.

### 8.16 ActionMenu / Dropdown

Menü-Container: `rounded-lg border border-line bg-white shadow-panel`.  
Menu-Items: `px-3 py-2 text-sm font-medium hover:bg-steel-50`.  
Gefahr-Item: `text-crimson hover:bg-crimson/5`.

### 8.17 Avatar

Bleibt `rounded-full` — Kreisform ist semantisch für Benutzer-Avatare.

### 8.18 ProgressBar

Track und Füllung bleiben `rounded-full` — bar-typische Rundung an den Enden.

### 8.19 SearchInput

Form: `h-10 rounded-md bg-steel-100 px-3` (kein Rahmen, kein `bg-white`).  
Nur in Toolbar-Kontexten. Kein Einsatz als reguläres Formularfeld.

---

## 9. Navigations-Sidebar

Hintergrund: `bg-gradient-to-b from-steel-700 to-steel-800`.  
NavLinks: `h-10 rounded-lg px-3 text-sm font-medium`.  
Aktiv: `bg-white text-steel-700 font-semibold shadow-md`.  
Inaktiv: `text-white/75 hover:bg-white/5 hover:text-white`.  
Abschnittsüberschriften: `text-[10px] font-semibold uppercase tracking-widest text-steel-400`.

---

## 10. Interaktions-Zustände

### 10.1 Hover

- Karten: `-translate-y-0.5 shadow-panel` (leichtes Anheben).
- Rows: `border-steel-300 shadow-md` (Rahmen-Betonung).
- Buttons: Helligkeits- oder Farbwert-Verschiebung gemäß Variant.
- Nav-Items: `hover:bg-white/5 hover:text-white` (Sidebar) / `hover:text-ink` (TabBar).

### 10.2 Focus

Alle interaktiven Elemente: `focus:outline-none focus:ring-2 focus:ring-steel-700/10`.  
Kein `outline` ohne Ring-Ersatz.

### 10.3 Disabled

Immer: `disabled:opacity-50 disabled:cursor-not-allowed`.

### 10.4 Aktiv-Zustand (Selektoren)

| Komponente | Aktiv-Signal |
|---|---|
| FilterChips | Gefüllter dunkler Hintergrund (`bg-steel-900 text-white`) |
| TabBar | Farbiger Unterstrich (`border-b-2 border-steel-700`) |
| SegmentedControl | Gefüllter Mittelton (`bg-steel-700 text-white`) |
| ViewToggle | Gefüllter Hintergrund (`bg-steel-700 text-white`) |
| Sidebar NavLink | Weißer Hintergrund auf dark (`bg-white text-steel-700`) |

Jede Selektor-Komponente verwendet **ein** Aktiv-Signal konsistent. Kein Mischen (z.B. kein Unterstrich + Füllung gleichzeitig).

---

## 11. Verbotene Muster

| Verboten | Begründung | Ersatz |
|---|---|---|
| `text-slate-*`, `text-gray-*` | Außerhalb des Token-Systems | `text-steel-*` |
| `bg-slate-*`, `bg-gray-*` | Außerhalb des Token-Systems | `bg-steel-*`, `bg-shell` |
| `border-gray-*` | Außerhalb des Token-Systems | `border-line`, `border-steel-*` |
| `rounded-2xl`, `rounded-3xl` | Zu extrem für dieses Interface | `rounded-lg` |
| `rounded-full` auf Badge, Pill, Button, Card, Row, Modal | Nicht kohärent mit Seitenlayout | `rounded-md` (Label), `rounded-lg` (Container) |
| `shadow-lg`, `shadow-xl` | Nicht im Token-System | Token-Schatten verwenden |
| `window.confirm()` | Kein Design-Kontext | `useConfirm()` |
| Raw `<label>` ohne `<Label>`-Komponente | Inkonsistentes Styling | `<FormField>` + `<Label>` |
| Button-Farb-Override via `className` | Umgeht Variant-System | Neuen Variant definieren |
| Inline `style={{ color }}` für strukturelles Styling | Nicht überschreibbar | Tailwind-Klassen / Token |
| `border-2` als Aktiv-Signal (ViewToggle) | Inkonsistent mit anderen Selektoren | Gefüllter Hintergrund |

---

## 12. Ausnahmen (explizit erlaubt)

Diese Muster weichen vom Standardvokabular ab und sind bewusst so:

| Element | Abweichung | Begründung |
|---|---|---|
| `Avatar` | `rounded-full` | Kreisform ist semantisch für Benutzeravatare |
| `ProgressBar` | `rounded-full` | Bar-typische Endkappen |
| Schließen-Button im steel-Header | `rounded-full` | Kontextuell auf farbigem Hintergrund, kein weißer Kontrast |
| Dekorations-Blob im Detail-Header | `rounded-full` | Rein dekorativ, kein funktionales Element |
| `ApiBadge` im TopBar | `rounded-full` | Isoliertes Status-Pill, kein Label in einer Gruppe |
| Sidebar-Logo-Badge | `rounded-md` auf `bg-gradient` | Marken-Element, intentional |

---

## 13. Bekannte Abweichungen im Ist-Zustand (priorisiert)

Codex liest diesen Abschnitt, sucht die genannten Muster in der Codebase und korrigiert sie gemäß den Regeln in den Abschnitten 2–12.

---

### ❶ `text-slate-*` statt Design-Tokens — Priorität: Hoch

**Problem:** Sekundärtext verwendet in vielen Komponenten `text-slate-400/500/600/700` — eine Raw-Tailwind-Farbe außerhalb des Token-Systems. Designänderungen am Steel-System wirken sich nicht auf Slate-Klassen aus.

**Ersatzregel:**
- `slate-400` → `steel-400`
- `slate-500` → `steel-500`
- `slate-600` → `steel-600`
- `slate-700` → `steel-700`

**Typische Fundstellen:** Sekundärtext in Karten, Rows, Modals, Sidebar, TabBar, SegmentedControl, FilterChips, PlanningItemCard.

---

### ❷ `rounded-full` auf Labels und Karten — Priorität: Hoch

**Problem:** Badge, Pill und ItemCard verwenden `rounded-full` bzw. `rounded-2xl`. Das widerspricht dem Radius-System (Abschnitt 5).

**Ersatzregel:**
- Badge, Pill, FilterChips: `rounded-full` → `rounded-md`
- ItemCard: `rounded-2xl` → `rounded-lg`, Akzentstreifen: `rounded-t-2xl` → `rounded-t-lg`
- ItemRow: `rounded-xl` → `rounded-lg`
- ConfirmDialog Icon-Container: `rounded-xl` → `rounded-md`
- Section (nicht-fill): `rounded-xl` → `rounded-lg`
- EmptyState Icon-Container: `rounded-2xl` → `rounded-lg`
- Modal / ConfirmDialog Container: `rounded-2xl` → `rounded-lg`

---

### ❸ Input `rounded-lg` vs. Select `rounded-md` — Priorität: Mittel

**Problem:** `Input` und `Select` sind visuell gleichwertige Eingabeelemente mit unterschiedlichem Radius.

**Ersatzregel:** Beide auf `rounded-md` vereinheitlichen (gemäß Abschnitt 8.2).

---

### ❹ Button-Overrides in `EmptyState` first-run — Priorität: Mittel

**Problem:** Im `first-run`-Variant von `EmptyState` werden Button-Farben direkt per `className`-Override gesetzt statt über das Variant-System.

**Ersatzregel:** Neuen Button-Variant `"inverted"` definieren (weiße Füllung, steel-Text — für Einsatz auf dunklem Hintergrund) und in `EmptyState` verwenden.

---

### ❺ ViewToggle Aktiv-Zustand `border-2` — Priorität: Mittel

**Problem:** ViewToggle signalisiert den aktiven Zustand über `border-2 border-ink` statt über gefüllten Hintergrund wie alle anderen Selektoren.

**Ersatzregel:** Aktiv: `bg-steel-700 text-white border-steel-700` (gemäß Abschnitt 8.8).

---

### ❻ Sidebar NavLink — Code-Duplizierung — Priorität: Niedrig

**Problem:** Das Aktiv/Inaktiv-Klassenset für NavLinks in der Sidebar wird dreimal identisch wiederholt (Navigation, Einstellungen, Administration).

**Ersatzregel:** Lokale Hilfsfunktion `navLinkClass(isActive: boolean): string` extrahieren.

---

### ❼ Fehlende `PageHeader`-Komponente — Priorität: Niedrig

**Problem:** Alle Übersichtsseiten duplizieren denselben `<header>`-Block mit `h1` + `p` manuell.

**Ersatzregel:** Neue Komponente `PageHeader` mit Props `title`, `subtitle` und `actions` erstellen und auf allen Übersichtsseiten einsetzen.
