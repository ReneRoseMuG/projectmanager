# Design-Review: Befund-Report
**Projekt:** Projekt Manager — `apps/web`  
**Datum:** 2026-05-17  
**Grundlage:** Codex-Großauftrag (codex-design-system-auftrag.md) + Mockups (Designstudie-2)

---

## Gesamtbewertung

Der Codex-Auftrag wurde strukturell weitgehend umgesetzt: Alle neuen Atom- und Molekül-Komponenten wurden erstellt, das Token-System ist vorhanden, die Domain-Objekte wurden auf die neuen Templates umgestellt. Es gibt jedoch **systematische Style-Abweichungen** zum Mockup sowie **einzelne Implementierungslücken** die Korrekturen erfordern.

---

## Teil A — Style/Design-Abweichungen zum Mockup

### A1 · KRITISCH · Focus-Farbe: Grün statt Steelblue (7 Dateien)

**Problem:** Alle interaktiven Felder nutzen `focus:border-fern` + `focus:ring-fern/15`. Das Mockup definiert explizit steelblue als Focus-Farbe.

**Mockup-Definition (styles.css):**
```css
.field input:focus { border-color: var(--steel-600); box-shadow: 0 0 0 4px rgba(46, 89, 132, 0.10); }
```

**Korrekte Tailwind-Klassen:** `focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10`

**Betroffene Dateien:**
| Datei | Zeile | Aktuell |
|---|---|---|
| `components/ui/Input.tsx` | 8 | `focus:border-fern focus:ring-fern/15` |
| `components/ui/RichTextEditor.tsx` | 33 | `focus:border-fern focus:ring-fern/15` |
| `components/ui/Select.tsx` | 11 | `focus:border-fern` (kein ring) |
| `components/ui/DatePicker.tsx` | 14 | `focus:border-fern` (kein ring) |
| `components/tasks/SubtaskList.tsx` | 73 | `focus:border-fern focus:ring-fern/15` |
| `components/tags/TagPicker.tsx` | 60 | `focus:border-fern` (kein ring) |
| `components/imports/WikiImportPanel.tsx` | 41 | `focus:border-fern` (kein ring) |

---

### A2 · KRITISCH · TabBar: Aktive Farbe Grün statt Steelblue

**Problem:** Der aktive Tab-Indikator und -Text sind grün (`border-fern text-ink`). Das Mockup zeigt Steelblue.

**Mockup-Definition:**
```css
.mtab.active { color: var(--steel-700); border-bottom-color: var(--steel-700); }
.mtab.active .cnt { background: var(--steel-700); color: var(--white); }
```

**Datei:** `components/ui/TabBar.tsx`, Zeile 27  
**Aktuell:** `border-fern text-ink` / `bg-fern/10 text-fern`  
**Korrekt:** `border-steel-700 text-steel-700` / `bg-steel-700 text-white`

---

### A3 · KRITISCH · Button primary: Hover springt auf Grün

**Problem:** Der Primary-Button wechselt beim Hover von Steel-900 auf Grün (`hover:bg-fern`). Das wirkt inkonsistent und widerspricht dem durchgehend steelblauen Farbsystem.

**Datei:** `components/ui/Button.tsx`, Zeile 15  
**Aktuell:** `bg-steel-900 text-white hover:bg-fern`  
**Korrekt:** `bg-steel-700 text-white hover:bg-steel-600`

> Nebeneffekt: Primary-Buttons sind mit `bg-steel-900` sehr dunkel (fast schwarz). Das Mockup zeigt `steel-700` (#2E5984) als Primary-Grundfarbe.

---

### A4 · MITTEL · Modal-Header Gradient: Zu dunkel

**Problem:** DetailModal und FormModal nutzen einen Gradienten von `steel-900` bis `steel-700` (fast Schwarz → sehr dunkles Blau). Das Mockup zeigt einen deutlich helleren, mittelblauen Gradienten.

**Mockup-Definition:**
```css
.mhead { background: linear-gradient(135deg, var(--steel-700) 0%, var(--steel-600) 100%); }
```

**Tailwind-Äquivalent:** `bg-gradient-to-br from-steel-700 to-steel-600`

**Betroffene Dateien:**
- `components/ui/DetailModal.tsx`, Zeile 26: `from-steel-900 via-steel-800 to-steel-700`
- `components/ui/FormModal.tsx`: `from-steel-900 via-steel-800 to-steel-700`

---

### A5 · MITTEL · Modal-Header: Fehlendes radiales Licht-Overlay

**Problem:** Das Mockup hat in allen Modal-Headern ein dekoratives radiales Pseudo-Element (Licht-Reflex oben rechts). Im Code fehlt dies komplett.

**Mockup-Definition:**
```css
.mhead::before {
  content: ""; position: absolute; top: -40%; right: -10%;
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%);
}
```

**Betroffene Dateien:** `DetailModal.tsx`, `FormModal.tsx`  
**Fix:** `overflow-hidden` ist schon gesetzt — ein `<div>` mit `absolute` + `radial-gradient` via Inline-Style oder `before:`-Pseudo-Element hinzufügen.

---

### A6 · MITTEL · SegmentedControl: Default Active-Color ist Grün

**Problem:** Wenn `activeClassName` nicht gesetzt wird, zeigt der aktive Segment-Button einen grünen Hintergrund (`data-[active=true]:bg-fern`). Das Mockup nutzt Steelblue als Default für Status-Segmente.

**Datei:** `components/ui/SegmentedControl.tsx`, Zeile 20  
**Aktuell:** `data-[active=true]:bg-fern data-[active=true]:text-white`  
**Korrekt:** `data-[active=true]:bg-steel-700 data-[active=true]:text-white`

---

### A7 · GERING · Form-Labels: Nicht uppercase

**Problem:** Das Mockup zeigt Form-Labels konsistent in Kapitälchen-Stil. Die `Label`-Komponente ist lowercase und größer.

**Mockup-Definition:**
```css
.field { font-size: 11px; font-weight: 700; color: var(--slate-700); text-transform: uppercase; letter-spacing: 0.04em; }
```

**Datei:** `components/ui/Label.tsx`  
**Aktuell:** `text-sm font-semibold text-ink`  
**Mockup-konsistentes Äquivalent:** `text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700`

> Hinweis: Der Auftrag (Schritt 1c) schreibt `text-sm font-semibold text-ink` vor — dies ist ein Widerspruch zwischen Auftrag und Mockup. Der Mockup sollte hier Vorrang haben.

---

### A8 · GERING · TagPicker: Falsche Farbpalette

**Problem:** Der TagPicker nutzt eine eigene, fremde Farbpalette (slate, indigo, emerald usw.) die nicht zum Design-System gehört.

**Datei:** `components/tags/TagPicker.tsx`, Zeile 13  
**Aktuell:** `["#94a3b8", "#6366f1", "#0f766e", "#e76f51", "#d99a21", "#6a994e", "#8a4fff", "#2563eb"]`  
**Korrekt (Design-System-Farben):**
```ts
const colors = [
  "var(--color-steel-600)", "var(--color-crimson)", "var(--color-tangerine)",
  "var(--color-mustard)", "var(--color-fern)", "var(--color-teal)",
  "var(--color-violet)", "var(--color-magenta)"
];
```

---

## Teil B — Implementierungslücken (Auftrag nicht vollständig erfüllt)

### B1 · KRITISCH · Schritt 0: Inline Hex-Werte noch in TSX-Dateien (11 Dateien)

**Problem:** Schritt 0 des Auftrags fordert, alle Hex-Werte aus TSX-Dateien zu entfernen. Es sind noch zahlreiche Stellen verblieben.

**Befund: `grep -r "#[0-9A-Fa-f]{6}" apps/web/src/*.tsx`**

| Datei | Hex-Werte | Art |
|---|---|---|
| `calendar/CalendarView.tsx` | `#94B2D1`, `#2E5984`, `#F4F7FA`, `#0F2542`, `#ED8C3A`, `#2F8E96`, `#4D9359` | 7 Farb-Werte in JS-Objekt |
| `ui/Badge.tsx` | `text-[#8A6B05]` | Mustard-Kontrast |
| `ui/Pill.tsx` | `bg-[#C8A21B]` | Mustard-Pill |
| `projects/ProjectCard.tsx` | `#2E5984` | Fallback-Farbe |
| `projects/ProjectInlineForm.tsx` | 9× Hex-Swatches | Farbpalette |
| `tags/TagManager.tsx` | 8× Hex-Palette + `[#d558aa]` | Palette + Gradient |
| `tags/TagPicker.tsx` | 8× Hex-Farben | Farbpalette |
| `ui/ColorPicker.tsx` | 9× Hex-Swatches | defaultSwatches |
| `notes/NoteEditor.tsx` | `[#8459d9]` | Gradient |
| `wiki/WikiPageForm.tsx` | `[#3fa9b1]` | Gradient |
| `features/FeatureDetail.tsx` | `[#6E5800]` | Mustard-Kontrast |
| `usecases/UseCaseForm.tsx` | `[#6E5800]` | Mustard-Kontrast |

**Fix-Strategie:**
- `CalendarView.tsx`: JS-Farbkonstanten auf `getComputedStyle(document.documentElement).getPropertyValue('--color-...')` oder auf CSS-Vars im Canvas-Context umstellen
- Swatch-Arrays: Hex durch die entsprechenden CSS-Custom-Property-Werte ersetzen
- Mustard-Kontrast `#6E5800` / `#8A6B05`: Als `--color-mustard-dark: #6E5800` in `theme.css` hinzufügen und via `var()` referenzieren
- Gradient-Hex (`#8459d9`, `#3fa9b1`, `#d558aa`): Tailwind-Klassen wie `to-violet/70`, `to-teal/80` nutzen

---

### B2 · KRITISCH · Schritt 4: `TaskDetail` nutzt `sectionClass` statt `<Section>`-Komponente (9×)

**Problem:** `TaskDetail.tsx` definiert eine lokale Konstante `sectionClass` und verwendet sie für alle 9 Sections, statt die in Schritt 4 erstellte `<Section>`-Komponente zu verwenden. Das ist ein direkter Verstoß gegen den Auftrag und erzeugt inkonsistente Styles (`shadow-card` statt `shadow-panel`).

**Datei:** `components/tasks/TaskDetail.tsx`  
**Zeile ~73:** `const sectionClass = "rounded-lg border border-line bg-white p-4 shadow-card";`

**Fix:** Alle `<section className={sectionClass}>` durch `<Section>` ersetzen. Die `sectionClass`-Konstante entfernen.

> Nebeneffekt: `shadow-card` ist ein nicht im Auftrag definierter Schatten-Token (`0 10px 28px rgba(31,43,56,0.06)`). `shadow-panel` wäre korrekt (`0 10px 28px rgba(15,37,66,0.08)`).

---

### B3 · MITTEL · Schritt 7c: Kanban-Spalten haben keinen `+`-Button

**Problem:** Schritt 7c fordert einen `+`-Button pro Kanban-Spalte mit einem `onAddItem(status)`-Callback. In der Implementierung gibt es nur den globalen `+`-Button in der Toolbar.

**Datei:** `components/ui/ListBoardView.tsx`, Board-Modus (Zeile ~55ff)

**Aktueller Stand:** Spalten-Header zeigt nur Titel + Item-Zähler, kein Add-Button.

**Fix:** `ListBoardViewProps` um `onAddToColumn?: (status: string) => void` erweitern. Im Spalten-Header einen Icon-Only-Button (`<Plus size={14} />`) rendern, der `onAddToColumn(column.value)` aufruft.

---

### B4 · MITTEL · Schritt 9/10: `ItemCard` öffnet bei jedem Klick (nicht nur Doppelklick)

**Problem:** `ItemCard.tsx` hat `onClick={onOpen}` UND `onDoubleClick={onOpen}`. Der Auftrag (Schritt 7a) sagt: "Doppelklick ruft `onOpen` auf". Der Einzelklick soll keine Navigation auslösen.

**Datei:** `components/ui/ItemCard.tsx`

**Aktuell:**
```tsx
<article onClick={onOpen} onDoubleClick={onOpen} ...>
```

**Fix:** `onClick={onOpen}` entfernen. Nur `onDoubleClick={onOpen}` behalten.

> Achtung: Edit- und Delete-Buttons haben bereits `event.stopPropagation()` — das wäre nach dem Fix nicht mehr nötig, sollte aber zur Sicherheit bleiben.

---

### B5 · MITTEL · Schritt 10c: `FeatureDetailPage` fehlen 2 Tabs

**Problem:** Die `FeatureDetailPage` hat nur 4 Tabs (`details`, `useCases`, `projects`, `comments`). Laut Auftrag (Schritt 10c) fehlen:

| Fehlender Tab | Inhalt laut Auftrag |
|---|---|
| **Aufgaben** | `RelationPanel<Task>` (Gegenrichtung) |
| **Dateien** | `AttachmentList` |

**Datei:** `pages/FeatureDetailPage.tsx`, Zeile ~29  
**Fix:** Zwei weitere Tab-Einträge hinzufügen + entsprechende Tab-Inhalte implementieren.

---

### B6 · GERING · Schritt 15: `shadow-card` Token nicht im Auftrag definiert

**Problem:** `theme.css` enthält `--shadow-card: 0 10px 28px rgba(31,43,56,0.06)` und `--shadow-steel-icon: 0 8px 20px rgba(46,89,132,0.3)` als zusätzliche Tokens. Diese waren nicht im Auftrag vorgesehen und sind konsistent zu dokumentieren.

**`tailwind.config.ts`** hat `"card"` und `"steel-icon"` im `boxShadow`-Abschnitt.

**Empfehlung:** In `docs/design-system.md` dokumentieren (Schritt 15 fordert diese Datei ohnehin).

---

### B7 · GERING · `docs/design-system.md` fehlt

**Problem:** Schritt 15 fordert die Erstellung von `docs/design-system.md` als Komponentenübersicht. Diese Datei existiert nicht.

---

## Zusammenfassung

| ID | Schwere | Kategorie | Titel |
|---|---|---|---|
| A1 | 🔴 Kritisch | Style | Focus-Farbe: fern statt steel-600 (7 Dateien) |
| A2 | 🔴 Kritisch | Style | TabBar: aktive Farbe fern statt steel-700 |
| A3 | 🔴 Kritisch | Style | Button primary: hover springt auf grün |
| A4 | 🟠 Mittel | Style | Modal-Header Gradient zu dunkel |
| A5 | 🟠 Mittel | Style | Modal-Header: fehlendes radiales Overlay |
| A6 | 🟠 Mittel | Style | SegmentedControl: Default active-Color ist grün |
| A7 | 🟡 Gering | Style | Form-Labels: nicht uppercase |
| A8 | 🟡 Gering | Style | TagPicker: falsche Farbpalette |
| B1 | 🔴 Kritisch | Lücke | Inline Hex-Werte in 11 TSX-Dateien |
| B2 | 🔴 Kritisch | Lücke | TaskDetail: sectionClass statt `<Section>` (9×) |
| B3 | 🟠 Mittel | Lücke | Kanban: kein `+`-Button pro Spalte |
| B4 | 🟠 Mittel | Lücke | ItemCard: öffnet bei Einzelklick (soll nur DblClick) |
| B5 | 🟠 Mittel | Lücke | FeatureDetailPage: Tabs Aufgaben + Dateien fehlen |
| B6 | 🟡 Gering | Lücke | shadow-card Token undokumentiert |
| B7 | 🟡 Gering | Lücke | docs/design-system.md fehlt |

**Kritische Befunde:** 5 · **Mittlere:** 6 · **Geringe:** 4
