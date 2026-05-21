# Codex-Auftrag: StatusPill-Farben nach Zustand differenzieren

## Aufgabenbeschreibung

`StatusPill` zeigt alle „offenen" Zustände einheitlich grün (`bg-fern`). Das bedeutet:
Tickets mit Status „Offen", „In Bearbeitung" und „In Review" sehen alle gleich aus.
Der Fortschritt ist nicht auf einen Blick erkennbar.

Diese Aufgabe erweitert `StatusPill` um eine Farb-Map für bekannte Status-Keys.

---

## Bestandsaufnahme – Ist-Zustand

Lies vor Beginn alle aufgeführten Dateien.

**Datei:** `apps/web/src/components/ui/StatusPill.tsx`

```tsx
export function StatusPill({ kind, value }: StatusPillProps) {
  const catalogs = useCatalogs();
  const entry = catalogEntriesByKind(catalogs.entries, kind).find((item) => item.key === value);
  return <Pill tone={entry?.isClosed ? "steel" : "fern"}>{entry?.label ?? value}</Pill>;
}
```

Alle nicht-geschlossenen Status → `tone="fern"` (Grün).

**Verfügbare Töne in `Pill.tsx`:** `fern | tangerine | violet | crimson | steel | mustard`

---

## Lösung: Statische Farb-Map für bekannte Status-Keys

### Neue Datei: `apps/web/src/utils/statusTones.ts`

```ts
import type { PillTone } from "../components/ui/Pill";

/**
 * Bekannte Status-Keys und ihr Standard-Farbton.
 * Unbekannte Keys fallen zurück auf "fern" (offen) oder "steel" (geschlossen).
 */
export const statusKeyTones: Record<string, PillTone> = {
  // Arbeitsstatus (workStatus)
  active:       "fern",
  in_progress:  "tangerine",
  in_review:    "mustard",
  on_hold:      "steel",
  done:         "steel",
  archived:     "steel",

  // Ticket-Status
  open:         "fern",
  resolved:     "fern",
  closed:       "steel",

  // Feature-Status
  planned:      "violet",
  development:  "tangerine",
  testing:      "mustard",
  released:     "steel",
};
```

---

### Änderung in `StatusPill.tsx`

```tsx
import type { PillTone } from "./Pill";
import { statusKeyTones } from "../../utils/statusTones";

export function StatusPill({ kind, value }: StatusPillProps) {
  const catalogs = useCatalogs();
  const entry = catalogEntriesByKind(catalogs.entries, kind).find((item) => item.key === value);

  const tone: PillTone = entry?.isClosed
    ? "steel"
    : (statusKeyTones[value] ?? "fern");

  return <Pill tone={tone}>{entry?.label ?? value}</Pill>;
}
```

**Logik:**
1. Wenn `isClosed === true` → immer `steel` – Katalog-Regel hat Vorrang
2. Wenn Status-Key in der Map → Farbe aus der Map
3. Sonst → `fern` (bisheriges Standardverhalten, sicherer Fallback)

---

## Farb-Bedeutung für den Anwender

| Ton | Farbe | Semantik |
|---|---|---|
| `fern` | Grün | Startzustand, bereit, offen |
| `tangerine` | Orange | In Arbeit, aktiv bearbeitet |
| `mustard` | Gelb | Warte-/Prüfzustand (Review, Testing) |
| `violet` | Lila | Geplant, konzeptionell |
| `steel` | Grau | Abgeschlossen, archiviert, pausiert |

---

## Abnahmekriterien

- [ ] Tickets mit Status „In Bearbeitung" / `in_progress` zeigen orangefarbenen Pill
- [ ] Tickets mit Status „In Review" / `in_review` zeigen gelben Pill
- [ ] Tickets mit Status „Offen" / `open` zeigen weiterhin grünen Pill
- [ ] Status mit `isClosed === true` zeigen grauen Pill – unabhängig vom Key
- [ ] Unbekannte Status-Keys (vom Anwender selbst angelegt) fallen zurück auf `fern` oder `steel`
- [ ] Die Datei `apps/web/src/utils/statusTones.ts` existiert
- [ ] Keine Änderungen an der Datenbank oder an Shared Types
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/ui/StatusPill.tsx`
- `apps/web/src/components/ui/Pill.tsx`
- `apps/web/src/utils/` (neue Datei `statusTones.ts` anlegen)
- `packages/shared-types/src/` (CatalogEntry-Typ – nur lesen, nicht ändern)
