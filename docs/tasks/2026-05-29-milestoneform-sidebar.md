# Codex-Auftrag: MilestoneForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-129

---

## Ziel

Das Meilenstein-Formular (`MilestoneForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen: Titel + Beschreibung im Body, alle Metadaten-Felder in der `FormSidebar`. Zusätzlich: Feldlabel „Name" → „Titel" umbenennen.

## Hintergrund & Kontext

Das aktuelle Meilenstein-Formular hat den Titel-Input als „Name" gelabelt (inkonsistent mit anderen Formularen) und die Metadatenfelder direkt im Formular-Body. Die Sidebar-Integration vereinheitlicht das Layout.

**Abhängigkeit:** TASK-124 (FormSidebar-Komponente) muss fertig sein.

## Aufgabe

1. **Äußeres Layout umstellen:** Analog zu TASK-128 (ProjectForm) — `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Titel (Text-Input, volle Breite, Label: „Titel" statt bisher „Name")
   - Beschreibung (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Verantwortlich (UserPicker)
   - Von (DatePicker)
   - Bis (DatePicker)
   - Tags (TagPicker)

4. **Label-Änderung:** `<label>Name</label>` → `<label>Titel</label>` (nur UI-Label, kein Feldname im State)

5. **Sections im Body entfernen:** Bisherige Status/Datums-Sections entfernen.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- State-Key für den Titel-Input bleibt unverändert (nur Label ändert sich)
- Kein Breaking Change an Props von `MilestoneForm`

## Seiteneffekte

- Nutzer sehen ab sofort „Titel" statt „Name" — nur kosmetisch, kein Datenverlust

## Testanforderungen

- Manuell: Formular öffnen → Label „Titel" statt „Name"
- Manuell: Sidebar sichtbar, kollabierbar, alle Felder befüllbar
- Manuell: Speichern funktioniert

## Abnahmekriterien

- Titel-Feld trägt Label „Titel"
- Alle Metadaten in der Sidebar
- Kein Formular-Feld fehlt gegenüber dem bisherigen Stand
- Speichern/Validierung funktioniert unverändert
