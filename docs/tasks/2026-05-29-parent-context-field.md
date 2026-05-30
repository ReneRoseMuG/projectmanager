# Codex-Auftrag: Kontext-sensitives Parent-Feld in Edit-Formularen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-123

---

## Ziel

Edit-Formulare zeigen ganz oben ein Read-only-Feld mit allen zugeordneten Parent-Objekten, wenn sie ohne Parent-Kontext geöffnet werden (z.B. aus der globalen Aufgabenliste). Wird das Formular aus einem Parent-Kontext heraus geöffnet, entfällt dieses Feld. Das dauerhaft sichtbare Parent-Feld im FeatureForm wird entfernt.

## Hintergrund & Kontext

Alle Objekte unterhalb von Projekt sind mindestens einem Parent zugeordnet, überwiegend n:m. Wird eine Aufgabe aus dem Projekt-Kontext geöffnet, ist der Parent klar. Aus der globalen Liste fehlt dieser Kontext. Derzeit gibt es keine konsistente Lösung — das FeatureForm zeigt den Parent immer an (auch mit Kontext), andere Formulare gar nicht.

## Aufgabe

### 1. Neue Komponente `ParentContextField`
Datei: `apps/web/src/components/ui/ParentContextField.tsx`

```tsx
interface Parent {
  id: number;
  type: 'project' | 'milestone' | 'feature';
  label: string;   // z.B. "Redesign Stammdaten Formulare"
  reference?: string; // z.B. "MILE-24"
}

interface ParentContextFieldProps {
  parents: Parent[];
}
```

- Rendert eine horizontale Badge-Zeile: `[MILE-24 Redesign Stammdaten Formulare] [PROJ-3 MugPlan]`
- Badges sind Read-only (kein Edit, kein Remove)
- Jeder Badge zeigt Typ-Icon + Referenz + Name
- Wenn `parents` leer oder nicht übergeben: nichts rendern

### 2. Integration in Formulare

In `TaskForm`, `TicketForm`, `FeatureForm`, `UseCaseForm`, `BacklogItemForm`:

**Prop hinzufügen:**
```tsx
contextParents?: Parent[]  // gesetzt wenn Formular aus Parent-Kontext geöffnet wird
```

**Rendering-Logik:**
- Wenn `contextParents` nicht gesetzt oder leer → `<ParentContextField parents={resolvedParents} />` ganz oben im Details-Tab rendern (Parents aus dem geladenen Objekt ableiten)
- Wenn `contextParents` gesetzt → kein `ParentContextField` anzeigen (Kontext ist bereits klar)

**Parents aus Objekt ableiten:** Das geladene Task/Ticket/Feature-Objekt enthält bereits Relationen (Projekt, Meilenstein etc.) — diese als `Parent[]` mappen.

### 3. FeatureForm: dauerhaftes Parent-Feld entfernen
- `Section title="Parent-Projekt"` vollständig entfernen
- Zugehörigen State und die Projekt-Select-Logik entfernen
- Wird durch `ParentContextField` ersetzt (automatisch aus dem geladenen Feature befüllt)

### 4. Aufrufstellen anpassen
Überall wo Formulare geöffnet werden: prüfen ob ein `owner`/`context`-Prop gesetzt wird. Falls ja, `contextParents` befüllen. Falls nein, leer lassen → Feld erscheint automatisch.

## Technische Leitplanken

- `ParentContextField` ist rein presentational — keine API-Calls
- Keine neuen API-Endpoints nötig — Parent-Daten kommen aus dem bereits geladenen Objekt
- Keine Änderungen am DB-Schema

## Seiteneffekte

- Alle Stellen wo `FeatureForm` geöffnet wird müssen geprüft werden — das Projekt-Select-State entfällt und darf nicht mehr im Submit-Payload landen

## Testanforderungen

- Unit-Test für `ParentContextField`: rendert Badges korrekt, rendert nichts bei leerem Array
- E2E: Aufgabe aus globaler Liste öffnen → Parent-Feld sichtbar
- E2E: Aufgabe aus Projekt-Kontext öffnen → kein Parent-Feld

## Abnahmekriterien

- Aufgabe aus globaler Liste: Parent-Badges sichtbar, korrekte Daten
- Aufgabe aus Projekt-Kontext: kein Parent-Feld
- FeatureForm zeigt kein dauerhaftes Projekt-Select mehr
- Kein TypeScript-Fehler, kein Regressions-Test bricht
