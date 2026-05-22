# Codex-Auftrag: Design-Vereinheitlichung Phase 1

**Grundlage:** `docs/tasks/design-richtlinien-visuell.md`  
**Bestandsaufnahme:** `docs/tasks/design-bestandsaufnahme-frontend.md`  
**Branch:** vor Beginn einen neuen Branch anlegen

---

## Überblick

Phase 1 beseitigt die mechanisch klaren Regelverstöße aus der Bestandsaufnahme. Es wird kein neues Feature gebaut und keine Logik verändert — ausschließlich Tailwind-Klassen werden korrigiert. Alle sieben Punkte werden in einem Branch umgesetzt.

**Ausnahme: Punkt 2 (`text-muted`) erfordert eine Zwischenabstimmung mit dem Auftraggeber vor der Umsetzung.** Siehe Ablauf unten.

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

---

### Schritt 2 — Punkte 1 und 3–7 umsetzen

Setze die folgenden sechs Punkte vollständig um, während du auf die Rückmeldung zu `text-muted` wartest.

---

## Punkt 1 — Raw Slate-Farben ersetzen

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

---

## Punkt 3 — `rounded-2xl` und `rounded-t-2xl` entfernen

| Von | Nach | Betroffene Komponenten |
|---|---|---|
| `rounded-2xl` | `rounded-lg` | Modal, ConfirmDialog, ItemCard, EmptyState, GlobalSearch, Error/404/403-Seiten |
| `rounded-t-2xl` | `rounded-t-lg` | ItemCard Akzentstreifen |

Wichtig bei ItemCard: Akzentstreifen und Card-Container müssen synchron geändert werden.

---

## Punkt 4 — Badge, Pill und TabBar-Count Radius korrigieren

| Komponente | Von | Nach |
|---|---|---|
| `Badge` | `rounded-full` | `rounded-md` |
| `Pill` | `rounded-full` | `rounded-md` |
| `StatusPill` Button-Trigger | `rounded-full` | `rounded-md` |
| TabBar Count-Badge | `rounded-full` | `rounded` |

`rounded-full` auf Avatar, ProgressBar, Farbswatches und im Detail-Header-Kontext bleibt unverändert — diese sind in der Richtlinie als Ausnahmen definiert.

---

## Punkt 5 — Input Radius angleichen

| Komponente | Von | Nach |
|---|---|---|
| `Input` | `rounded-lg` | `rounded-md` |

Select bleibt unverändert (bereits `rounded-md`).

---

## Punkt 6 — Raw Schatten-Klassen ersetzen

Kontextbezogene Ersetzung — keine pauschale 1:1-Zuordnung:

| Fundstelle | Von | Nach |
|---|---|---|
| Sidebar NavLink aktiv | `shadow-md` | `shadow-panel` |
| Sidebar Logo-Badge | `shadow-lg` | `shadow-steel-icon` |
| ItemRow Hover | `hover:shadow-md` | `hover:shadow-panel` |
| TagPicker Dropdown | `shadow` | `shadow-panel` |

Prüfe ob weitere raw Schatten-Klassen in `apps/web/src` vorkommen und ersetze sie analog. `styles.css` Drittanbieter-Blöcke (FullCalendar, TLDraw) nicht anfassen.

---

## Punkt 7 — ViewToggle Aktivzustand

| Komponente | Von | Nach |
|---|---|---|
| `ViewToggle` aktiv | `border-2 border-ink` | `bg-steel-700 text-white border-steel-700` |

Prüfe ob das Icon im aktiven Zustand `text-white` explizit benötigt oder ob es geerbt wird.

---

### Schritt 3 — Punkt 2 nach Freigabe umsetzen

Nachdem der Auftraggeber die `text-muted`-Liste geprüft und pro Stelle entschieden hat:

- Freigabe "ersetzen" → `text-muted` durch `text-steel-500`
- Freigabe "entfernen" → Text-Element oder Prop vollständig entfernen

---

## Was nicht angefasst wird

- Backend, API, Datenmodell, Permissions, Tests (außer sicherstellen dass sie grün bleiben)
- `styles.css` Drittanbieter-Overrides (FullCalendar, TLDraw, ProseMirror) — außer Slate-Farben
- Phase-2-Punkte: Button-Variant `inverted`, `rounded-xl`-Bereinigung, rohe `<label>`, Inline-Style-Policy
- Phase-3-Punkte: PageHeader-Konsolidierung, Admin-Tabellen, Domain-Muster

---

## Abnahmekriterien

- [ ] Keine `text-slate-*` oder `bg-slate-*` in `apps/web/src`
- [ ] `text-muted` vollständig ersetzt oder entfernt (nach Freigabe)
- [ ] Kein `rounded-2xl` oder `rounded-t-2xl` in `apps/web/src`
- [ ] `Badge`, `Pill`, `StatusPill` verwenden `rounded-md`
- [ ] TabBar Count-Badge verwendet `rounded`
- [ ] `Input` verwendet `rounded-md`
- [ ] Keine raw Schatten-Klassen (`shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`) in `apps/web/src` außerhalb von `styles.css`
- [ ] ViewToggle aktiver Zustand ist `bg-steel-700 text-white border-steel-700`
- [ ] `vitest run` grün
- [ ] `playwright test` grün
