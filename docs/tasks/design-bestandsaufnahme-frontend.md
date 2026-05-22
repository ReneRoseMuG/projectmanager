# Frontend-Design-Bestandsaufnahme

**Datum:** 22.05.26  
**Bereich:** `apps/web`  
**Grundlage:** `docs/tasks/design-richtlinien-visuell.md`  
**Art:** Analyse-/Audit-Report, keine Umsetzung

## 1. Ziel und Einordnung

Diese Bestandsaufnahme erfasst die aktuell verwendeten Frontend-Stile, Layoutmuster, Formate, Klassen und zentralen UI-Objekte im Web-Frontend. Sie dient als Arbeitsgrundlage, um die visuellen Regeln später verbindlich zu schärfen und zukünftige Codex-Arbeit konsistenter zu machen.

Der Projekt Manager ist laut visueller Richtlinie ein datenintensives Desktop-Business-Tool. Die Oberfläche soll daher ruhig, strukturiert und wiederholbar wirken. Der aktuelle Code folgt diesem Ziel bereits in vielen zentralen Komponenten, enthält aber noch mehrere Stilgenerationen nebeneinander: neue tokenbasierte Komponenten, ältere Slate-Farbklassen, lokale Form-/Radiusentscheidungen, komponentennahe Sonderstile und Drittanbieter-Overrides.

Diese Datei ist ausdrücklich kein Fix-Auftrag. Sie beschreibt den Ist-Zustand, priorisiert Abweichungen und schlägt eine Reihenfolge für spätere Vertiefung und Korrektur vor.

## 2. Gelesene Quellen

| Quelle | Rolle in der Analyse | Ergebnis |
|---|---|---|
| `docs/tasks/design-richtlinien-visuell.md` | Soll-Regeln für Farben, Typografie, Radius, Schatten, Layout und Komponenten | Verbindliche Zielvorgabe für alle Bewertungen |
| `apps/web/src/styles/theme.css` | CSS Custom Properties für Farben und Schatten | Zentrales Token-Fundament ist vorhanden |
| `apps/web/tailwind.config.ts` | Tailwind-Aliases für Theme-Tokens | Aliases für `ink`, `shell`, `line`, `steel`, Akzentfarben und Schatten sind definiert |
| `apps/web/src/styles.css` | Globale CSS-Regeln und Drittanbieter-Overrides | Enthält ProseMirror/Rich-Text, FullCalendar, Toast, Skeleton und TLDraw-Regeln |
| `apps/web/src/components/ui/*` | Wiederverwendbare UI-Komponenten | Höchste Hebelwirkung, aber noch einige Richtlinienabweichungen |
| `apps/web/src/components/layout/*` | Shell, Sidebar, TopBar, AdminLayout, Overlays | Grundlayout ist klar, aber Sondermuster bleiben |
| `apps/web/src/pages/*` und Domain-Komponenten | Produktoberflächen und konkrete Workflows | Viele lokale Klassen, besonders in Admin, Dashboard, Wiki, Kalender, Tags, Attachments |

Nicht geprüft wurden Backend, API-Verträge, Datenmodell, Permissions und Migrationsstand, weil sie für diese visuelle Bestandsaufnahme nicht relevant sind.

## 3. Messbarer Ist-Stand

Statische Suchläufe über `apps/web/src` ergeben:

| Kennzahl | Wert | Einordnung |
|---|---:|---|
| TS/TSX/CSS-Dateien in `apps/web/src` | 234 | Breite Frontend-Fläche |
| Dateien unter `components` | 126 | Schwerpunkt liegt klar auf Komponenten |
| Dateien mit `className` | 131 | Styling ist stark lokal in JSX verteilt |
| `className`-Vorkommen | 1293 | Design-Regeln müssen maschinenprüfbar oder komponentenzentriert werden |
| `text-slate-*` | 186 | Größter Token-Verstoß |
| `bg-slate-*` | 3 | Klein, aber ebenfalls außerhalb des Token-Systems |
| `rounded-full` | 44 | Teilweise erlaubt, teilweise klar regelwidrig |
| `rounded-2xl` | 12 | Laut Richtlinie verboten |
| `rounded-xl` | 21 | Nur in wenigen Kontexten erlaubt, daher prüfpflichtig |
| rohe `<label>` | 39 | FormField/Label-Regel wird nicht konsequent eingehalten |
| Inline-Styles `style={{...}}` | 18 | Teils technisch nötig, teils Design-Risiko |
| `text-muted` | 15 | In Tailwind-Konfiguration nicht definiert |
| raw Shadow-Klassen `shadow`, `shadow-md`, `shadow-lg` | 5 | Richtlinie erlaubt nur Schatten-Tokens |
| `window.confirm()` | 0 | ConfirmDialog-Regel ist aktuell eingehalten |

Komponentenverteilung unter `apps/web/src/components`:

| Bereich | Dateien | Hinweis |
|---|---:|---|
| `ui` | 57 | Zentrales Design-System, zuerst zu konsolidieren |
| `features` | 8 | Viele Detail-/Relationsmuster |
| `tickets` | 7 | Board, Form, LinkDialog, RelationPanel |
| `dashboard` | 6 | Neue Widget-Fläche mit vielen lokalen Micro-Patterns |
| `tasks` | 6 | Board, Form, LinkDialog, OwnerBoard |
| `layout` | 5 | Shell, Sidebar, TopBar, AdminLayout, Overlays |
| `calendar`, `attachments`, `wiki`, `usecases` | je 4 | jeweils eigene UI-Sonderflächen |
| `projects`, `milestones`, `tags`, `notes` | je 3 | Form-/Card-/Manager-Muster |

## 4. Soll-Regeln aus der visuellen Richtlinie

### 4.1 Designprinzip

Die Oberfläche soll Struktur statt Dekoration transportieren. Wiederkehrende Elemente müssen gleich aussehen. Akzentfarben sind semantischen Zuständen vorbehalten und nicht für allgemeine Dekoration gedacht.

### 4.2 Farben

Alle Farben sollen über Tokens aus `theme.css` und Tailwind-Aliases laufen. Erlaubt sind vor allem:

- Text: `text-ink`, `text-steel-400` bis `text-steel-700`
- Flächen: `bg-shell`, `bg-white`, `bg-steel-*`
- Linien: `border-line`, `border-steel-*`
- Semantik: `crimson`, `fern`, `tangerine`, `teal`, `violet`, `magenta`, `mustard`

Nicht erlaubt sind Raw-Tailwind-Farben wie `slate-*`, `gray-*`, `blue-*`, `red-*`, `green-*`.

### 4.3 Typografie

Die Richtlinie definiert eine kleine Hierarchie:

- Seitenüberschrift: `text-2xl font-semibold text-ink`
- Modal-Header: `text-lg font-semibold text-ink`
- Standard-Section: `text-sm font-semibold text-ink`
- Label-Section: `text-sm font-bold uppercase tracking-wide text-steel-400`
- Interface-Text: `text-sm`
- Metainfo: `text-xs`

Uppercase und Tracking sind nur für Label-Positionen vorgesehen. Buttons sollen `font-medium` oder `font-semibold` verwenden, nicht `font-bold`.

### 4.4 Radius

Erlaubte Radius-Stufen:

- `rounded`: sehr kleine Count-Badges
- `rounded-md`: Button, Input, Select, Badge, Pill, FilterChip, SearchInput
- `rounded-lg`: Cards, Rows, Modals, Dropdowns, Sections, EmptyStates
- `rounded-xl`: nur große Hintergrund-Wrapper oder Detail-Header-Dekorationen
- `rounded-full`: Avatar, ProgressBar und Detail-Header-Sonderzone

`rounded-2xl` und `rounded-3xl` sind verboten.

### 4.5 Schatten

Erlaubt sind Token-Schatten:

- `shadow-sm`
- `shadow-panel`
- `shadow-modal`
- `shadow-steel`
- `shadow-card`

Raw-Schatten wie `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl` sind nicht Teil des Systems.

### 4.6 Layout

Die Shell folgt dem Muster:

- TopBar: `h-16`, `bg-white`, `border-b border-line`
- Sidebar: `w-64`, Steel-Gradient, auf kleinen Screens ausgeblendet
- Content Area: `flex flex-col gap-6 h-full min-h-0 w-full min-w-0`
- Seitenheader: `h1.text-2xl.font-semibold.text-ink` plus optionaler Untertitel

Der Ist-Code hat diese Richtung, aber nicht alle Seiten verwenden denselben Header- und Abschnittsaufbau.

## 5. Token- und Theme-Inventar

### 5.1 Vorhandene Tokens

`theme.css` definiert:

- Semantische Basis: `ink`, `shell`, `line`, `white`
- Steel-Skala: `steel-50` bis `steel-900`
- Akzentfarben: `crimson`, `tangerine`, `mustard`, `fern`, `teal`, `violet`, `magenta`
- Schatten: `panel`, `steel`, `sm`, `modal`, `card`, `steel-icon`

`tailwind.config.ts` bindet diese Werte als Tailwind-Aliases ein. Damit ist die technische Grundlage für tokenbasiertes Styling vorhanden.

### 5.2 Auffälligkeiten

`text-muted` wird in 15 Stellen verwendet, ist aber weder in `tailwind.config.ts` noch in `theme.css` definiert. Betroffen sind unter anderem:

- `components/ui/PageHeader.tsx`
- `components/ui/ProjectMilestoneFilterBar.tsx`
- `pages/admin/RoleDetailPage.tsx`
- `pages/admin/RolesPage.tsx`
- `pages/admin/UserDetailPage.tsx`
- `pages/admin/UsersPage.tsx`
- `pages/SetupPasswordPage.tsx`

Das ist kein reiner Designverstoß, sondern potentiell ein funktionaler Tailwind-Fehler: Wenn Tailwind die Klasse nicht erzeugt, fällt die erwartete Sekundärtextfarbe weg.

## 6. Globale CSS- und Drittanbieter-Flächen

### 6.1 Basis-Regeln

`styles.css` setzt globale Defaults für:

- `:root` mit `color: var(--color-ink)` und `background: var(--color-shell)`
- `box-sizing: border-box`
- `body` mit Mindestbreite und Mindesthöhe
- Formular-Elemente mit geerbter Schrift

Diese Regeln passen zur Richtlinie.

### 6.2 ProseMirror und Rich-Text

Rich-Text verwendet globale Klassen wie:

- `.ProseMirror`
- `.rich-text-inline-min-rows`
- `.rich-text-surface`

Die Fläche nutzt teils Design-Tokens (`ink`, `line`, `steel`) und teils alte Slate-Werte, z. B. Placeholder und Blockquote. Die Rich-Text-Fläche ist ein Sonderbereich, weil Inhalte typografisch dichter und semantisch freier sind als normale Formularfelder. Trotzdem sollte sie farblich vollständig auf Steel-Tokens umgestellt werden.

### 6.3 FullCalendar

FullCalendar wird über `.fc`-Variablen und Klassenselektoren angepasst. Die Regeln nutzen überwiegend Tokens, enthalten aber eigene Pixelwerte und `!important`. Das ist bei Drittanbieter-Overrides nachvollziehbar, sollte aber als eigener Ausnahmebereich dokumentiert werden.

Besonders relevant:

- `.fc-event` mit `border-radius: 6px`
- `.fc-button` mit `border-radius: 8px !important`
- `.fc-daygrid-day-number` nutzt noch Slate-Farbe

### 6.4 Toast und Skeleton

Toast und Skeleton verwenden eigene Animationen:

- `.toast-enter`
- `.toast-timebar`
- `.skeleton-shimmer`

Das ist als UI-Infrastruktur sinnvoll. Die Farbwerte der Skeleton-Animation sind tokenbasiert. Toast nutzt in der Komponente noch `text-slate-600` für Body-Text.

### 6.5 TLDraw

`.tl-container` wird nur technisch begrenzt. Das ist kein Designsystem-Regelwerk, sondern Einbettungslogik.

## 7. Layout-Inventar

### 7.1 Shell und App

`App.tsx` steuert:

- Auth-abhängige Routen
- Shell mit Sidebar, TopBar und `main`
- Full-Bleed-Detailrouten
- Standalone-Views über Query-Parameter

Die Hauptfläche nutzt `bg-shell text-ink`. Normale Seiten erhalten `overflow-auto p-4 md:p-6`, Full-Bleed-Detailrouten `overflow-hidden p-0`. Das ist eine sinnvolle Trennung, sollte aber als feste Layout-Regel dokumentiert werden.

### 7.2 Sidebar

`Sidebar.tsx` entspricht überwiegend der Richtlinie:

- `bg-gradient-to-b from-steel-700 to-steel-800`
- NavLinks mit `h-10 rounded-lg px-3 text-sm font-medium`
- Aktiver Link: `bg-white font-semibold text-steel-700 shadow-md`
- Inaktiv: `text-white/75 hover:bg-white/5 hover:text-white`

Abweichungen:

- `shadow-md` ist kein erlaubter Schatten-Token.
- Logo-Badge nutzt `shadow-lg`.
- Statuspunkt nutzt `rounded-full`; das ist wahrscheinlich als Punktindikator akzeptabel, aber noch nicht ausdrücklich in den Ausnahmen benannt.

Positiv: Die frühere Duplizierung der NavLink-Klassen ist bereits durch `navLinkClass(isActive)` reduziert.

### 7.3 TopBar

`TopBar.tsx` nutzt auf mobilen Screens:

- `h-16`
- `bg-white`
- Icon-Buttons `h-10 w-10 rounded-md`
- aktive NavLinks mit `bg-steel-900 text-white`

Eine explizite `border-b border-line` ist nicht direkt auf dem Header, sondern über eine absolute Linie gelöst. Das ist visuell ähnlich, aber als Ausnahme zu prüfen.

### 7.4 AdminLayout

`AdminLayout.tsx` verwendet eine lokale Tab-/Button-Navigation:

- aktiv: `bg-steel-700 text-white`
- inaktiv: `border border-line bg-white text-ink hover:border-fern`
- Radius: `rounded-md`

Das passt grundsätzlich, ist aber nicht an `TabBar` oder `SegmentedControl` angebunden. Später sollte entschieden werden, ob Admin-Navigation ein eigener Pattern-Typ bleibt oder über eine zentrale Komponente läuft.

### 7.5 PageHeader

`PageHeader.tsx` existiert bereits und setzt den H1 korrekt. Allerdings verwendet der Untertitel `text-muted`, was aktuell nicht definiert ist. Außerdem nutzen nicht alle Seiten konsequent `PageHeader`; Detail- und Adminseiten haben noch lokale Header-Blöcke.

## 8. UI-Komponenten-Inventar

### 8.1 Button

Ist-Zustand:

- Varianten: `primary`, `secondary`, `ghost`, `danger`
- Größen: `sm`, `md`
- Basis: `rounded-md px-3 text-sm font-medium`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`

Bewertung:

Die Button-Komponente entspricht weitgehend der Richtlinie. Es fehlt die in der Richtlinie erwähnte Variante `inverted` für dunkle First-Run-Flächen. Dadurch nutzt `EmptyState` weiterhin direkte `className`-Farb-Overrides.

### 8.2 Input und Select

Ist-Zustand:

- `Input`: `h-11 w-full rounded-lg border border-line bg-white ...`
- `Select`: `h-11 w-full rounded-md border border-line bg-white ...`

Bewertung:

`Input` weicht beim Radius ab. Die Richtlinie verlangt für beide `rounded-md`. Außerdem nutzt das Input-Icon `text-slate-400`.

### 8.3 FormField und Label

Ist-Zustand:

- `FormField` wrappt `Label`, Control und Hint/Error.
- `Label` verwendet `text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700`.

Bewertung:

Die Grundstruktur ist vorhanden, aber `Label` selbst verletzt die Token-Regel (`text-slate-700`) und nutzt ein Arbitrary Tracking. Zusätzlich existieren 39 rohe `<label>` in Forms und Filtern. Nicht alle sind automatisch falsch, aber Formularfelder sollten bevorzugt über `FormField` laufen.

### 8.4 Badge

Ist-Zustand:

- Tonalität über `tone`
- optionale freie Katalogfarbe über Inline-Style
- Basis: `rounded-full border px-2 text-xs font-semibold`

Bewertung:

`rounded-full` widerspricht der Richtlinie. Badge soll `rounded-md` verwenden. Die Inline-Styles für Katalogfarben sind inhaltlich nachvollziehbar, sollten aber als erlaubte datengetriebene Ausnahme dokumentiert werden.

### 8.5 Pill und StatusPill

Ist-Zustand:

- `Pill` nutzt `rounded-full`, `text-[11px]`, `uppercase`, `tracking-wider`
- `StatusPill` nutzt Pill und bei editierbarem Status einen `rounded-full` Button

Bewertung:

Status-Pills sind semantisch richtig eingesetzt, aber die Form weicht ab. Laut Richtlinie soll Pill `rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide` verwenden. `StatusPill` sollte denselben Radius übernehmen.

### 8.6 FilterChips

Ist-Zustand:

- `h-10 rounded-md border px-3 text-sm font-medium`
- aktiv: `border-ink bg-steel-900 text-white`
- inaktiv: `border-line bg-white text-slate-700 hover:border-fern`
- Katalogfarben werden bei Optionen per Inline-Style eingemischt

Bewertung:

Struktur und Aktivsignal passen. Slate-Texte müssen ersetzt werden. Katalogfarbige Filterchips sind eine Designentscheidung: Sie brechen die klare Regel "aktiv = steel gefüllt", können aber bei fachlichen Statuskatalogen nützlich sein.

### 8.7 TabBar

Ist-Zustand:

- Tab-Buttons: `h-12 border-b-2 px-3 text-sm font-semibold`
- aktiv: `border-steel-700 text-steel-700`
- inaktiv: `border-transparent text-slate-500 hover:text-ink`
- Count-Badge: `rounded-full`

Bewertung:

TabBar folgt dem Grundmuster, weicht aber bei Slate-Farbe und Count-Badge-Radius ab. Count-Badge soll `rounded` verwenden.

### 8.8 SegmentedControl und StatusToggle

Ist-Zustand:

- Wrapper: `rounded-xl border border-line bg-steel-50 p-1.5`
- `SegmentedControl`-Optionen: `h-9 rounded-lg ... text-slate-500`
- Richtlinie verlangt `rounded-md` für Optionen

Bewertung:

Der Wrapper ist regelkonform. Die Option-Radii und Slate-Farbe müssen vereinheitlicht werden. `StatusToggle` nutzt ein ähnliches Muster und sollte in derselben Iteration geprüft werden.

### 8.9 ViewToggle

Ist-Zustand:

- `h-8 w-8 rounded-md border`
- aktiv: `border-2 border-ink`

Bewertung:

Der aktive Zustand widerspricht der Richtlinie. Erwartet ist `bg-steel-700 text-white border-steel-700`.

### 8.10 ItemCard

Ist-Zustand:

- `rounded-2xl border border-line bg-white p-5 shadow-sm`
- Hover: `hover:-translate-y-0.5 hover:shadow-panel`
- Akzentstreifen: `rounded-t-2xl`

Bewertung:

Verhalten, Spacing und Hover passen. Radius ist klar regelwidrig. Ziel: Card `rounded-lg`, Akzentstreifen `rounded-t-lg`.

### 8.11 ItemRow

Ist-Zustand:

- `rounded-xl border border-l-[4px] border-line bg-white px-4 py-3.5 shadow-sm`
- Hover: `hover:border-steel-300 hover:shadow-md`

Bewertung:

ItemRow soll `rounded-lg` verwenden. `shadow-md` im Hover ist kein erlaubter Schatten-Token.

### 8.12 Modal und ConfirmDialog

Ist-Zustand:

- `Modal`: `rounded-2xl bg-white shadow-modal`
- `ConfirmDialog`: `rounded-2xl border border-line bg-white shadow-modal`
- Confirm-Icon-Container: `rounded-xl`

Bewertung:

Richtlinie verlangt `rounded-lg` für Container und `rounded-md` für Confirm-Icon-Container. Backdrop und Header-Struktur passen grundsätzlich.

### 8.13 FormModal und DetailModal

Ist-Zustand:

- Steel-Header mit Dekorations-Blob `rounded-full`
- Header-Buttons `rounded-full`
- Icon-Container `rounded-xl`
- Subtitle-Badge in `DetailModal` aktuell `rounded-full`

Bewertung:

Die Header-Sonderzone ist in der Richtlinie ausdrücklich erlaubt. Der Subtitle-Badge soll aber `rounded-md` verwenden. FormModal und DetailModal sollten als bewusst eigenständiges Detailseitenmuster dokumentiert werden.

### 8.14 Section

Ist-Zustand:

- Nicht-fill-Variante: `rounded-xl border border-line bg-white p-4 shadow-panel`
- Fill-Variante: struktureller Flex-Container ohne Card-Chrome

Bewertung:

Nicht-fill-Section soll `rounded-lg` verwenden. Fill-Variante ist als Layoutfläche plausibel.

### 8.15 EmptyState

Ist-Zustand:

- Section-Container `rounded-lg`
- Icon-Container `rounded-2xl`
- First-run: Button-Farbgebung über direkte `className`-Overrides

Bewertung:

Container passt. Icon-Container soll `rounded-lg` werden. Für First-run fehlt Button-Variante `inverted`.

### 8.16 ActionMenu und Dropdowns

Ist-Zustand:

- Menü: `rounded-lg border border-line bg-white shadow-panel`
- Items: `px-3 py-2 text-sm font-medium`
- Danger: `text-crimson hover:bg-crimson/5`

Bewertung:

ActionMenu entspricht weitgehend der Richtlinie. Der Trigger nutzt `Button` mit bewusstem `className`-Override für Größe/Border/Shadow; das ist bei Icon-Menüs funktional, sollte aber als erlaubte Größenanpassung von farblichen Overrides abgegrenzt werden.

### 8.17 Avatar

Ist-Zustand:

- `rounded-full`
- Gradient `from-violet to-magenta`

Bewertung:

`rounded-full` ist ausdrücklich erlaubt. Der Avatar-Gradient ist als Marken-/Benutzerbild-Signal vertretbar, sollte aber nicht auf andere UI-Elemente übertragen werden.

### 8.18 ProgressBar

Ist-Zustand:

- Track und Fill `rounded-full`
- Inline-Styles für Breite, Farbe und optional Textfarbe

Bewertung:

`rounded-full` ist erlaubt. Inline-Breite ist technisch notwendig. Inline-Farbe ist datengetrieben; sie sollte nur aus Katalog- oder Tokenfarben stammen.

### 8.19 SearchInput

Ist-Zustand:

- `h-10 rounded-md bg-steel-100 px-3`
- kein Rahmen
- Text/Placeholder teils Slate
- Wrapper ist ein rohes `<label>`

Bewertung:

Form und Kontext passen. Slate-Farben sind zu ersetzen. Das rohe `<label>` ist hier eher semantischer Wrapper als Formularfeld-Label, sollte aber als erlaubte Ausnahme oder eigener SearchInput-Pattern dokumentiert werden.

## 9. Domain- und Page-Muster

### 9.1 Listen, Boards und Cards

`ListBoardView` ist die zentrale Oberfläche für Listen-/Board-Ansichten. Es bündelt Suche, Filter, ViewToggle, Add-Button, Statusgruppen und Drag-and-drop.

Auffälligkeiten:

- Statusgruppen nutzen datengetriebene `catalogSoftStyle`-Inline-Styles.
- Statusheader verwenden `color-mix(...)`.
- Count-Badges nutzen `rounded-full` und Slate-Text.
- Drag-and-drop nutzt technisch notwendige Styles für Layout/Position.

Bewertung:

`ListBoardView` ist ein Kernmuster und sollte früh konsolidiert werden. Es darf datengetriebene Farbe behalten, aber Count-Badges und Slate-Werte sollten dem Radius-/Token-System folgen.

### 9.2 Detailseiten

Detailseiten für Projekte, Meilensteine, Aufgaben, Tickets, Features, Use Cases und Backlog nutzen Full-Bleed-Routen und Detail-/Form-Strukturen. Der Steel-Header aus `FormModal`/`DetailModal` ist als Sonderzone definiert.

Auffälligkeiten:

- Leere/Fehler-Zustände in Pages verwenden häufig lokale `rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600`.
- Sticky-Footer in Feature/Wiki nutzen `rounded-xl`.
- Viele Detailseiten duplizieren ähnliche Zustandsanzeigen.

Bewertung:

Für Detailseiten sollte es ein verbindliches Set aus ErrorState, LoadingState und EmptyState geben, damit lokale Slate-/Card-Klassen verschwinden.

### 9.3 Formulare

Viele Formulare nutzen inzwischen `FormField`, `Input`, `Select` und `RichTextInlineField`. Gleichzeitig gibt es noch rohe `<label>` in:

- Login und Setup
- Admin User/Role Detail
- Calendar EventForm
- WikiPageForm
- NoteEditor
- TagManager/TagPicker
- Settings/Preferences/CatalogManager
- ProjectMilestoneFilterBar

Bewertung:

Nicht jedes rohe `<label>` ist falsch, z. B. Checkboxen oder kompakte Filter können semantisch als Label arbeiten. Für Eingabefelder mit sichtbarer Beschriftung sollte aber `FormField` Pflicht sein. Checkbox-/Toggle-Zeilen brauchen einen eigenen erlaubten Pattern-Namen.

### 9.4 Admin-Tabellen

Adminseiten verwenden lokale Tabellen mit:

- `bg-steel-50`
- `text-xs uppercase`
- `text-muted`
- lokale Empty-Zellen

Bewertung:

Admin-Tabellen brauchen entweder eine `DataTable`-Komponente oder verbindliche Tabellenklassen. Der aktuelle Einsatz von `text-muted` ist zuerst zu beheben.

### 9.5 Dashboard

Dashboard-Widgets verwenden:

- `rounded-lg border border-line bg-white p-4 shadow-sm`
- kleine lokale Link-Rows mit `rounded-md border border-line p-3`
- EmptyState, Skeleton, StatusPill, PriorityBadge, ProgressBar

Bewertung:

Dashboard ist stilistisch näher am Richtlinienziel als viele ältere Flächen, enthält aber weiterhin Slate-Texte. Die Widget-Shell könnte später als zentrale Komponente definiert werden.

### 9.6 Wiki und Rich-Text

WikiPageForm und WikiPageDetail sind stark von RichTextInlineField geprägt. Es gibt lokale Label-, Toggle- und Sticky-Footer-Muster.

Bewertung:

Wiki und Rich-Text brauchen eine eigene Designuntersektion, weil Textinhalte andere typografische Bedürfnisse haben als Kartenlisten. Trotzdem müssen Tokens und Radiusregeln gelten.

### 9.7 Kalender

Kalender kombiniert eigene Komponenten mit FullCalendar. EventForm hat mehrere rohe Labels und lokale Status-/Relation-Auswahlmuster.

Bewertung:

FullCalendar-Overrides sollten als Drittanbieter-Ausnahme anerkannt werden. EventForm sollte bei FormField/Label und Slate-Farben nachgezogen werden.

### 9.8 Tags, Kataloge und Farbauswahl

TagManager, TagPicker, CatalogManager und ColorPicker verwenden viele Inline-Farben und runde Farbswatches.

Bewertung:

Swatches sind echte Farbauswahlobjekte; `rounded-full` und Inline-Styles können hier erlaubt sein. Diese Ausnahme muss aber eng benannt werden: nur Farbswatch, nicht Badge, Button oder Card.

### 9.9 Attachments

AttachmentPreview und AttachmentUploader nutzen eigene Card- und Icon-Muster, darunter `rounded-xl` und `rounded-2xl`.

Bewertung:

Attachment-Flächen sollten an ItemCard/Section/EmptyState angenähert werden. Vorschau- und Datei-Icon-Muster brauchen klare Radiusregeln.

### 9.10 Suche und Overlays

GlobalSearch und ShellOverlays bilden modale Such-/Agentenflächen. GlobalSearch nutzt `rounded-2xl` und `shadow-modal`.

Bewertung:

Modalartige Overlays sollen `rounded-lg` nutzen. Suchergebnislisten sollten eigene Row-Regeln erhalten, statt lokale Klassen zu duplizieren.

## 10. Klassen- und Muster-Katalog

### 10.1 Häufigste Klassen

| Klasse | Vorkommen | Bewertung |
|---|---:|---|
| `border` | 238 | Grundmuster |
| `text-sm` | 222 | Richtlinienkonform für Interface-Text |
| `border-line` | 212 | Tokenkonform |
| `gap-2` | 180 | Kompakte Elemente |
| `rounded-md` | 143 | Zentrale Control-Form |
| `bg-white` | 133 | Karten/Input-Fläche |
| `gap-3` | 133 | Lokales Zwischenmaß |
| `font-semibold` | 125 | Häufig, meist passend |
| `text-ink` | 116 | Tokenkonform |
| `text-xs` | 108 | Metainfo |
| `gap-4` | 95 | Abschnittsinnenraum |
| `text-slate-500` | 92 | Zu ersetzen |
| `rounded-lg` | 84 | Container-Form |
| `text-slate-600` | 67 | Zu ersetzen |
| `rounded-full` | 44 | Kontextabhängig, oft zu ersetzen |
| `rounded-xl` | 21 | Nur eng erlaubt |
| `rounded-2xl` | 12 | Verboten |

### 10.2 Farben

Gefundene Raw-Farben außerhalb des Token-Systems:

| Klasse | Vorkommen | Ziel |
|---|---:|---|
| `text-slate-400` | 16 | `text-steel-400` |
| `text-slate-500` | 92 | `text-steel-500` |
| `text-slate-600` | 67 | `text-steel-600` |
| `text-slate-700` | 11 | `text-steel-700` |
| `bg-slate-50` | 2 | `bg-steel-50` oder `bg-shell` |
| `bg-slate-100` | 1 | `bg-steel-100` |

Es wurden keine `gray-*`, `zinc-*`, `neutral-*`, `blue-*`, `red-*`, `green-*` oder ähnlichen Raw-Farbklassen gefunden.

### 10.3 Radius

| Radiusklasse | Vorkommen | Bewertung |
|---|---:|---|
| `rounded-md` | 143 | Zielradius für Controls |
| `rounded-lg` | 84 | Zielradius für Container |
| `rounded-full` | 44 | Nur Avatar, ProgressBar, Swatches, Detail-Header und kleine Statuspunkte prüfen/erlauben |
| `rounded-xl` | 21 | Nur Segment-Wrapper oder Header-Icon/Dekor erlaubt |
| `rounded` | 13 | Für kleine Count-Badges passend |
| `rounded-2xl` | 12 | Verboten |
| `rounded-t-2xl` | 1 | Verboten |

### 10.4 Schatten

| Schattenklasse | Vorkommen | Bewertung |
|---|---:|---|
| `shadow-sm` | 37 | erlaubt |
| `shadow-panel` | 17 | erlaubt |
| `shadow-card` | 6 | erlaubt |
| `shadow-modal` | 4 | erlaubt |
| `shadow-steel-icon` | 2 | technisch definiert, aber nicht in Richtlinie benannt |
| `shadow-steel` | 2 | erlaubt |
| `shadow-md` | 3 | nicht erlaubt |
| `shadow` | 1 | nicht erlaubt |
| `shadow-lg` | 1 | nicht erlaubt |

### 10.5 Arbitrary Values

Arbitrary Values sind häufig für Layout nötig, aber als Design-Regel schwer prüfbar. Häufige Beispiele:

- `text-[11px]`
- `text-[10px]`
- `grid-cols-[...]`
- `max-h-[calc(100vh-64px)]`
- `backdrop-blur-[2px]`
- `min-w-[720px]`
- `border-l-[4px]`

Bewertung:

Arbitrary Grid- und Calc-Werte sind für komplexe Tabellen, Detailflächen und Modals plausibel. Arbitrary Textgrößen und Tracking sollten stärker reglementiert werden, weil sie die Typografie-Hierarchie umgehen.

### 10.6 Inline-Styles

Inline-Styles erscheinen in 18 Stellen. Sie fallen in vier Gruppen:

| Gruppe | Beispiele | Bewertung |
|---|---|---|
| Datengetriebene Katalogfarben | `Badge`, `Pill`, `FilterChips`, `ItemCard`, `StatusPill`, `TagManager`, `CatalogManager` | Erlaubbar, wenn Farbe aus Katalog/Token stammt |
| Technische Layoutwerte | `DashboardGrid` order, DnD transform/transition, WikiTree padding | Erlaubbar |
| Fortschritt/Animation | `ProgressBar` width, Toast duration | Erlaubbar |
| Struktur-/Designfarbe direkt | einzelne `backgroundColor`/`color`-Stellen | Prüfen, ob über Tokens/Klassen lösbar |

Die Regel sollte nicht "keine Inline-Styles" lauten, sondern "Inline-Styles nur für datengetriebene Farbe, technische Layoutwerte oder Laufzeitwerte".

## 11. Abweichungsmatrix

| Kategorie | Schwere | Fundstellen / Muster | Risiko | Empfehlung | Phase |
|---|---|---|---|---|---|
| Raw Slate-Farben | Hoch | 186 `text-slate-*`, 3 `bg-slate-*` | Token-System greift nicht vollständig | Mechanische Ersetzung auf `steel-*`, Sichtprüfung | 1 |
| Nicht definierter Alias `text-muted` | Hoch | 15 Stellen in PageHeader, Adminseiten, Setup, FilterBar | Tailwind erzeugt ggf. keine Klasse | Entweder Alias definieren oder auf `text-steel-500` umstellen | 1 |
| Verbotene `rounded-2xl` | Hoch | Modal, ConfirmDialog, ItemCard, EmptyState-Icons, GlobalSearch, Error/404/403 | Uneinheitliches Formvokabular | Auf `rounded-lg` bzw. `rounded-md` korrigieren | 1 |
| Badge/Pill `rounded-full` | Hoch | `Badge`, `Pill`, `StatusPill`, TabBar Count | Labels wirken inkonsistent | Badge/Pill auf `rounded-md`, Count auf `rounded` | 1 |
| Input/Select Radius-Mismatch | Mittel | `Input` `rounded-lg`, `Select` `rounded-md` | Formulare wirken uneinheitlich | Input auf `rounded-md` | 1 |
| Raw Shadow-Klassen | Mittel | Sidebar `shadow-md`/`shadow-lg`, TagPicker `shadow`, ItemRow/NoteCard `hover:shadow-md` | Schattenebenen uneinheitlich | Token-Schatten nutzen oder Richtlinie erweitern | 1 |
| ViewToggle Aktivsignal | Mittel | `border-2 border-ink` | Selektoren mischen Aktivsignale | `bg-steel-700 text-white border-steel-700` | 1 |
| EmptyState Button-Overrides | Mittel | `EmptyState` first-run | Button-Variant-System wird umgangen | Button-Variante `inverted` definieren | 2 |
| Rohe `<label>` | Mittel | 39 Stellen in Forms/Filtern | Formulare driften visuell auseinander | FormField-Pflicht für Eingabefelder, ToggleLabel-Ausnahme definieren | 2 |
| Unklare `rounded-xl`-Nutzung | Mittel | Sections, RelationPanel, StickyFooter, AttachmentPreview | Radius-System wird aufgeweicht | erlaubte Kontexte präzisieren, Rest auf `rounded-lg` | 2 |
| Inline-Style-Policy unklar | Mittel | 18 Stellen | Gute datengetriebene Styles und echte Verstöße sind vermischt | Inline-Style-Regel nach Kategorien festlegen | 2 |
| Page-Header-Duplizierung | Niedrig | mehrere Detail/Admin/Page-Blöcke | Uneinheitliche Titel/Untertitel | `PageHeader` konsequenter nutzen, `text-muted` lösen | 3 |
| Admin-Tabellen ohne Pattern | Niedrig | Users/Roles/Backup | Tabellenstile wachsen lokal | `DataTable` oder Tabellenrichtlinie definieren | 3 |
| Sidebar-NavLink-Duplizierung | Erledigt | `navLinkClass(isActive)` vorhanden | Kein akuter Handlungsbedarf | Abschnitt 13 der Richtlinie aktualisieren | 3 |

## 12. Iterative Vertiefung

### Phase 1: Harte Regelverstöße konsolidieren

Ziel: mechanisch klare und risikoarme Abweichungen entfernen.

Prüfen und korrigieren:

- `text-slate-*` und `bg-slate-*`
- `text-muted`
- `rounded-2xl` und `rounded-t-2xl`
- Badge/Pill/TabBar Count-Radius
- Input-Radius
- Raw-Schatten
- ViewToggle-Aktivzustand

Diese Phase hat hohe Wirkung bei niedrigem Produktentscheidungsbedarf.

### Phase 2: Komponentenregeln schließen

Ziel: zentrale UI-Komponenten als verlässliche Design-System-Schicht stabilisieren.

Prüfen und entscheiden:

- Button-Variant `inverted`
- SearchInput als erlaubter Label-Wrapper
- Checkbox-/Toggle-Zeilen als eigener Form-Pattern
- Inline-Style-Regel für Katalogfarben und technische Laufzeitwerte
- `rounded-xl`-Ausnahmen für Header-Icons, Segment-Wrapper, Sticky-Footer und Relation-Auswahl
- StatusPill/Pill/Badge-Trennregel im Code sichtbar machen

Diese Phase braucht kurze Designentscheidungen, weil nicht alles rein mechanisch ist.

### Phase 3: Layout- und Page-Muster vereinheitlichen

Ziel: lokale Page-Klassen reduzieren.

Prüfen und konsolidieren:

- `PageHeader` auf Übersichts- und Adminseiten
- zentrale Error-/Loading-/Empty-State-Komponenten für Detailseiten
- Admin-Tabellenmuster
- DashboardWidgetShell als offizielles Widget-Pattern
- Sticky-Footer-Regel für Full-Bleed-Detailseiten
- RelationPanel- und LinkDialog-Row-Muster

Diese Phase kann schrittweise je Domäne erfolgen.

### Phase 4: Drittanbieter- und Spezialflächen dokumentieren

Ziel: Ausnahmen bewusst machen, statt sie als stille Drift im Code zu behalten.

Dokumentieren:

- FullCalendar-Overrides
- RichText/Tiptap-Typografie
- TLDraw-Einbettung
- Farbswatches und Katalogfarben
- Drag-and-drop-Styles
- ProgressBar/Toast-Laufzeitwerte

Diese Phase verhindert, dass notwendige Spezialfälle später mit echten Regelverstößen verwechselt werden.

## 13. Vorgeschlagene zukünftige Codex-Regeln

Diese Regeln sollten später in die visuelle Richtlinie oder in eine zentrale UI-Guidelines-Referenz übernommen werden:

1. Bei jeder Frontend-Änderung zuerst vorhandene UI-Komponenten prüfen: `Button`, `Input`, `Select`, `FormField`, `Badge`, `Pill`, `ItemCard`, `ItemRow`, `Section`, `EmptyState`, `Modal`, `TabBar`, `FilterChips`, `ViewToggle`, `SearchInput`.
2. Keine neuen Raw-Farbklassen verwenden. Neue Farbe nur über `theme.css` und `tailwind.config.ts`.
3. Kein neues `rounded-2xl`, `rounded-3xl`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`.
4. `rounded-full` nur für Avatar, ProgressBar, Farbswatch, kleine Statuspunkte und die Detail-Header-Sonderzone.
5. Badge und Pill niemals `rounded-full`; beide nutzen `rounded-md`.
6. Formulareingaben immer über `FormField` plus `Input`/`Select`/definierte Control-Komponente. Checkbox- und Toggle-Zeilen brauchen ein benanntes Pattern.
7. Seitenüberschriften auf Übersichtsseiten immer über `PageHeader` oder exakt dieselbe Struktur.
8. Inline-Styles nur für datengetriebene Katalogfarben, technische Layoutwerte, Fortschritt, Animation oder Drittanbieterintegration.
9. Arbitrary Textgrößen nur, wenn die Richtlinie sie nennt; neue `text-[...]`-Klassen sind begründungspflichtig.
10. Neue Dashboard-, Admin-, Wiki- oder Kalenderflächen müssen vor lokaler Klassendefinition prüfen, ob ein vorhandenes Pattern reicht.
11. Drittanbieter-Overrides müssen in `styles.css` klar als solche erkennbar bleiben und Tokens verwenden, soweit technisch möglich.
12. Jede neue visuelle Ausnahme wird in der Designrichtlinie benannt, bevor sie mehrfach verwendet wird.

## 14. Offene Designentscheidungen

Diese Punkte sind noch nicht rein technisch entscheidbar:

| Frage | Warum relevant | Empfohlener Default |
|---|---|---|
| Soll `text-muted` als Alias existieren oder verboten werden? | Aktuell undefiniert, aber semantisch nützlich | Nicht definieren, stattdessen `text-steel-500` verwenden |
| Sind Katalogfarben in FilterChips erlaubt? | Aktivsignal kann vom Steel-System abweichen | Erlauben, aber nur bei fachlichen Status-/Kategorie-Filtern |
| Sind Farbswatches `rounded-full` erlaubt? | Swatches sind keine Labels oder Buttons im klassischen Sinn | Ja, ausdrücklich als Ausnahme aufnehmen |
| Darf `rounded-xl` für Sticky-Footer verwendet werden? | Aktuell in Feature/Wiki vorhanden | Nein, Standard `rounded-lg`, außer Detail-Header-Kontext |
| Soll es eine zentrale `DataTable` geben? | Adminseiten duplizieren Tabellenklassen | Ja, aber erst nach Phase 1 |
| Soll `shadow-steel-icon` offiziell werden? | Token existiert, Richtlinie nennt ihn nicht | Entweder dokumentieren oder ersetzen |

## 15. Abnahmekriterien für spätere Korrekturen

Eine spätere Design-Vereinheitlichung gilt erst als abgeschlossen, wenn:

- keine verbotenen Raw-Farbklassen mehr in `apps/web/src` vorkommen,
- `text-muted` entweder definiert oder vollständig ersetzt ist,
- `rounded-2xl` und `rounded-t-2xl` aus `apps/web/src` entfernt sind,
- Badge/Pill/Count-Badges den Radius-Regeln folgen,
- Input und Select denselben Radius verwenden,
- raw Shadow-Klassen entfernt oder ausdrücklich erlaubt sind,
- rohe `<label>` nur noch in dokumentierten Checkbox-/Toggle-/Search-Ausnahmen vorkommen,
- zentrale Komponenten mit der Richtlinie übereinstimmen,
- Spezialflächen wie FullCalendar, RichText, TLDraw, Farbswatches und Drag-and-drop als Ausnahmen dokumentiert sind.

## 16. Empfohlene nächste Analyseartefakte

Für eine weiter vertiefende, iterative Analyse sind diese Folgeartefakte sinnvoll:

1. `design-abweichungen-phase-1.md`: konkrete Fundstellenliste für mechanische Korrekturen.
2. `design-komponenten-katalog.md`: verbindlicher Katalog der zentralen UI-Komponenten mit Soll-/Ist-Klassen.
3. `design-ausnahmen.md`: erlaubte Sonderfälle für Drittanbieter, Katalogfarben, Farbswatches und Runtime-Styles.
4. `design-pruefskript-konzept.md`: Konzept für einen statischen Check gegen verbotene Klassen.

Die wichtigste nächste praktische Arbeit wäre Phase 1, weil sie wenig Produktentscheidung erfordert und die sichtbare Inkonsistenz stark reduziert.
