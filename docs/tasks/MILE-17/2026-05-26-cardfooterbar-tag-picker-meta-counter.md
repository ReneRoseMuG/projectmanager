# Codex-Auftrag: CardFooterBar — Tag-Picker mit Abkürzungslogik und Meta-Counter implementieren

**Parent:** MILE-17 — Board UI: Karten-Vereinheitlichung & Status-Footer
**Datum:** 2026-05-26
**Aufgaben-ID:** 65

---

## Ziel

Eine neue generische UI-Komponente `CardFooterBar` erscheint im Footer aller Domänenkarten
(Board- und Listview). Sie zeigt links einen Tag-Picker mit dynamischer Abkürzungslogik
und rechts drei Icon-Counter (Attachments, Notizen, Kommentare). Der Nutzer kann Tags
direkt auf der Karte vergeben, ohne das Detailformular zu öffnen.

## Hintergrund & Kontext

Aktuell zeigen `TaskCard`, `TicketCard`, `FeatureCard` und `UseCaseCard` via `TagFooter`
nur die vorhandenen Tags als reine Anzeigelabels, ohne Bearbeitungsmöglichkeit. Counts
für Attachments, Notizen und Kommentare sind in den List-API-Responses nicht vorhanden
(`Task`, `Ticket`, `Feature`, `UseCase` in `shared-types` haben diese Felder nicht).

Die Lösung besteht aus drei Teilen:
1. API-Erweiterung: Count-Felder in den List-Responses ergänzen.
2. Neue `CardFooterBar`-Komponente mit Tag-Picker und Countern.
3. Integration in alle Domänenkarten (Board- und Listview).

## Aufgabe

### Teil A — Shared Types erweitern

Datei: `packages/shared-types/src/index.ts`

Felder zu `Task` hinzufügen:
```typescript
attachmentCount: number;
noteCount: number;
commentCount: number;
```

Felder zu `Ticket` hinzufügen:
```typescript
attachmentCount: number;
noteCount: number;
commentCount: number;
```

Felder zu `Feature` hinzufügen:
```typescript
attachmentCount: number;
noteCount: number;
commentCount: number;
```

Felder zu `UseCase` hinzufügen:
```typescript
attachmentCount: number;
noteCount: number;
commentCount: number;
```

---

### Teil B — Server: Count-Felder in List-Queries ergänzen

Für jeden Entity-Typ die entsprechende Service- bzw. Repository-Datei anpassen, die
die List-/Board-Abfragen ausführt. Die Count-Felder per Subquery oder JOIN aus den
Tabellen `attachments`, `notes` und `comments` ableiten.

**Vorgehen je Entity (Beispiel Task):**
- In der Query, die Tasks für ein Projekt oder einen Meilenstein lädt, zusätzliche
  Count-Subqueries ergänzen:
  ```sql
  (SELECT COUNT(*) FROM attachments WHERE 'task' = entity_type AND id = attachments.entity_id) AS attachment_count,
  (SELECT COUNT(*) FROM notes WHERE 'task' = entity_type AND id = notes.entity_id) AS note_count,
  (SELECT COUNT(*) FROM comments WHERE 'task' IN (entity_types) AND id = comments.entity_id) AS comment_count
  ```
  Die genaue Tabellenstruktur und Fremdschlüsselnamen im Schema prüfen — nicht raten.
- Dieselbe Erweiterung für Ticket, Feature und UseCase durchführen.
- Die Zählfelder in den gemappten Response-Objekten zurückgeben.

**Hinweis:** Nur Lese-Queries anpassen. Keine Schreib-Endpunkte berühren. Kein
Breaking Change an bestehenden Response-Feldern.

---

### Teil C — `CardFooterBar`-Komponente erstellen

Datei: `apps/web/src/components/ui/CardFooterBar.tsx`

#### Interface

```typescript
interface CardFooterBarProps {
  /** Aktuelle Tags des Objekts */
  tags: Tag[];
  /** Alle im System verfügbaren Tags (für den Picker-Dropdown) */
  allTags?: Tag[];
  /** Callback wenn der Nutzer Tags ändert; wird mit den neuen Tag-IDs aufgerufen */
  onTagsChange?: (tagIds: number[]) => Promise<void> | void;
  /** Anzahl Attachments — 0 wenn nicht vorhanden */
  attachmentCount?: number;
  /** Anzahl Notizen */
  noteCount?: number;
  /** Anzahl Kommentare */
  commentCount?: number;
}
```

#### Layout

```
[ 🏷 +  Tag1  Tag2  Tag3  ···  ]        [ 📎 3  📝 1  💬 5 ]
  ←— flex-1, overflow: hidden —→         ←— shrink-0 —→
```

Äußerer Container: `flex items-center gap-2 min-w-0` (border-t border-line pt-2)

**Linke Seite (Tag-Bereich):**
- `flex items-center gap-1 flex-1 min-w-0 overflow-hidden`
- Tag-Icon-Button (`Tag size={13}`) mit `+`-Icon, öffnet Dropdown-Picker
- Picker: Floating-Dropdown (Positionierung per `useRef` + `position: absolute`), listet
  alle verfügbaren Tags mit Checkbox; ausgewählte Tags sind markiert
- Ausgewählte Tags werden inline nebeneinander angezeigt als kleine Pills

**Tag-Abkürzungslogik:**

```typescript
function abbreviateTag(name: string, mode: "full" | "short"): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    // Mehrwort-Tag: immer Initialen
    return words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  }
  // Einwort-Tag
  if (mode === "full") return name;
  // short: auf 3 Zeichen kürzen (Minimum)
  return name.slice(0, Math.max(3, Math.ceil(name.length / 2)));
}
```

Verfügbaren Platz messen: `ResizeObserver` auf dem Tag-Container. Sobald die gerenderten
Tags den Container überlaufen (`scrollWidth > offsetWidth`), wechselt ein State
`abbreviated` auf `true` und alle Tags werden in der Kurzform neu gerendert. Wenn der
Platz wieder ausreicht, zurück auf `full`.

**Implementierungshinweis ResizeObserver:**
```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [abbreviated, setAbbreviated] = useState(false);

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const observer = new ResizeObserver(() => {
    setAbbreviated(el.scrollWidth > el.offsetWidth);
  });
  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

Tag-Pill im normalen Modus:
```tsx
<span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0"
      style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 15%, white)`, color: tag.color }}>
  {abbreviateTag(tag.name, abbreviated ? "short" : "full")}
</span>
```

**Rechte Seite (Counter):**
- `flex shrink-0 items-center gap-3`
- Drei Counter nebeneinander; jeder Counter: `inline-flex items-center gap-1 text-[11px] text-steel-500`
- Icons: `Paperclip size={13}`, `FileText size={13}`, `MessageCircle size={13}` (lucide-react)
- Counter mit Wert 0 werden in `text-steel-300` dargestellt (schwächer)
- Alle drei Counter werden immer angezeigt (auch bei 0), damit das Layout stabil bleibt

#### Tag-Picker Dropdown

- Öffnet/schließt per Toggle auf dem Tag-Icon-Button
- Schließt sich bei Klick außerhalb (`useEffect` mit `mousedown`-Listener auf `document`)
- Listet `allTags` als Checkboxliste
- Bei Änderung einer Checkbox: `onTagsChange([...selectedTagIds])` aufrufen
- Lade-State: während `onTagsChange` läuft, Button deaktivieren (kein Spinner nötig)
- Falls `allTags` leer oder `onTagsChange` nicht übergeben: Tag-Icon-Button ausblenden,
  nur vorhandene Tags als read-only Pills anzeigen

---

### Teil D — Integration in Domänenkarten

#### `TaskCard.tsx`

1. `CardFooterBar` importieren
2. Im Board-Modus (`ItemCard`-Aufruf): `CardFooterBar` als letzten Eintrag im
   `footer`-Prop einhängen:
   ```tsx
   footer={
     <div className="grid gap-3">
       {/* bestehende Footer-Inhalte */}
       <TaskCardFooter task={task} ... />
       <CardFooterBar
         tags={task.tags}
         allTags={allTags}          // aus useTags() oder Context
         onTagsChange={onTagsChange}
         attachmentCount={task.attachmentCount}
         noteCount={task.noteCount}
         commentCount={task.commentCount}
       />
     </div>
   }
   ```
3. Im Row-Modus (`ItemRow`-Aufruf): `CardFooterBar` als `footer`-Prop an `ItemRow`
   übergeben (der Footer-Slot wird bereits als `col-span-full`-Zeile gerendert).

#### `TicketCard.tsx`, `FeatureCard.tsx`, `UseCaseCard.tsx`

Analog zu `TaskCard`. Jede Domänenkarte erhält `CardFooterBar` im Footer (Board) und
als `footer`-Slot in `ItemRow` (Listview).

#### Tag-Mutations-Handler

Die Domänenkarten erhalten einen neuen optionalen Prop `onTagsChange`:
```typescript
onTagsChange?: (itemId: number, tagIds: number[]) => Promise<void>;
```

Dieser Prop wird vom jeweiligen Board-View nach unten gereicht. Die API-Calls für
Tag-Zuordnung prüfen, ob ein dedizierter Endpoint existiert (z.B.
`PATCH /api/tasks/:id/tags`); falls nicht, über den regulären Update-Endpoint mit
`tags`-Feld arbeiten.

#### `allTags` bereitstellen

`allTags` kommt aus einem bestehenden `useTags()`-Hook oder wird neu angelegt. Den
Hook prüfen, ob er bereits existiert; falls ja, wiederverwenden.

---

### Teil E — Realtime-Invalidierung

Wenn `onTagsChange` aufgerufen wird und Tags erfolgreich geändert werden, muss die
Ansicht refreshen. Entweder:
- Den bestehenden Realtime-Invalidierungs-Mechanismus nutzen (`tags`-Scope), falls
  vorhanden, **oder**
- Die lokale Query-Invalidierung im Hook nach dem Mutations-Call triggern.

---

## Technische Leitplanken

- `CardFooterBar` gehört in `components/ui/` — keine domain-spezifische Logik darin.
- Kein eigener Datenabruf in `CardFooterBar`; alle Daten kommen als Props.
- `ResizeObserver` nur einmal pro gemountet Komponenteninstanz anlegen.
- Keine neuen npm-Abhängigkeiten.
- Tailwind-Only für Styling.
- Die Count-Felder in den Shared Types sind `number` (nicht `number | undefined`),
  damit keine `??`-Guards überall nötig sind. Der Server liefert immer `0` oder höher.

## Regeln & Randfälle

- **Kein `onTagsChange`-Handler**: CardFooterBar rendert Tags read-only; der
  Tag-Picker-Button erscheint nicht.
- **Keine `allTags`**: Tag-Picker-Button erscheint nicht.
- **Leere Tags + keine Handler**: Footer-Bar zeigt nur die Counter — die Tag-Seite
  ist leer, nimmt aber weiterhin Platz ein (kein Layout-Jump).
- **Counter alle 0**: Alle drei Counter werden trotzdem angezeigt, aber in schwacher
  Farbe.
- **Sehr viele Tags**: Bei mehr als ca. 5 Tags im abgekürzten Modus kann es passieren,
  dass die Initialen-Darstellung immer noch überläuft. In diesem Fall: Overflow mit
  `overflow: hidden` und einem `+N`-Badge für nicht darstellbare Tags implementieren.
  Dieser Randfäll ist in der ersten Version optional (nice-to-have).

## Seiteneffekte

- `TagFooter`-Komponente (bereits in Task/Ticket als standalone Footer vorhanden):
  Diese wird **ersetzt** durch `CardFooterBar`. `TagFooter.tsx` kann nach der Migration
  entfernt werden, sofern keine anderen Verwender existieren — vorher `grep` durchführen.
- Die neuen Count-Felder in den API-Responses erhöhen die Response-Größe geringfügig.
  Kein Caching-Impact erwartet, da React Query per Entity-ID invalidiert.
- `TaskDetail` und `TicketDetail` (die Detail-Response-Typen) enthalten bereits die
  vollen `attachments`, `notes`, `comments`-Arrays — diese sind **nicht** betroffen.

## Testanforderungen

- **Unit-Test `abbreviateTag`**: Testfälle für Einwort-, Mehrwort- und Leerstring-Tags
  in beiden Modi (`full`, `short`).
- **Unit-Test `CardFooterBar`** (render only):
  - Rendert Tags im Full-Modus korrekt.
  - Rendert Counter korrekt (0 = schwache Farbe, >0 = normale Farbe).
  - Picker-Button fehlt, wenn kein `onTagsChange`.
- **Integration-Test**: Nicht zwingend; manueller Test ausreichend.
- Server-seitige Count-Queries: SQL-Ergebnis via bestehende Integrationstests
  für Task-/Ticket-Listen prüfen (Count-Felder > 0 wenn Relationen vorhanden).

## Abnahmekriterien

- Im Board-View zeigt jede Karte `CardFooterBar` mit Tags (Abkürzungslogik aktiv bei
  Platzmangel) und drei Countern.
- Der Tag-Picker öffnet sich per Klick auf den Tag-Icon-Button, zeigt alle System-Tags
  mit Checkbox und schließt sich bei Klick außerhalb.
- Tag-Änderungen werden ohne Seiten-Reload sofort auf der Karte reflektiert.
- Die Counter zeigen die korrekten Zahlen aus der API (kein separater Detailabruf nötig).
- Im List-View (Zeilenansicht) erscheint `CardFooterBar` als Footer-Zeile unter dem
  `ItemRow`-Hauptinhalt.
- `TagFooter.tsx` ist entfernt oder wird nicht mehr verwendet.
- Kein TypeScript-Fehler nach der Änderung (`tsc --noEmit` muss sauber durchlaufen).
