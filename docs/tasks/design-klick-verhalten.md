# Codex-Auftrag: Klick-Verhalten in Listen vereinheitlichen

## Aufgabenbeschreibung

In der Listenansicht (`ItemRow`) reagiert der Container auf `onDoubleClick`, aber das
Titelfeld innerhalb reagiert auf einfachen `onClick`. Einfacher Klick auf andere Bereiche
der Zeile macht nichts.

Der Anwender erwartet: **Einfacher Klick auf eine Zeile → Eintrag öffnet sich.**

In der Kartenansicht (`ItemCard`) gilt dieselbe Inkonsistenz: Doppelklick öffnet,
aber es gibt keinen einfachen Klick-Bereich außer dem Titel-Button.

---

## Bestandsaufnahme – Ist-Zustand

Lies vor Beginn alle aufgeführten Dateien vollständig.

| Datei | Problem |
|---|---|
| `components/ui/ItemRow.tsx` | `onDoubleClick` auf Container + `onClick` nur auf Titel-Button |
| `components/ui/ItemCard.tsx` | `onDoubleClick` auf Container – kein einfacher Click-Bereich |
| `components/ui/ActionMenu.tsx` | `stopPropagation` bereits korrekt – muss erhalten bleiben |
| `components/ui/PlanningItemCard.tsx` | delegiert an ItemCard/ItemRow – prüfen, ob eigene Handler vorhanden |

---

## Änderungen im Detail

### 1. ItemRow: Einfacher Klick auf die gesamte Zeile öffnet den Eintrag

**Datei:** `apps/web/src/components/ui/ItemRow.tsx`

**Ist:**
```tsx
<article
  className={`grid ${columns} items-center gap-4 ... ${onOpen ? "cursor-pointer" : ""}`}
  onDoubleClick={onOpen}
>
  ...
  <button type="button" className="min-w-0 text-left" onClick={onOpen}>
    <h3 ...>{title}</h3>
    ...
  </button>
  ...
</article>
```

**Soll:**
```tsx
<article
  className={`grid ${columns} items-center gap-4 ... ${onOpen ? "cursor-pointer" : ""}`}
  onClick={onOpen}
>
  ...
  <div className="min-w-0 text-left">
    <h3 ...>{title}</h3>
    ...
  </div>
  ...
</article>
```

**Details:**
- `onDoubleClick` entfällt, ersetzt durch `onClick` auf dem Container
- Der Titel-`button` wird zu einem `div` – er ist kein eigenständiger Klick-Bereich mehr
- `ActionMenu` und alle anderen interaktiven Elemente rufen `event.stopPropagation()` auf
  (bereits in `ActionMenu` implementiert) – bleibt erhalten

---

### 2. ItemCard: Einfacher Klick auf Karte öffnet den Eintrag

**Datei:** `apps/web/src/components/ui/ItemCard.tsx`

**Ist:**
```tsx
<article ... onDoubleClick={onOpen}>
```

**Soll:**
```tsx
<article ... onClick={onOpen}>
```

Einzige Änderung: `onDoubleClick` → `onClick`.

---

### 3. PlanningItemCard: Konsistenz prüfen

**Datei:** `apps/web/src/components/ui/PlanningItemCard.tsx`

Lesen und prüfen, ob eigene `onDoubleClick`-Handler existieren.
Durch die Änderungen in ItemCard und ItemRow wird PlanningItemCard automatisch korrekt.
Falls eigene Handler vorhanden: analog anpassen.

---

## Abnahmekriterien

- [ ] Einfacher Klick auf eine Zeile in der Listenansicht öffnet den Eintrag
- [ ] Einfacher Klick auf eine Karte in der Board-Ansicht öffnet den Eintrag
- [ ] Klick auf das ActionMenu öffnet das Menü, öffnet aber nicht den Eintrag
- [ ] Klick auf Badges, Pills oder andere Elemente in der Zeile löst keine Navigation aus
- [ ] Zeilen und Karten ohne `onOpen` reagieren nicht auf Klick
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/ui/ItemRow.tsx`
- `apps/web/src/components/ui/ItemCard.tsx`
- `apps/web/src/components/ui/PlanningItemCard.tsx`
- `apps/web/src/components/ui/ActionMenu.tsx`
