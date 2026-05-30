# Codex-Auftrag: BacklogItemForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-134

---

## Ziel

Das Backlog-Item-Formular (`BacklogItemForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen. Zusätzlich: Tags hinzufügen (bisher fehlend).

## Hintergrund & Kontext

`BacklogItemForm.tsx` hat aktuell eine alleinstehende Status-Section (kein Grid), eine Section „Zuordnung" mit Feature-Select + Sortierung in einer Zeile und Verantwortlich darunter. Das gemischte Grid ist inkonsistent; die Sidebar-Lösung stapelt alle Metadaten sauber.

**Abhängigkeiten:**
- TASK-123: ParentContextField
- TASK-124: FormSidebar-Komponente

## Aufgabe

1. **Äußeres Layout umstellen:** `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Section-Label „Stammdaten" (neu)
   - Titel (Text-Input, volle Breite)
   - Beschreibung (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Verantwortlich (UserPicker)
   - Feature (Select — Zuordnung zu einem Feature)
   - Sortierung (Number-Input — bleibt, wird nicht entfernt wie bei Feature/UseCase)
   - Tags (TagPicker) — **neu**, bisher nicht vorhanden

4. **Sections entfernen:** Standalone Status-Section und Section „Zuordnung" im Body entfernen; alle Felder in die Sidebar verschieben.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- `storageKey="backlogitem-form-sidebar"`
- Sortierung bleibt im BacklogItemForm (anders als in Feature/UseCase); sie ist fachlich relevant für die Backlog-Reihenfolge

## Seiteneffekte

- Feature-Select und Sortierung liegen neu vertikal in der Sidebar (waren horizontal nebeneinander)

## Testanforderungen

- Manuell: Alle 5 Sidebar-Felder befüllbar
- Manuell: Speichern, Validierung funktioniert

## Abnahmekriterien

- Body: Titel + Beschreibung mit Section-Label „Stammdaten"
- Sidebar: Status, Verantwortlich, Feature, Sortierung, Tags
- Kein Formular-Feld fehlt gegenüber bisherigem Stand
- Speichern/Validierung funktioniert unverändert
