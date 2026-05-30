# Codex-Auftrag: SelectParent UI-Komponente implementieren

**Parent:** PROJ-3 — Projekt Manager  
**Datum:** 2026-05-26  
**Aufgaben-ID:** 62

---

## Ziel

Eine generische `SelectParent`-Komponente erstellen, die für genau einen konfigurierten
Elterntyp (project | milestone | feature) ein durchsuchbares Dropdown bereitstellt.
Nach der Auswahl wird das gewählte Objekt als `ItemRow`-Karte direkt unterhalb des
Triggers dargestellt. Die Komponente ist vollständig kontrolliert (value/onChange).

## Hintergrund & Kontext

In Formularen, in denen ein Datensatz einem Elternobjekt zugeordnet wird (z. B. eine
Aufgabe einem Projekt oder Meilenstein), fehlte bislang eine einheitliche
Auswahlkomponente. Die Komponente soll genau eine Beziehung abbilden — kein
Multi-Select, keine Typauswahl im Widget selbst. Der Typ wird beim Einbinden der
Komponente fest konfiguriert.

Das Design-Konzept wurde in einer Cowork-Session erarbeitet und als interaktive
HTML-Vorschau validiert.

## Aufgabe

1. Neue Datei anlegen: `apps/web/src/components/ui/SelectParent.tsx`

2. Interface definieren:
   ```ts
   export interface SelectParentItem {
     id: number | string;
     title: string;
     accentColor?: string;   // für den farbigen linken Rand der ItemRow
     statusKind?: StatusCatalogKind;
     statusValue?: string;
     meta?: string;          // z. B. "8 Aufgaben · 2026-06-30"
   }

   export interface SelectParentProps {
     type: 'project' | 'milestone' | 'feature';
     label: string;          // Feldbezeichnung, z. B. "Projekt"
     placeholder?: string;   // z. B. "Projekt wählen …"
     items: SelectParentItem[];
     value: SelectParentItem | null;
     onChange: (item: SelectParentItem | null) => void;
     disabled?: boolean;
   }
   ```

3. Trigger-Button:
   - Zeigt `placeholder` wenn kein Item gewählt, sonst den Titel des gewählten Items
   - Icon aus lucide-react passend zum Typ: `Folder` (project), `Flag` (milestone),
     `Puzzle` (feature)
   - Chevron-Icon klappt beim Öffnen
   - Gleiche Höhe und Border-Stil wie bestehende `<select>`-Elemente
     (`h-11 rounded-md border border-line bg-white px-3 text-sm`)

4. Dropdown-Panel (öffnet sich direkt unterhalb des Triggers, gleiche Breite):
   - Sucheingabe oben (analog zu `SearchInput`, aber ohne max-width-Constraint)
   - Einfache Liste der gefilterten Items
   - Jedes Listenelement: farbiger Punkt (accentColor), Titel, optionale Meta-Info
   - Aktives Item (= aktueller value) visuell hervorgehoben (`bg-steel-50`)
   - Schließt bei Klick außerhalb (mousedown-Listener auf document) und bei Escape

5. Ausgewählte Item-Karte (unterhalb des Triggers, nur wenn value != null):
   - Nutzt die bestehende `ItemRow`-Komponente
   - `accentColor` → `accentColor`-Prop von ItemRow
   - `title` → `title`-Prop
   - `statusKind` + `statusValue` → `pills`-Slot mit `<StatusPill>`
   - `meta` → `meta`-Slot
   - Entfernen-Button (X-Icon) im `actions`-Slot: ruft `onChange(null)` auf

6. Export in `apps/web/src/components/ui/index.ts` ergänzen (falls vorhanden).

## Technische Leitplanken

- Kein eigener API-Aufruf — Items werden ausschließlich von außen übergeben.
- Keine Tabs, keine Typauswahl im Widget; der Typ ist eine Konfigurationseigenschaft.
- Tailwind-Klassen verwenden ausschließlich die projekteigenen Tokens (`steel-*`,
  `ink`, `line`, `white`). Keine willkürlichen Hex-Farben.
- Icons aus `lucide-react` (bereits installiert), nicht aus anderen Bibliotheken.
- `ItemRow` aus `./ItemRow` wiederverwenden — kein eigenes Karten-Markup.
- `StatusPill` aus `./StatusPill` wiederverwenden, wenn `statusKind` übergeben wird.
- Die Komponente ist ein reines Presentational Component ohne eigenen State für die
  Auswahl — nur lokaler State für `open` und `query` (Suchbegriff).
- Kein `position: fixed`; das Dropdown-Panel ist `position: absolute` relativ zum
  umschließenden `relative`-Container.

## Regeln & Randfälle

- Wenn `items` leer ist: Dropdown zeigt „Keine Einträge vorhanden" (leerer Zustand).
- Wenn die Suche keine Treffer liefert: „Keine Ergebnisse für „{query}"".
- Wenn `disabled={true}`: Trigger-Button ist nicht klickbar, Karte zeigt keinen
  Entfernen-Button.
- Wenn `value` gesetzt ist und das Dropdown erneut geöffnet wird: das aktive Item
  ist visuell hervorgehoben und scrollt in den sichtbaren Bereich.

## Seiteneffekte

- Keine bestehenden Komponenten werden verändert.
- Die Komponente kann später in Task-Formularen, Ticket-Formularen und Feature-
  Formularen verwendet werden — das ist aber nicht Teil dieses Auftrags.

## Testanforderungen

Unit-Tests in `tests/unit/web/components/ui/SelectParent.test.tsx`:

- Trigger zeigt Placeholder wenn kein Item gewählt
- Trigger zeigt Titel des gewählten Items
- Klick auf Trigger öffnet Dropdown
- Suche filtert die Liste korrekt
- Klick auf Listeneintrag ruft `onChange` mit dem Item auf und schließt Dropdown
- Klick außerhalb schließt das Dropdown
- Escape-Taste schließt das Dropdown
- `onChange(null)` wird aufgerufen wenn Entfernen-Button geklickt
- Bei `disabled={true}`: Trigger nicht klickbar, kein Entfernen-Button
- Leere Liste zeigt Leer-Zustand
- Suche ohne Treffer zeigt Keine-Ergebnisse-Meldung

## Abnahmekriterien

- `<SelectParent type="project" ... />` rendert ohne Fehler und zeigt nur
  Projekt-Items (Items werden von außen übergeben — kein API-Call).
- Nach Auswahl eines Items: Trigger zeigt dessen Titel, darunter erscheint die
  `ItemRow`-Karte mit korrektem Farbrand, Status-Pill und Meta-Info.
- Nach Klick auf Entfernen: Karte verschwindet, Trigger zeigt wieder den Placeholder,
  `onChange(null)` wurde aufgerufen.
- Alle Unit-Tests grün.
- Keine TypeScript-Fehler (`tsc --noEmit`).
