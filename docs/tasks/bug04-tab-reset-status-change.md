# Codex-Auftrag: Tab-Reset bei Statuswechsel beheben

## Kontext

In allen großen Form-Komponenten (FeatureForm, MilestoneForm, ProjectForm, TaskForm, TicketForm, UseCaseForm) gibt es einen `useEffect`, der beim Öffnen des Formulars den aktiven Tab auf den Default zurücksetzt. Dieser Effect hat als Dependency sowohl `open` als auch das Entity-Objekt (z.B. `feature`, `milestone`, `task`).

## Problem

Wenn innerhalb des Formulars eine untergeordnete Aktion ausgeführt wird (Statuswechsel einer Aufgabe, Drag & Drop, Datumsänderung), wird über `invalidateOwner()` in `useTasks` der React-Query-Cache der übergeordneten Entity invalidiert. Das führt zu einem Refetch, bei dem ein neues JavaScript-Objekt für die Entity zurückgegeben wird. Da das neue Objekt eine neue Referenz hat, feuert der `useEffect` neu — und ruft `setActiveTab("details")` (oder den jeweiligen Default) auf.

**Beobachtetes Symptom:** Statuswechsel einer Aufgabe auf „Geschlossen" im Tab „Aufgaben" eines Feature-Formulars → Formular springt auf Tab „Details".

## Betroffene Dateien

- `apps/web/src/components/features/FeatureForm.tsx`
- `apps/web/src/components/milestones/MilestoneForm.tsx`
- `apps/web/src/components/projects/ProjectForm.tsx`
- `apps/web/src/components/tasks/TaskForm.tsx`
- `apps/web/src/components/tickets/TicketForm.tsx`
- `apps/web/src/components/usecases/UseCaseForm.tsx`

## Ursache (Code-Muster)

In jeder betroffenen Komponente gibt es einen `useEffect` nach diesem Muster:

```typescript
useEffect(() => {
  if (!open) {
    // Pending-State zurücksetzen
    return;
  }
  setActiveTab("details"); // ← PROBLEM: feuert bei jedem Daten-Update
  setTitle(feature?.title ?? "");
  // ...
}, [feature, open]); // ← entity als Dependency verursacht Tab-Reset bei Refetch
```

Der `invalidateOwner`-Aufruf in `useTasks.updateTaskStatus` → `invalidateFeatureScope` → Refetch Feature → neues Objekt → `useEffect` feuert → `setActiveTab("details")`.

## Fix

Den `useEffect` in zwei getrennte Effects aufteilen:

1. **Tab-Reset + Init-Logic**: nur wenn `open` von `false` → `true` wechselt
2. **Felder befüllen**: wenn sich die Entity-Daten ändern oder das Formular geöffnet wird

```typescript
// Ref trackt ob das Formular gerade neu geöffnet wurde
const prevOpenRef = useRef(false);

// Effect 1: Initialisierung nur beim frischen Öffnen
useEffect(() => {
  if (open && !prevOpenRef.current) {
    setActiveTab("details");
    setPendingSubtasks([]);
    // ... weitere Init-Logik für neue Formular-Session
  }
  if (!open) {
    // Aufräumen beim Schließen
    setPendingSubtasks([]);
    // ...
  }
  prevOpenRef.current = open;
}, [open]);

// Effect 2: Felder befüllen wenn Entity-Daten sich ändern
useEffect(() => {
  if (!open) return;
  setTitle(feature?.title ?? "");
  setDescription(feature?.description ?? "");
  // ... weitere Felder
}, [feature, open]);
```

**Minimalvariante** (weniger Umstrukturierung): `setActiveTab` einfach aus dem `[entity, open]`-Effect herausziehen in einen eigenen `[open]`-Effect:

```typescript
// Nur Tab-Reset hängt ausschließlich an open
useEffect(() => {
  if (open) {
    setActiveTab("details");
  }
}, [open]);

// Alles andere (Felder + Pending-Cleanup) bleibt im Entity+open Effect
useEffect(() => {
  if (!open) {
    setPendingSubtasks([]);
    return;
  }
  setTitle(feature?.title ?? "");
  // ...
}, [feature, open]);
```

## Wichtiger Hinweis

Den `prevOpenRef`-Ansatz (Effect 1) bevorzugen, wenn es Init-Logik gibt, die beim Daten-Update NICHT wiederholt werden soll (z.B. Pending-State leeren). Die Minimalvariante reicht, wenn `setActiveTab` die einzige Logik ist, die vom Entity-Refetch entkoppelt werden muss.

## Akzeptanzkriterien

- [ ] Statuswechsel einer Aufgabe/eines Tickets im Tab „Aufgaben" oder „Tickets" setzt den aktiven Tab des übergeordneten Formulars nicht zurück
- [ ] Drag & Drop Statuswechsel setzt den aktiven Tab nicht zurück
- [ ] Datumsänderung einer Aufgabe setzt den aktiven Tab nicht zurück
- [ ] Beim Neueröffnen des Formulars (open: false → true) wird der Tab korrekt auf den Default gesetzt
- [ ] Formularfelder werden beim Öffnen weiterhin korrekt mit Entity-Daten befüllt (keine Regression)
- [ ] Alle sechs betroffenen Form-Komponenten sind angepasst
