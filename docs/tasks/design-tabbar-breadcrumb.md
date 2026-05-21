# Codex-Auftrag: Tab-Zähler und Breadcrumb-Navigation verbessern

## Aufgabenbeschreibung

Zwei verwandte UI-Verbesserungen in TabBar und FormModal:

1. **Tab-Zähler mit Wert 0** sehen identisch aus wie Tabs mit Inhalt.
2. **Breadcrumb im FormModal** sieht aus wie eine klickbare Navigation, ist aber statischer Text.

---

## Teil A: Tab-Zähler – 0-Werte ausblenden

### Ist-Zustand

**Datei:** `apps/web/src/components/ui/TabBar.tsx`

```tsx
{typeof tab.count === "number" ? (
  <span className={`rounded-full px-2 py-0.5 text-xs ${
    selected ? "bg-steel-700 text-white" : "bg-shell text-slate-500"
  }`}>
    {tab.count}
  </span>
) : null}
```

### Soll-Zustand

Tabs mit `count === 0` zeigen kein Badge.

```tsx
{typeof tab.count === "number" && tab.count > 0 ? (
  <span className={`rounded-full px-2 py-0.5 text-xs ${
    selected ? "bg-steel-700 text-white" : "bg-shell text-slate-500"
  }`}>
    {tab.count}
  </span>
) : null}
```

**Einzige Änderung:** `typeof tab.count === "number"` → `typeof tab.count === "number" && tab.count > 0`

---

## Teil B: Breadcrumb im FormModal – Navigation-Anmutung entfernen

### Ist-Zustand

**Datei:** `apps/web/src/components/ui/FormModal.tsx`

```tsx
{breadcrumb.length > 0 ? (
  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
    {breadcrumb.map((item, index) => (
      <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
        {index > 0 ? <span>›</span> : null}
        <span>{item}</span>
      </span>
    ))}
  </div>
) : null}
```

Der `›`-Pfeilseparator signalisiert klickbare Navigation – der Inhalt ist aber statisch.

### Soll-Zustand

Punkt-Separator (`·`) statt Pfeil-Separator. Kein Navigations-Signal.

```tsx
{breadcrumb.length > 0 ? (
  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
    {breadcrumb.join(" · ")}
  </p>
) : null}
```

Die gesamte Breadcrumb wird als `<p>` mit Punkt-Separator dargestellt.
`text-white/60` statt `text-white/75` – etwas dezenter, da es jetzt klar kein Link ist.

---

## Abnahmekriterien

### Teil A
- [ ] Tabs mit `count={0}` zeigen kein Badge-Element
- [ ] Tabs mit `count > 0` zeigen das Badge wie bisher
- [ ] Tabs ohne `count`-Prop zeigen kein Badge

### Teil B
- [ ] Breadcrumb im FormModal-Header zeigt keinen `›`-Separator
- [ ] Breadcrumb-Text wirkt als Beschriftung, nicht als Navigation
- [ ] Auf weißem und steel-farbigem Hintergrund korrekt sichtbar

### Gesamt
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/ui/TabBar.tsx`
- `apps/web/src/components/ui/FormModal.tsx`
