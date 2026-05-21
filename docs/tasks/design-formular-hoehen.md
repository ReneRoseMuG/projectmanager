# Codex-Auftrag: Formular-Höhen vereinheitlichen (DatePicker, Select, Checkbox-Labels)

## Aufgabenbeschreibung

`Input` ist `h-11` (44 px). `DatePicker` ist `h-10` (40 px). `Select` ist `h-10`.
In Formularen, wo diese Elemente nebeneinander stehen, sind sie vertikal unausgerichtet.

---

## Bestandsaufnahme – Ist-Zustand

Lies vor Beginn alle aufgeführten Dateien.

| Datei | Ist-Höhe | Soll-Höhe |
|---|---|---|
| `components/ui/DatePicker.tsx` | `h-10` | `h-11` |
| `components/ui/Select.tsx` | `h-10` | `h-11` |
| `components/settings/CatalogManager.tsx` | Checkbox-Label `h-10` | `h-11` |
| `components/ui/Input.tsx` | `h-11` ✅ | — |
| `pages/SettingsPreferencesPage.tsx` | Checkbox-Label `h-11` ✅ | — |

---

## Änderungen im Detail

### 1. DatePicker: `h-10` → `h-11`, `w-full` ergänzen

**Datei:** `apps/web/src/components/ui/DatePicker.tsx`

**Ist:**
```tsx
<input
  type={mode}
  className={`h-10 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
  {...props}
/>
```

**Soll:**
```tsx
<input
  type={mode}
  className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`}
  {...props}
/>
```

---

### 2. Select: `h-10` → `h-11`, `w-full` ergänzen

**Datei:** `apps/web/src/components/ui/Select.tsx`

**Ist:**
```tsx
<select className={`h-10 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`} ...>
```

**Soll:**
```tsx
<select className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10 ${className}`} ...>
```

---

### 3. CatalogManager: Checkbox-Label `h-10` → `h-11`

**Datei:** `apps/web/src/components/settings/CatalogManager.tsx`

Suche im Code nach `h-10` im Kontext des Checkbox-Labels und ersetze durch `h-11`.

**Ist:**
```tsx
<label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700">
```

**Soll:**
```tsx
<label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700">
```

---

### 4. Visuelle Prüfung

Nach den Änderungen diese Stellen im Browser prüfen:

- `ProjectForm.tsx` – Zeitraum-Section mit zwei DatePicker-Feldern
- `CatalogManager.tsx` – Formularzeile: Key, Label, Sortierung, Checkbox, Button
- Alle Stellen, wo `Select` neben anderen Formularfeldern steht

---

## Abnahmekriterien

- [ ] `DatePicker` ist `h-11` und `w-full`
- [ ] `Select` ist `h-11` und `w-full`
- [ ] Checkbox-Label in `CatalogManager` ist `h-11`
- [ ] In der Zeitraum-Section des Projektformulars stehen beide DatePicker auf gleicher Höhe
- [ ] In `CatalogManager` stehen alle Formularfelder einer Zeile auf gleicher Höhe
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/ui/DatePicker.tsx`
- `apps/web/src/components/ui/Select.tsx`
- `apps/web/src/components/settings/CatalogManager.tsx`
- `apps/web/src/components/projects/ProjectForm.tsx` (nur zur Prüfung lesen)
