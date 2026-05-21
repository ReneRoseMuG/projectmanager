# Codex-Auftrag: Kommentar-Platzhalter und tote UI-Elemente entfernen

## Aufgabenbeschreibung

Die `CommentThread`-Komponente enthält zwei Arten von Problemen, die im produktiven UI sichtbar sind:

1. **Hardcodierter Autorenname:** Jeder Kommentar zeigt „Single User" als Autor.
2. **Tote UI-Elemente:** Die Buttons „0 Reaktionen" und „Antworten" sind statisch und funktionslos.

---

## Schritt 1: API-Response prüfen

Suche in der API-Codebase und in `packages/shared-types/src/` nach dem `Comment`-Typ.

```bash
grep -r "createdBy\|author\|Comment" packages/shared-types/src --include="*.ts"
```

**Ergebnis A:** `Comment` hat ein `createdBy`-Feld (User-ID, Name oder E-Mail).
→ Diesen Wert als Autornamen anzeigen.

**Ergebnis B:** `Comment` hat kein Autorenfeld.
→ Den gesamten Avatar-/Namensblock aus `CommentItem` entfernen.
   Ein Kommentar ohne Autorenname ist besser als „Single User".

---

## Schritt 2: CommentItem bereinigen

**Datei:** `apps/web/src/components/ui/CommentThread.tsx`

### 2a. Autorenname – wenn Autorenfeld vorhanden:

```tsx
// Ist:
<p className="font-semibold text-ink">Single User</p>

// Soll:
<p className="font-semibold text-ink">{comment.createdBy ?? "Unbekannt"}</p>
```

### 2a. Autorenname – wenn kein Autorenfeld vorhanden:

Gesamten Avatar- und Namenblock entfernen:

```tsx
// Entfernen:
<div className="flex min-w-0 items-center gap-3">
  <Avatar name={`User ${index + 1}`} />
  <div className="min-w-0">
    <p className="font-semibold text-ink">Single User</p>
    <time className="text-xs text-slate-500">{formatHumanDate(comment.createdAt)}</time>
  </div>
</div>

// Stattdessen nur:
<time className="text-xs text-slate-500">{formatHumanDate(comment.createdAt)}</time>
```

---

### 2b. Tote UI-Elemente entfernen

**Ist:**
```tsx
<div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-slate-500">
  <span className="rounded-full bg-shell px-2 py-1">0 Reaktionen</span>
  <span className="rounded-full bg-shell px-2 py-1">Antworten</span>
</div>
```

**Soll:** Diesen gesamten Block entfernen.

---

### 2c. Avatar-Import und `index`-Prop bereinigen

Nach den Änderungen prüfen:
- Wird `Avatar` noch anderweitig in der Datei verwendet? Falls nicht: Import entfernen.
- Wird `index` im `CommentItem`-Props noch benötigt? Falls nicht: aus der Prop-Definition
  und aus dem aufrufenden `map()`-Call entfernen.

**Ist:**
```tsx
function CommentItem({ comment, index, onDelete }: { comment: Comment; index: number; ... })
...
{comments.comments.map((comment, index) => (
  <CommentItem key={comment.id} comment={comment} index={index} onDelete={onDelete} />
))}
```

**Soll (wenn index entfällt):**
```tsx
function CommentItem({ comment, onDelete }: { comment: Comment; ... })
...
{comments.comments.map((comment) => (
  <CommentItem key={comment.id} comment={comment} onDelete={onDelete} />
))}
```

---

## Abnahmekriterien

- [ ] „Single User" erscheint nirgendwo mehr in der UI
- [ ] Falls Autorenfeld vorhanden: echter Name wird angezeigt; Fallback „Unbekannt" wenn leer
- [ ] Falls kein Autorenfeld: Avatar-Namenbereich komplett entfernt
- [ ] „0 Reaktionen" und „Antworten"-Buttons sind entfernt
- [ ] Kommentare sind weiterhin erstellbar und löschbar
- [ ] Datum wird weiterhin korrekt angezeigt
- [ ] `vitest run` und `playwright test` vollständig grün

## Referenz

- `apps/web/src/components/ui/CommentThread.tsx`
- `packages/shared-types/src/` (Comment-Typ prüfen)
