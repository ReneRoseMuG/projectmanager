# Codex-Auftrag: Neues Dashboard-Widget `noteList`

**Datum:** 2026-05-28
**Projekt:** PROJ-3 (Projekt Manager App)
**Meilenstein:** Persönliche Planung (Umbau)
**Feature:** FEAT-42 — Tagesplanung / Persönliche Planung

---

## Ziel

Ein neues Dashboard-Widget `noteList` einführen, das Notizen einer Entität (Owner) auflistet. Es folgt dem bestehenden Muster aller anderen Widgets (`commentJournal`, `taskJournal` etc.) und nutzt die nach Abschluss von Auftrag 1 verfügbaren `day_plan_notes`-Endpunkte.

**Voraussetzung:** Auftrag 1 (Schema-Refactoring) muss abgeschlossen sein.

---

## Kontext & Muster

### Wie Widgets funktionieren

Widgets beziehen ihre Daten über `useDashboardWidgetData(widget, owner)`, das serverseitig `getDashboardWidgetData(widgetId, owner, params)` aufruft. Der `owner` (`{ type, id }`) filtert die Daten auf den jeweiligen Kontext.

Backend-Endpunkt: `GET /api/dashboards/widget-data/:widgetId?ownerType=...&ownerId=...`

Bestehende Widgets als Referenz: `commentJournal` (zeigt Kommentare pro Owner), `attachmentJournal` (zeigt Dateien pro Owner).

---

## Aufgaben

### 1. `packages/shared-types/src/index.ts`

- `"noteList"` in `DASHBOARD_WIDGET_IDS` eintragen
- `DASHBOARD_ALLOWED_WIDGETS`:
  - `"dayPlan"`-Kontext (wird in Auftrag 3 eingeführt): `noteList` aufnehmen
  - Optional: auch für `"task"`, `"milestone"`, `"project"` freischalten, falls sinnvoll
- `DEFAULT_DASHBOARD_LAYOUTS` für `"dayPlan"`: `noteList` im Standardlayout vorbelegen

### 2. Backend: `apps/api/src/routes/dashboards.ts` (oder Widget-Data-Handler)

- Case `"noteList"` im Widget-Data-Switch ergänzen
- Ruft `noteRepository.listByOwner(ownerType, ownerId, params)` auf
- Gibt `Note[]` zurück (bereits vorhandener Typ)

### 3. `apps/web/src/components/dashboard/widgetRegistry.tsx`

```ts
noteList: {
  id: "noteList",
  label: "Notizen",
  description: "Zeigt Notizen im aktuellen Kontext.",
  icon: FileText,
},
```

### 4. `apps/web/src/components/dashboard/DashboardWidgets.tsx`

- `NoteListWidget`-Komponente implementieren (analog zu `CommentRows` / `AttachmentRows`)
- Nutzt vorhandene Komponenten aus `apps/web/src/components/notes/` (`NoteCard`, `NoteListViewItem`)
- Leer-Zustand: „Keine Notizen vorhanden"
- Case `"noteList"` in `DashboardWidgetCard` ergänzen

---

## Akzeptanzkriterien

- `tsc` läuft ohne Fehler durch
- Widget erscheint im Dashboard-Picker unter dem Label „Notizen"
- Widget zeigt Notizen korrekt an wenn ein Owner mit Notizen geladen wird
- Leerer Zustand wird korrekt angezeigt
- Kein bestehendes Widget ist durch die Änderung gebrochen
