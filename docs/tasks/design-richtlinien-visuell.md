# Visuelle Design-Richtlinien – Projekt Manager

> Version 1.2 · Mai 2026  
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
| Untertitel / Metazeile | `text-steel-500` |
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

### 2.4 Inline-Styles

Inline-Styles sind nur in folgenden Kategorien erlaubt:

- **Datengetriebene Katalogfarben:** Badge, Pill, FilterChips, ItemCard, StatusPill, TagManager, CatalogManager — wenn die Farbe aus einem Datensatz stammt und kein Token existiert.
- **Technische Layoutwerte:** DnD-Transforms, Grid-Order, Baum-Einrückung.
- **Laufzeitwerte:** ProgressBar-Breite, Toast-Dauer, Animationsparameter.

Inline-Styles für strukturelle Design-Entscheidungen (Hintergrundfarben, Textfarben ohne Datenbezug) sind verboten. Diese gehören in Tokens und Tailwind-Klassen.

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
- Arbitrary Textgrößen (`text-[...]`) sind begründungspflichtig. Neue Werte nur wenn die Hierarchie aus 3.1 nicht ausreicht.

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
| 9999 px | `rounded-full` | Nur: Avatar, ProgressBar, Farbswatches, kleine Statuspunkte, Dekorations-Elemente im Detail-Header |

### 5.2 Verbotene Verwendungen

- `rounded-2xl` und `rounded-3xl` sind **nicht erlaubt**. Keine Ausnahmen.
- `rounded-full` für Labels (Badge, Pill), Karten, Rows, Modals oder Schaltflächen ist **verboten**.
- `rounded-full` für Icon-Only-Schaltflächen auf **weißem Hintergrund** ist verboten — `rounded-md` verwenden. Ausnahme: Icon-Buttons innerhalb des steel-farbigen Detail-Headers.

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
| `shadow-steel-icon` | Icon-Avatare im Detail-Header, Logo-Badge in der Sidebar |

Kein `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl` oder andere raw-Tailwind-Schatten. Ausschließlich Token verwenden.

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
Linker farbiger Akzentrand als Status-Signal.  
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
- Schließen/Öffnen-Buttons: `rounded-full` erlaubt (auf farbigem Hintergrund).
- Dekorations-Blob: `rounded-full` erlaubt (rein dekorativ).
- Icon-Container im Header: `rounded-xl`.
- Subtitle-Badge: `rounded-md border border-white/15 bg-white/10`.

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
Der Wrapper `<label>` ist hier als semantischer Wrapper erlaubt — nicht als Formularfeld-Label.

---

## 9. Navigations-Sidebar

Hintergrund: `bg-gradient-to-b from-steel-700 to-steel-800`.  
NavLinks: `h-10 rounded-lg px-3 text-sm font-medium`.  
Aktiv: `bg-white text-steel-700 font-semibold shadow-panel`.  
Inaktiv: `text-white/75 hover:bg-white/5 hover:text-white`.  
Abschnittsüberschriften: `text-[10px] font-semibold uppercase tracking-widest text-steel-400`.

---

## 10. Interaktions-Zustände

### 10.1 Hover

- Karten: `-translate-y-0.5 shadow-panel` (leichtes Anheben).
- Rows: `border-steel-300 shadow-panel` (Rahmen-Betonung).
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

Jede Selektor-Komponente verwendet **ein** Aktiv-Signal konsistent.

---

## 11. Verbotene Muster

| Verboten | Begründung | Ersatz |
|---|---|---|
| `text-slate-*`, `text-gray-*` | Außerhalb des Token-Systems | `text-steel-*` |
| `bg-slate-*`, `bg-gray-*` | Außerhalb des Token-Systems | `bg-steel-*`, `bg-shell` |
| `border-gray-*` | Außerhalb des Token-Systems | `border-line`, `border-steel-*` |
| `text-muted` | Nicht im Token-System definiert — Tailwind erzeugt die Klasse nicht | `text-steel-500` |
| `rounded-2xl`, `rounded-3xl` | Zu extrem für dieses Interface | `rounded-lg` |
| `rounded-full` auf Badge, Pill, Button, Card, Row, Modal | Nicht kohärent mit Seitenlayout | `rounded-md` (Label), `rounded-lg` (Container) |
| `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl` | Nicht im Token-System | Token-Schatten verwenden |
| `window.confirm()` | Kein Design-Kontext | `useConfirm()` |
| Raw `<label>` für Formularfelder | Inkonsistentes Styling | `<FormField>` + `<Label>` |
| Button-Farb-Override via `className` | Umgeht Variant-System | Neuen Variant definieren |
| Inline `style={{ color }}` für strukturelles Styling | Nicht überschreibbar | Tailwind-Klassen / Token |
| `border-2` als Aktiv-Signal | Inkonsistent mit anderen Selektoren | Gefüllter Hintergrund |

---

## 12. Ausnahmen (explizit erlaubt)

| Element | Abweichung | Begründung |
|---|---|---|
| `Avatar` | `rounded-full` | Kreisform ist semantisch für Benutzeravatare |
| `ProgressBar` | `rounded-full` | Bar-typische Endkappen |
| Farbswatches (TagManager, CatalogManager, ColorPicker) | `rounded-full` + Inline-Style | Echte Farbauswahlobjekte — nicht auf andere Elemente übertragen |
| Kleine Statuspunkte (Sidebar, ListBoardView) | `rounded-full` | Punktindikator, kein Label |
| Schließen-Button im steel-Header | `rounded-full` | Auf farbigem Hintergrund, kein weißer Kontrast |
| Dekorations-Blob im Detail-Header | `rounded-full` | Rein dekorativ |
| `ApiBadge` im TopBar | `rounded-full` | Isoliertes Status-Signal, kein Label in einer Gruppe |
| Sidebar Logo-Badge | `shadow-steel-icon` | Marken-Element, intentional |
| SearchInput `<label>`-Wrapper | rohes `<label>` | Semantischer Wrapper, kein Formularfeld-Label |
| FullCalendar, TLDraw, ProseMirror | eigene Klassen und `!important` | Drittanbieter-Overrides, soweit technisch nötig |
| Inline-Styles für Katalogfarben, DnD, ProgressBar, Toast | Inline-Style | Datengetrieben oder technisch notwendig (siehe Abschnitt 2.4) |

---

## 13. Bekannte Abweichungen im Ist-Zustand (priorisiert)

### ❶ `text-slate-*` — Priorität: Hoch
186 Vorkommen. Alle durch `text-steel-*` ersetzen.

### ❷ `text-muted` — Priorität: Hoch
15 Vorkommen. Nicht im Token-System — Tailwind erzeugt die Klasse nicht. Pro Stelle entscheiden: `text-steel-500` oder Element entfernen.

### ❸ `rounded-2xl` und `rounded-t-2xl` — Priorität: Hoch
12 Vorkommen. Alle durch `rounded-lg` bzw. `rounded-t-lg` ersetzen.

### ❹ Badge / Pill `rounded-full` — Priorität: Hoch
Alle durch `rounded-md` ersetzen. TabBar Count-Badge durch `rounded`.

### ❺ Input `rounded-lg` — Priorität: Mittel
Auf `rounded-md` angleichen (wie Select).

### ❻ Raw Schatten-Klassen — Priorität: Mittel
`shadow`, `shadow-md`, `shadow-lg` durch Token-Schatten ersetzen.

### ❼ ViewToggle `border-2 border-ink` — Priorität: Mittel
Durch `bg-steel-700 text-white border-steel-700` ersetzen.
