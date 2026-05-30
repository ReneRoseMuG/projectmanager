# Codex-Auftrag: WikiPageForm Inline-Modus implementieren

**Parent:** MILE-25 — Redesign Wiki
**Datum:** 2026-05-29
**Aufgaben-ID:** TASK-141

---

## Ziel

`WikiPageForm.tsx` erhält einen `inline`-Modus: Wenn eine Seite im WikiTree ausgewählt wird, erscheint das vollständige Bearbeitungsformular direkt im rechten Inhaltsbereich — ohne Modal. Der Modal-Modus bleibt für „Neue Seite" erhalten. `WikiPageDetail.tsx` wird nach dieser Aufgabe nicht mehr benötigt (wird in TASK-142 entfernt).

## Hintergrund & Kontext

Aktuell zeigt `WikiPage.tsx` bei Seitenauswahl `WikiPageDetail`, eine separate Komponente mit einem „Metadaten bearbeiten"-Button, der das `WikiPageForm`-Modal öffnet. Inhalt und Metadaten sind dadurch auf zwei Schritte verteilt. Das neue Verhalten fasst beides zusammen: Seitenauswahl → sofort vollständiges Formular inline, alle Felder direkt editierbar.

Der dunkle Steel-Header des Modal-Formulars wird im Inline-Modus durch `PageHero variant="detail"` ersetzt, die einheitliche Detail-Header-Komponente der App.

Referenz `PageHero`: `apps/web/src/components/ui/PageHero.tsx`

## Aufgabe

### 1. `WikiPageForm.tsx` — neuer Prop `inline`

```ts
interface WikiPageFormProps {
  // ... bestehende Props ...
  inline?: boolean;
  onDelete?: (page: WikiPage) => void; // neu, nur im Inline-Modus relevant
}
```

### 2. `WikiPageForm.tsx` — Inline-Rendering

Wenn `inline === true`:
- Kein `<Modal>`-Wrapper
- Den bisherigen Steel-Header (`<header className="border-b border-steel-700 bg-gradient-to-br ...">`) ersetzen durch:

```tsx
<PageHero
  variant="detail"
  breadcrumb={["Wiki", parentPageTitle ?? "Root"]}
  title={title || (page ? "Wiki-Seite bearbeiten" : "Wiki-Seite anlegen")}
  actions={
    <>
      {page ? <CopyReferenceButton reference={String(page.id)} variant="hero" /> : null}
      {page && onDelete ? (
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white"
          aria-label="Seite löschen"
          title="Seite löschen"
          onClick={() => onDelete(page)}
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </>
  }
/>
```

`parentPageTitle` wird aus dem `tree` ermittelt: `flattenTree(tree).find(p => p.id === parentId)?.title ?? null`

- Das äußere `<form>`-Element bekommt `className="flex flex-col h-full"` (statt `max-h-[calc(100vh-64px)]`)
- Der Footer mit Speichern/Verwerfen bleibt erhalten
- `onOpenInTab`-Button entfällt im Inline-Modus (kein `onOpenInTab`-Prop im Inline-Aufruf)
- Der „Verwerfen"-Button im Footer ruft weiterhin `requestClose` auf (Dirty-Check bleibt)

### 3. `WikiPageForm.tsx` — Modal-Modus unverändert

Wenn `inline` nicht gesetzt oder `false`: Verhalten exakt wie bisher — `<Modal>`-Wrapper, Steel-Header, `max-h`. Keine Regression.

### 4. `WikiPageForm.tsx` — RichTextEditor mehr Höhe

Im Tab „Details", die `<Section>` die den Editor enthält:

```tsx
<Section>
  <RichTextInlineField
    value={content}
    placeholder="Wiki-Inhalt"
    testIdPrefix="wiki-page-form-content"
    onImageUpload={uploadContentImage}
    className="min-h-[400px]"
    onChange={(value) => { setContent(value); setDirty(true); }}
  />
</Section>
```

Falls `RichTextInlineField` kein `className`-Prop unterstützt, das Prop ergänzen oder einen Wrapper-`div` mit `min-h-[400px]` verwenden.

### 5. `WikiPage.tsx` — Inline-Formular bei Seitenauswahl

Ersetze die Verwendung von `WikiPageDetail` durch `WikiPageForm` mit `inline`:

```tsx
{wiki.page ? (
  <WikiPageForm
    inline
    open={true}
    page={wiki.page}
    parent={/* übergeordnete Seite aus tree */}
    tree={wiki.tree}
    projects={projects}
    onSubmit={submitForm}
    onPostCreate={postCreatePage}
    onDelete={deletePage}
    onClose={() => navigate(standalone ? withStandaloneView("/wiki") : "/wiki")}
  />
) : (
  <EmptyState ... />
)}
```

Der `parent`-Wert wird aus dem Tree ermittelt:
```ts
const parentPage = wiki.page?.parentId
  ? flattenTree(wiki.tree).find(p => p.id === wiki.page!.parentId) ?? null
  : null;
```

### 6. `WikiPage.tsx` — Modal für „Neue Seite"

Das bestehende `<WikiPageForm open={formOpen} ...>`-Modal am Ende von `WikiPage.tsx` bleibt unverändert — ohne `inline`-Prop, wie bisher.

### 7. `WikiPage.tsx` — `openEditMetadata` entfernen

Die Funktion `openEditMetadata` und alle Stellen, die sie aufrufen, entfernen (war nur für den „Metadaten bearbeiten"-Button in WikiPageDetail nötig).

### 8. Import bereinigen

`WikiPageDetail`-Import in `WikiPage.tsx` entfernen (WikiPageDetail wird in TASK-142 gelöscht).

## Technische Leitplanken

- Modal-Modus darf keine Regression haben — alle bestehenden Tests müssen bestehen
- `inline`-Modus rendert kein `<Modal>`, kein Portal, kein Overlay
- `dirty`-State und `requestClose`-Confirm-Dialog bleiben auch im Inline-Modus aktiv
- `PageHero` ist eine existierende Komponente — nicht neu bauen, nur verwenden
- Kein Breaking Change an `WikiPageFormProps` (alle neuen Props optional)

## Regeln & Randfälle

- Wenn `inline=true` und `page=null` (Neue Seite inline): nicht vorgesehen — Neue Seite immer als Modal
- Wenn `onDelete` nicht übergeben wird: Löschen-Button nicht rendern
- Breadcrumb zeigt `["Wiki", parentTitle]` — wenn Root-Seite, dann `["Wiki", "Root"]`
- Dirty-Check beim Navigation aus dem Inline-Formular heraus (z.B. andere Seite klicken): `onClose` wird aufgerufen, Confirm-Dialog erscheint wenn dirty

## Seiteneffekte

- `WikiPageDetail` wird nach dieser Aufgabe nicht mehr verwendet (TASK-142 löscht sie)
- `openEditMetadata`-Logik in `WikiPage.tsx` entfällt vollständig
- `WikiPageForm`-Tests müssen den neuen `inline`-Prop abdecken

## Testanforderungen

- Unit-Test für `WikiPageForm` mit `inline=true`: rendert ohne Modal, zeigt PageHero, kein Steel-Header
- Unit-Test für `WikiPageForm` mit `inline=false` (default): Verhalten wie bisher
- Unit-Test für `WikiPage`: bei Seitenauswahl wird `WikiPageForm` inline gerendert, nicht `WikiPageDetail`
- Dirty-Check: Navigation zu anderer Seite bei unsaved Changes zeigt Confirm-Dialog

## Abnahmekriterien

- Seite im WikiTree auswählen → Inline-Formular erscheint sofort, kein Modal
- Inline-Header zeigt `PageHero` mit Breadcrumb „Wiki › [Parent oder Root]" und Seitentitel
- Alle Formularfelder (Titel, übergeordnete Seite, Inhalt, verwandte Themen) sofort editierbar
- Tabs (Details, Kommentare, Notizen, Dateien) funktionieren
- RichText-Editor hat mindestens 400px Höhe
- „Neue Seite"-Button in PageHero öffnet Modal wie bisher
- Kein „Metadaten bearbeiten"-Button mehr sichtbar
- Speichern und Löschen funktionieren im Inline-Modus
