# Codex-Auftrag: Seiten-Header vereinheitlichen

## Aufgabenbeschreibung

Alle Listenansichten der App haben unterschiedliche Seitenköpfe: verschiedene
`font-weight`-Klassen, teilweise Icons, wechselnde Untertitel-Inhalte, und vor allem:
die primäre Erstell-Aktion liegt mal im Header, mal tief im Board-Toolbar-Bereich.

Diese Aufgabe vereinheitlicht den Header aller Listenseiten nach einem verbindlichen Muster.

**Keine API- oder Datenbankänderungen.** Betroffen sind ausschließlich Page-Komponenten
und die jeweiligen ListBoardView-Adapter.

---

## Verbindliches Muster (Soll-Zustand)

```tsx
<header className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 className="text-2xl font-semibold text-ink">{seitenname}</h1>
    <p className="text-sm text-slate-500">{anzahl} Einträge</p>
  </div>
  <Button variant="primary" icon={<Plus size={17} />} onClick={handleCreate}>
    {aktionsLabel}
  </Button>
</header>
```

**Regeln:**
- `font-semibold` – immer (kein `font-bold`)
- Untertitel: aktuelle Anzahl der Einträge als `{n} Einträge` – immer
- Primäraktion: immer im Header oben rechts, nie doppelt (kein zweiter `+`-Button im Board-Toolbar)
- Kein Icon vor dem H1
- `text-slate-500` für den Untertitel

---

## Bestandsaufnahme – Ist-Zustand

Lies vor Beginn alle aufgeführten Dateien vollständig.

| Datei | H1-Gewicht | Untertitel | Primäraktion im Header |
|---|---|---|---|
| `pages/ProjectsPage.tsx` | `font-semibold` ✅ | Anzahl ✅ | ❌ fehlt |
| `pages/TicketsPage.tsx` | `font-semibold` ✅ | Anzahl ✅ | ❌ fehlt |
| `pages/FeaturesPage.tsx` | `font-semibold` ✅ | statischer Text ❌ | ❌ fehlt |
| `pages/CalendarPage.tsx` | `font-semibold` ✅ | Anzahl ✅ | ✅ vorhanden |
| `pages/WikiPage.tsx` | `font-semibold` ✅ | statischer Text ❌ | ✅ vorhanden |
| `pages/SettingsPreferencesPage.tsx` | `font-bold` ❌ | Anzahl ✅ | ❌ (korrekt – keine Aktion) |

---

## Änderungen im Detail

### 1. ProjectsPage – Primäraktion in Header

**Datei:** `apps/web/src/pages/ProjectsPage.tsx`

Button „Neues Projekt" mit `onClick={() => navigate("/projects/new")}` in den Header einfügen.
Untertitel: `text-slate-600` → `text-slate-500`.

Der bestehende `onCreate`-Handler in `ProjectListBoardView` bleibt erhalten – er wird für
den spaltenspezifischen `+`-Button in der Kanban-Ansicht benötigt.

Der globale `+`-Button in der ListBoardView-Toolbar muss für Projektlisten ausgeblendet werden.
Lösung: In `ListBoardView` den `onAdd`-Button nur rendern, wenn `showToolbarAdd` (Default: `true`)
gesetzt ist. `ProjectListBoardView` übergibt `showToolbarAdd={false}`.

Alternativ – einfacher: Den Board-Toolbar-Button nur rendern wenn **kein** `onAddToColumn`
übergeben wurde. Da Projektlisten `onAddToColumn` haben, entfällt der globale Button automatisch.
Entscheide nach Lesen der Dateien, welche Variante sauberer ist.

---

### 2. TicketsPage – Primäraktion in Header

**Datei:** `apps/web/src/pages/TicketsPage.tsx`

Analog zu Punkt 1. Button „Neues Ticket" in den Header.
`text-slate-600` → `text-slate-500`.

---

### 3. FeaturesPage – Primäraktion in Header, Untertitel mit Anzahl

**Datei:** `apps/web/src/pages/FeaturesPage.tsx`

**Ist:**
```tsx
<header className="grid gap-1">
  <div>
    <h1 className="text-2xl font-semibold text-ink">Features</h1>
    <p className="text-sm text-slate-600">Fachliche Features und Use Cases</p>
  </div>
</header>
```

**Soll:**
```tsx
<header className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 className="text-2xl font-semibold text-ink">Features</h1>
    <p className="text-sm text-slate-500">{features.features.length} Einträge</p>
  </div>
  <Button variant="primary" icon={<Plus size={17} />} onClick={() => navigate("/features/new")}>
    Neues Feature
  </Button>
</header>
```

---

### 4. WikiPage – Untertitel mit Anzahl

**Datei:** `apps/web/src/pages/WikiPage.tsx`

Button ist korrekt. Nur den Untertitel durch eine dynamische Seitenanzahl ersetzen.

Hilfsfunktion im selben File:

```ts
function countPages(nodes: WikiTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countPages(node.children), 0);
}
```

**Ist:**
```tsx
<p className="text-sm text-slate-600">Projektwissen und Dokumentation</p>
```

**Soll:**
```tsx
<p className="text-sm text-slate-500">
  {wiki.loading ? "" : `${countPages(wiki.tree)} Seiten`}
</p>
```

---

### 5. CalendarPage – `text-slate-600` → `text-slate-500`

**Datei:** `apps/web/src/pages/CalendarPage.tsx`

Nur Ton des Untertitels anpassen. Button ist korrekt.

---

### 6. SettingsPreferencesPage – `font-bold` → `font-semibold`, Icon entfernen

**Datei:** `apps/web/src/pages/SettingsPreferencesPage.tsx`

`font-bold` → `font-semibold`.
Den Icon-Block-Container (`<span className="flex h-11 w-11 ...">`) samt `SlidersHorizontal`-Icon entfernen.
`SlidersHorizontal` aus den Imports entfernen, sofern nicht anderweitig genutzt.

---

## Abnahmekriterien

- [ ] Alle sechs Seiten-Header folgen dem verbindlichen Muster
- [ ] Alle H1-Elemente verwenden `font-semibold`
- [ ] Alle Untertitel verwenden `text-slate-500` und zeigen eine aktuelle Anzahl
- [ ] Primär-Buttons erscheinen auf allen Listenansichten oben rechts im Header
- [ ] Auf Seiten ohne Erstell-Aktion (Präferenzen) ist kein Button vorhanden
- [ ] Kein doppelter `+`-Button (einmal im Header, einmal im Board-Toolbar)
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/pages/ProjectsPage.tsx`
- `apps/web/src/pages/TicketsPage.tsx`
- `apps/web/src/pages/FeaturesPage.tsx`
- `apps/web/src/pages/CalendarPage.tsx`
- `apps/web/src/pages/WikiPage.tsx`
- `apps/web/src/pages/SettingsPreferencesPage.tsx`
- `apps/web/src/components/ui/ListBoardView.tsx`
- `apps/web/src/components/projects/ProjectListBoardView.tsx`
- `apps/web/src/components/tickets/TicketListBoardView.tsx`
- `apps/web/src/components/features/FeatureListBoardView.tsx`
