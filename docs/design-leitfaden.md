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

**Icon-Größen (verbindliche Tabelle für alle Komponenten):**

| Kontext | Icon `size` |
|---|---|
| Icon in Text+Icon-Button (`md` oder `sm`) | `16` |
| Icon-Only-Button (`md`, `w-10`) | `18` |
| Icon-Only-Button (`sm`, `w-8`) | `16` |
| Primäre Aktions-Icons in Panel-/Section-Headers | `16` |
| Icons in Modal/FormModal/DetailModal-Header | `20` |
| Inline-Icons neben Text (z. B. Metazeile, TabBar) | `14` |
| Badge/Chip Remove-`X` | `12` |

Diese Tabelle ist die einzige verbindliche Quelle für Icon-Größen. `agents.md §15.6` verweist auf diese Tabelle. Icon-Only-Buttons erhalten automatisch die passende Breite (`w-10` / `w-8`).

**Größenwahl:** `md` ist der Standard. `sm` nur in dichten Toolbars, wo explizit Platz gespart werden muss. Icon-Buttons neben Eingabefeldern (`h-11`) verwenden immer `md`, damit Höhen visuell harmonieren.

**Verboten:** Button-Klassen mit Ad-hoc-`className`-Overrides für Farben umgehen. Stattdessen einen neuen Variant definieren.

### 8.2 Input / Select

Beide: `h-11`, `border border-line`, `bg-white`, `rounded-md`, `text-sm`.  
Focus: `focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10`.  
Immer in `<FormField>` gewrappt (Label + Fehler/Hinweis).

### 8.3 Badge

Rechteckiges Inline-Label für Metadaten, Typen, Kategorien, Relationen.  
Form: `inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-semibold`.  
Farbe: über `tone`-Prop oder `color`-Prop (Katalogfarbe).  
Zwei Modi: standard (Rahmen + Tint + farbiger Text), `filled` (solide Füllfarbe + weißer Text).

### 8.4 Pill

Kompatibilitätslabel für ältere Stellen. Neue Status-, Prioritäts-, Tag- und Parent-Darstellungen verwenden die Badge-Grundform.  
Form: identisch zu Badge (`inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-semibold`).  
Farbe: bei Status/Priorität solide Füllfarbe + weißer Text, bei Tags/Parent getönte Badge-Darstellung.

> **Einheitsregel:** Status, Priorität, Tags und Parent-Hinweise müssen dieselbe Höhe, denselben Radius und dieselbe Grundtypografie verwenden. Unterschiede entstehen nur durch Farbe und Füllmodus.

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
Beschreibung (Untertitel) standardmäßig einzeilig (`truncate`). Für inhaltsreiche Einträge (z. B. Kommentare) über `descriptionClassName` mehrzeilig erlaubt (`line-clamp-3` = max. drei Zeilen). Titel bleibt einzeilig (`truncate`).  
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
- Aktions-Cluster (geteilt über `DetailHeaderActions`, genutzt von FormModal und
  WikiPageForm): feste Reihenfolge **Speicherstatus → Bearbeiten → Referenz kopieren
  → Aktualisieren → In neuem Tab → Löschen → Schließen**. Nur Aktionen mit
  übergebenem Handler werden gerendert; die Reihenfolge bleibt konstant.
- Icon-Buttons im Cluster: `h-9 w-9 rounded-full`, Icon-Größe `18` (onSteel) bzw.
  `16` (onLight) gemäß §8.1.
- **Aktualisieren** (`RefreshCw`): lädt die aktuell sichtbare Collection neu.
  Erscheint nur auf Collection-Tabs (Listen wie Aufgaben, Tickets, Notizen,
  Kommentare, Dateien), nicht auf Übersicht/Details/Journal und nicht im
  Anlege-Modus. Während des Ladens dreht das Icon (`animate-spin`).

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

### 8.20 Action-Button-Semantik: Create, Remove/Unlink, Delete

Aktions-Buttons für das Anlegen, Trennen und Löschen von Objekten folgen einer festen Semantik. Abweichungen sind nicht zulässig.

#### Create — Objekt anlegen

Der Einstiegspunkt für das Anlegen eines Objekts verwendet immer das `Plus`-Icon aus `lucide-react`.

| Kontext | Form |
|---|---|
| Toolbar einer ListBoardView | `Button variant="secondary" size="md"` + `Plus size={16}` + Textlabel |
| Kompakter Panel-Header | `Button variant="ghost" size="sm"` + `Plus size={16}` + Textlabel |
| Extrem dichte Toolbar (begründungspflichtig) | `Button variant="ghost" size="sm"` Icon-Only + `Plus size={18}` |

**Verboten:** `CirclePlus`, `PlusCircle`, `PlusSquare` — ausschließlich `Plus`. Kein rohes `<button>` ohne die `Button`-Komponente.

#### Remove / Unlink — Verknüpfung trennen (kein Datenverlust)

Das Entfernen einer Verknüpfung verwendet immer das `X`-Icon aus `lucide-react`.

| Kontext | Form |
|---|---|
| Relation-Panel (Zeile/Karte aus Verknüpfung entfernen) | `Button variant="ghost" size="sm"` + `X size={16}` |
| Badge / Chip (Tag, Parent, Filter entfernen) | `X size={12}` inline im Badge — kein eigener Button-Wrapper |

Kein ConfirmDialog erforderlich, da kein Datenverlust entsteht.

#### Delete — Objekt endgültig löschen

Das permanente Löschen eines Objekts verwendet `Trash2` und immer `useConfirm()`.

| Kontext | Form |
|---|---|
| Alle Lösch-Aktionen (Card, Row, Detail) | `Button variant="danger"` + `Trash2 size={16}` + `useConfirm()` |

**Semantische Trennung:**

| Aktion | Icon | Datenverlust | ConfirmDialog |
|---|---|---|---|
| Objekt anlegen | `Plus` | — | Nein |
| Verknüpfung trennen | `X` | Nein | Nein |
| Badge/Chip entfernen | `X size={12}` inline | Nein | Nein |
| Objekt löschen | `Trash2` | Ja | Pflicht |

### 8.21 Detail-Sidebar Panels — Einstellungen, Optionen, Stammdaten

Konfigurierbare Eigenschaften eines Objekts (Status, Zuständiger, Datum, Priorität, Katalog-Zuordnung usw.) sowie Stammdaten-Anzeigen (Erstellt am, Letzte Änderung) werden in Detail-Sidebars und Formularen als `Section`-Komponente mit eigenem `title`-Prop dargestellt.

```tsx
<Section title="Einstellungen">
  <FormField label="Status"><RadioList ... /></FormField>
  <FormField label="Zuständig"><UserSelectField ... /></FormField>
</Section>

<Section title="Stammdaten">
  <FormField label="Erstellt am"><span>{formatDate(item.createdAt)}</span></FormField>
  <FormField label="Letzte Änderung"><span>{formatDate(item.updatedAt)}</span></FormField>
</Section>
```

Diese Regel gilt sowohl für `FormModal`-Formulare (Anlegen/Bearbeiten) als auch für `DetailModal`/Detail-Sidebars (Lesen/Navigieren).

**Verboten:** Eigenständige `<div>`-Blöcke mit Inline-`<h3>`-Überschriften außerhalb einer `Section`, lose `<p>`-Elemente ohne `FormField`-Wrapper, eigenes Card-Markup für Konfigurationsgruppen.

### 8.22 ListBoardView — Layoutregeln

`ListBoardView` ist die einzige zulässige Basis für alle Listen- und Board-Ansichten (Hauptansichten und Detail-Tabs). Jede der folgenden Regeln gilt für alle Adapter über `ListBoardView<T>`.

#### Platzbelegung

- Die Komponente füllt immer den gesamten verfügbaren Platz: `h-full flex-1 w-full`.
- Der einheitliche Außenabstand kommt ausschließlich vom einbettenden Container (`p-4` für Detail-Tabs, `p-5` für Hauptansichten) — nie von der Komponente selbst.
- In Detail-Pages füllt der View den Bereich zwischen TabBar und unterem Seitenrand. Der Parent-Container ist dafür verantwortlich, diesen Bereich als scrollbaren Flex-Container anzubieten.

#### Hintergrund

- Die `ListBoardView` und ihr einbettender Container zusammen ergeben eine weiße Fläche: der Container setzt `bg-white rounded-lg`, die Komponente selbst hat kein eigenes `bg-*`.
- Keine `bg-shell` oder `bg-steel-*` als Hintergrund des View-Panels.

#### Toolbar — Add-Button

Der primäre Add-Button in der Toolbar folgt immer §8.20 (Create-Semantik):

| Kontext | Form |
|---|---|
| Hauptansicht | `Button variant="secondary" size="md"` + `Plus size={16}` + `addLabel` als Text |
| Detail-Tab | `Button variant="ghost" size="sm"` + `Plus size={16}` + `addLabel` als Text |

**Verboten:** Icon-Only Add-Button in der Toolbar, `className`-Overrides für Farben (z. B. `border-fern text-fern`), `Plus size={26}` oder abweichende `strokeWidth`-Werte.

#### Toolbar — Link-Button

Wo Objekte verknüpft (nicht neu erstellt) werden, steht neben dem Add-Button ein Link-Button:

- `Button variant="ghost" size="sm"` + `Link size={16}` + Textlabel (z. B. „Verknüpfen")
- Der Link-Button öffnet einen Auswahl-Dialog, keinen Erstellungs-Dialog.

#### Toolbar — Suchleiste

- Immer links in der Toolbar-Grid-Zeile.
- Immer die `SearchInput`-Komponente — kein reguläres `Input`.
- Position ist nicht konfigurierbar.

#### Spalten und Gruppen

- Spalten und Gruppen werden **ausschließlich dann angezeigt, wenn mindestens ein Item existiert**.
- Ist die gesamte Itemliste leer (`items.length === 0`), erscheint ausschließlich der `EmptyState` — keine kollabierten Spalten-Stubs.
- Sind Items vorhanden, dürfen leere bekannte Spalten als kollabierte Drop-Target-Streifen sichtbar bleiben (DnD-Usability). Unbekannte Spalten (Status nicht im Katalog) werden nur gezeigt, wenn sie Items enthalten.
- `showGroupedEmptyState` bleibt immer `true`. Das Prop sollte nicht auf `false` gesetzt werden.

#### EmptyState

Innerhalb von `ListBoardView` gilt:

| Kontext | Variante | Buttons |
|---|---|---|
| Detail-Tab, noch keine Items | `default` (dashed border) | Nein — Add-Button ist in der Toolbar |
| Hauptansicht, Nutzer hat noch nie Daten angelegt | `first-run` (dunkler Gradient) | Ja, ein primärer CTA |
| Gefilterte Ansicht ohne Treffer | `default` | Nein |

Inhalt (Icon, Titel, Body-Text) ist domänenspezifisch — die Darstellungsform ist es nicht.

### 8.19 SearchInput

Form: `h-10 rounded-md bg-steel-100 px-3` (kein Rahmen, kein `bg-white`).  
Nur in Toolbar-Kontexten. Kein Einsatz als reguläres Formularfeld.  
Der Wrapper `<label>` ist hier als semantischer Wrapper erlaubt — nicht als Formularfeld-Label.

---

### 8.23 Datums- und Zeitdarstellung

Menschenlesbare Datums- und Zeitangaben von Datensätzen werden ausschließlich über die zentralen Helfer in `apps/web/src/utils/date.ts` erzeugt. Kein Inline-`format()` von date-fns und kein `toLocaleString()` in Komponenten für fachliche Anzeigen.

| Helfer | Ausgabe | Verwendung |
|---|---|---|
| `formatHumanDate` | `03.07.26` | Reines Datum (Fälligkeit, Erstellt/Geändert) |
| `formatHumanTime` | `14:30` | Reine Uhrzeit |
| `formatHumanDateTime` | `03.07.26 14:30` | Datum + Uhrzeit (z. B. Journal-Zeitstempel) |
| `formatEventTimeRange` | `Ganztägig` / `09:00 - 10:30` | Termin-Zeitspanne; kapselt die `isAllDay`-Regel |

**Termine:** Die Uhrzeit-Darstellung läuft immer über `formatEventTimeRange` — die `isAllDay`-Unterscheidung wird nicht in der Komponente wiederholt.

**Nicht betroffen:** Navigations-Beschriftungen des Kalenders (aktueller Monat, sichtbare Woche) und rein technische Zeitstempel (z. B. sekundengenauer Sync-Zeitpunkt) bleiben lokal bei ihrer Komponente.

---

### 8.24 Progressives Nachladen großer Listen (LoadMoreIndicator)

Große Listen und Board-Ansichten laden **nicht** per Seitenzahl-Pagination, sondern progressiv/sequenziell über den Hook `useProgressiveList` (`apps/web/src/hooks/useProgressiveList.ts`): erster Block sofort, weitere Blöcke automatisch einer nach dem anderen (nächster Abruf erst nach Abschluss des vorigen), Default 50 pro Block mit kleiner Rendering-Pause.

- Fortschrittsanzeige ausschließlich über `components/ui/LoadMoreIndicator` (`loadedCount`/`total`/`loadingMore`), unter der Liste bzw. dem Board gerendert; blendet sich selbst aus, sobald alles geladen ist.
- Serverseitige Filter und Suche gehen in **jeden** Block-Abruf; ein Filter- oder Suchwechsel startet das Laden automatisch neu (queryKey-Wechsel).
- Datenquelle ist die opt-in-paginierte API (`Paginated<T>` über den Query-Parameter `page`); der Alt-Pfad ohne `page` (nacktes Array) bleibt für interne und owner-gebundene Nutzungen bestehen.
- Keine eigene Seitenzahl-Leiste und kein „Mehr laden"-Button — das Nachladen läuft automatisch.

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
| `CirclePlus`, `PlusCircle`, `PlusSquare` für Create-Aktionen | Inkonsistentes Create-Symbol | `Plus` |
| `Minus` für Remove/Unlink | Abgelöst durch `X` | `X size={16}` (Button) / `X size={12}` (Badge inline) |
| `Trash2` ohne `useConfirm()` | Datenverlust ohne Bestätigung | `useConfirm()` vorschalten |
| `<div>` mit Inline-`<h3>` als Konfigurationsgruppe in Formularen/Sidebars | Inkonsistentes Panel-Layout | `Section`-Komponente mit `title`-Prop |
| Icon-Größen abweichend von §8.1 Tabelle | Inkonsistente visuelle Hierarchie | Größen-Tabelle in §8.1 verwenden |
| `showGroupedEmptyState={false}` in ListBoardView | Zeigt leere Spalten-Stubs ohne Daten | Prop weglassen (default `true`) |
| Eigener List/Board-Container statt `ListBoardView<T>` | Drift in Layout und Verhalten | `ListBoardView<T>`-Adapter verwenden |
| `bg-shell` oder `bg-steel-*` als Hintergrund des View-Panels | Bricht Weiß-Panel-Regel (§8.22) | `bg-white rounded-lg` im Container |
| `ExternalLink`/↗-Icon auf In-place-Navigation (`<Link>`/`navigate` im selben Tab) | Signalisiert „neuer Tab", navigiert aber in-place — irreführend | Echtes Tab-Öffnen via `<a target="_blank" rel="noopener noreferrer">` + `withStandaloneView(...)`; sonst Icon weglassen und beim In-place-Link `returnTo` mitgeben |

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

### ❽ `ListBoardView` Add-Button — Priorität: Hoch
`ListBoardView.tsx` Toolbar-Add-Button verwendet `variant="ghost"` mit `className`-Override (`border-fern text-fern`) und `Plus size={26} strokeWidth={3}`. Ersetzen durch `variant="secondary"` (Hauptansicht) oder `variant="ghost" size="sm"` (Detail-Tab) + `Plus size={16}` + `addLabel` als Text — gemäß §8.20 und §8.22.

### ❾ `ListBoardView` Spalten-Add-Button Icon-Größe — Priorität: Mittel
`ListBoardView.tsx` Column-Add-Button verwendet `Plus size={30} strokeWidth={3.4}`. Ersetzen durch `Plus size={18}` (Icon-Only `md`-Button gemäß §8.1).
