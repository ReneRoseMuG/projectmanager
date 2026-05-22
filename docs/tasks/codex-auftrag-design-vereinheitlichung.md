# Codex-Auftrag: Design-Vereinheitlichung

**Grundlage:** `docs/tasks/design-richtlinien-visuell.md`  
**Bestandsaufnahme:** `docs/tasks/design-bestandsaufnahme-frontend.md`  
**Branch:** vor Beginn einen neuen Branch anlegen

---

## Überblick

Dieser Auftrag setzt alle Abweichungen aus der Bestandsaufnahme in einem einzigen Branch um. Es wird kein neues Feature gebaut und keine Logik verändert — ausschließlich Tailwind-Klassen, Komponenten-Struktur und Dateinamen werden korrigiert.

**Ausnahme: Punkt 2 (`text-muted`) erfordert eine Zwischenabstimmung mit dem Auftraggeber.** Siehe Ablauf.

---

## Ablauf

### Schritt 1 — `text-muted` analysieren (vor allem anderen)

Suche alle Vorkommen von `text-muted` in `apps/web/src` und erstelle eine Auflistung im folgenden Format. Noch nichts ersetzen.

```
Datei: components/ui/PageHeader.tsx
Zeile: 12
Kontext: <p className="text-muted">...</p>
Textinhalt oder Prop-Name: subtitle / "Projektübersicht"
```

Liste alle Fundstellen vollständig auf. Warte auf Freigabe des Auftraggebers bevor du `text-muted` anfasst.

### Schritt 2 — Alle übrigen Punkte umsetzen

Setze alle folgenden Punkte vollständig um, während du auf die Rückmeldung zu `text-muted` wartest.

### Schritt 3 — `text-muted` nach Freigabe umsetzen

- Freigabe "ersetzen" → `text-muted` durch `text-steel-500`
- Freigabe "entfernen" → Text-Element oder Prop vollständig entfernen

---

## A — Token und Farben

### A1 — Raw Slate-Farben ersetzen

Ersetze in allen Dateien unter `apps/web/src`:

| Von | Nach |
|---|---|
| `text-slate-400` | `text-steel-400` |
| `text-slate-500` | `text-steel-500` |
| `text-slate-600` | `text-steel-600` |
| `text-slate-700` | `text-steel-700` |
| `bg-slate-50` | `bg-steel-50` |
| `bg-slate-100` | `bg-steel-100` |

Keine Ausnahmen. Alle Vorkommen werden ersetzt, auch in `styles.css`, `Label.tsx` und Toast-Komponenten.

### A2 — `text-muted` (nach Freigabe, siehe Schritt 3)

### A3 — Raw Schatten-Klassen ersetzen

Kontextbezogene Ersetzung:

| Fundstelle | Von | Nach |
|---|---|---|
| Sidebar NavLink aktiv | `shadow-md` | `shadow-panel` |
| Sidebar Logo-Badge | `shadow-lg` | `shadow-steel-icon` |
| ItemRow Hover | `hover:shadow-md` | `hover:shadow-panel` |
| TagPicker Dropdown | `shadow` | `shadow-panel` |

Prüfe ob weitere raw Schatten-Klassen in `apps/web/src` vorkommen und ersetze analog. `styles.css` Drittanbieter-Blöcke nicht anfassen.

---

## B — Border-Radius

### B1 — `rounded-2xl` und `rounded-t-2xl` entfernen

| Von | Nach | Betroffene Komponenten |
|---|---|---|
| `rounded-2xl` | `rounded-lg` | Modal, ConfirmDialog, ItemCard, EmptyState, GlobalSearch, Error/404/403-Seiten |
| `rounded-t-2xl` | `rounded-t-lg` | ItemCard Akzentstreifen |

ItemCard: Akzentstreifen und Card-Container müssen synchron geändert werden.

### B2 — Badge, Pill und TabBar-Count

| Komponente | Von | Nach |
|---|---|---|
| `Badge` | `rounded-full` | `rounded-md` |
| `Pill` | `rounded-full` | `rounded-md` |
| `StatusPill` Button-Trigger | `rounded-full` | `rounded-md` |
| TabBar Count-Badge | `rounded-full` | `rounded` |

`rounded-full` auf Avatar, ProgressBar, Farbswatches, kleine Statuspunkte und im Detail-Header-Kontext bleibt unverändert.

### B3 — Input Radius angleichen

| Komponente | Von | Nach |
|---|---|---|
| `Input` | `rounded-lg` | `rounded-md` |

### B4 — Section und weitere Container

| Komponente | Von | Nach |
|---|---|---|
| Section (nicht-fill) | `rounded-xl` | `rounded-lg` |
| ConfirmDialog Icon-Container | `rounded-xl` | `rounded-md` |
| EmptyState Icon-Container | `rounded-2xl` | `rounded-lg` |
| AttachmentPreview Card | `rounded-xl` / `rounded-2xl` | `rounded-lg` |
| GlobalSearch Container | `rounded-2xl` | `rounded-lg` |
| Sticky-Footer in Feature/Wiki | `rounded-xl` | `rounded-lg` |

### B5 — DetailModal Subtitle-Badge

| Komponente | Von | Nach |
|---|---|---|
| Subtitle-Badge im Detail-Header | `rounded-full` | `rounded-md` |

---

## C — Komponenten-Struktur

### C1 — ViewToggle Aktivzustand

| Von | Nach |
|---|---|
| `border-2 border-ink` | `bg-steel-700 text-white border-steel-700` |

Prüfe ob das Icon im aktiven Zustand `text-white` explizit benötigt.

### C2 — Button-Variant `inverted`

Definiere einen neuen Variant `inverted` in `Button.tsx`:  
Weiße Füllung, `text-steel-700`, für Einsatz auf dunklem (`steel`-) Hintergrund.

Ersetze danach alle Ad-hoc-`className`-Farb-Overrides in `EmptyState` first-run durch `variant="inverted"`.

### C3 — `SegmentedControl` Option-Radius

| Von | Nach |
|---|---|
| `rounded-lg` auf Optionen | `rounded-md` |

Wrapper bleibt `rounded-xl`.

### C4 — `Label.tsx` Token-Verstoß

`Label.tsx` verwendet `text-slate-700` — wird durch A1 abgedeckt, aber prüfe zusätzlich ob das Arbitrary-Tracking `tracking-[0.04em]` durch einen Standard-Tailwind-Wert ersetzt werden kann.

---

## D — Formulare und rohe `<label>`

Formulareingaben mit sichtbarer Beschriftung müssen über `<FormField>` + `<Label>` laufen.

Folgende Bereiche haben noch rohe `<label>` die zu ersetzen sind:

- Login und SetupPasswordPage
- Admin UserDetailPage, RoleDetailPage
- CalendarPage EventForm
- WikiPageForm
- NoteEditor
- Settings / Preferences / CatalogManager

**Erlaubte Ausnahmen** (rohe `<label>` darf bleiben):
- Checkbox- und Toggle-Zeilen (semantischer Wrapper, kein Formularfeld)
- `SearchInput` Wrapper (semantischer Wrapper, kein Formularfeld-Label)
- `ProjectMilestoneFilterBar` kompakte Filterzeilen

---

## E — Page-Muster

### E1 — PageHeader konsequent einsetzen

`PageHeader.tsx` existiert bereits. Setze ihn auf allen Übersichtsseiten ein die noch lokale `<header>`-Blöcke mit `h1` + `p` manuell duplizieren. Betroffen sind vor allem Adminseiten und ältere Listenseiten.

### E2 — Detailseiten Zustandsanzeigen

Leere/Fehler-Zustände in Detailseiten verwenden häufig lokale Klassen wie `rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600`. Diese werden durch A1 farblich korrigiert. Prüfe zusätzlich ob `EmptyState` oder eine zentrale `ErrorState`-Komponente eingesetzt werden kann.

### E3 — Admin-Tabellen

Adminseiten (Users, Roles, Backup) duplizieren Tabellenklassen lokal. Vereinheitliche auf ein gemeinsames Tabellenmuster mit:
- Header: `bg-steel-50 text-xs font-semibold uppercase text-steel-500`
- Zeilen: `border-b border-line text-sm`
- Leerzustand: `EmptyState variant="tinted"`

---

## F — Drittanbieter dokumentieren (kein Code-Eingriff)

Diese Bereiche werden **nicht geändert**, aber als Ausnahmen in `styles.css` klar als Drittanbieter-Blöcke gekennzeichnet (Kommentar-Header):

- FullCalendar (`.fc-*`)
- ProseMirror / RichText (`.ProseMirror`, `.rich-text-*`)
- TLDraw (`.tl-container`)
- Toast und Skeleton Animationen

Format für Kommentar-Header:
```css
/* ─── Drittanbieter: FullCalendar ─────────────────────────────────────────── */
```

---

## Abnahmekriterien

- [ ] Keine `text-slate-*` oder `bg-slate-*` in `apps/web/src`
- [ ] `text-muted` vollständig ersetzt oder entfernt
- [ ] Kein `rounded-2xl` oder `rounded-t-2xl` in `apps/web/src`
- [ ] `Badge`, `Pill`, `StatusPill` verwenden `rounded-md`
- [ ] TabBar Count-Badge verwendet `rounded`
- [ ] `Input` und `Select` verwenden beide `rounded-md`
- [ ] `Section`, `AttachmentPreview`, `GlobalSearch`, Sticky-Footer verwenden `rounded-lg`
- [ ] Keine raw Schatten-Klassen in `apps/web/src` außerhalb von `styles.css`
- [ ] ViewToggle aktiver Zustand ist `bg-steel-700 text-white border-steel-700`
- [ ] Button-Variant `inverted` existiert und wird in `EmptyState` genutzt
- [ ] `SegmentedControl` Optionen verwenden `rounded-md`
- [ ] Formularfelder mit sichtbarer Beschriftung laufen über `FormField`
- [ ] `PageHeader` auf allen Übersichtsseiten eingesetzt
- [ ] Drittanbieter-Blöcke in `styles.css` mit Kommentar-Header gekennzeichnet
- [ ] `vitest run` grün
- [ ] `playwright test` grün

---

## Was nicht angefasst wird

- Backend, API, Datenmodell, Permissions
- Logik, Verhalten, Datenbindung
- FullCalendar, TLDraw, ProseMirror Styles (außer Kommentar-Header)
