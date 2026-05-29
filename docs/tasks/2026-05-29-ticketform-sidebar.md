# Codex-Auftrag: TicketForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-131

---

## Ziel

Das Ticket-Formular (`TicketForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen: Titel + Beschreibung im Body, alle Metadaten-Felder in der `FormSidebar`.

## Hintergrund & Kontext

`TicketForm.tsx` hat aktuell drei Metadaten-Sections: „Typ & Priorität" (Typ + Priorität grid-cols-2), „Status, Lösung & Fälligkeit" (Status + Lösung + Fällig grid-cols-3) und „Zuweisung" (Gemeldet von + Zugewiesen an grid-cols-2). Alle diese Felder werden auf der Sidebar gestapelt; der Body bleibt sauber für Titel und Beschreibung.

**Abhängigkeit:** TASK-124 (FormSidebar-Komponente) muss fertig sein.

## Aufgabe

1. **Äußeres Layout umstellen:** Analog zu TASK-128 — `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Section-Label „Stammdaten" (neu, war bisher ohne Label)
   - Titel (Text-Input, volle Breite)
   - Beschreibung (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Typ (Select — ticketType: bug/improvement/question/task)
   - Lösung (Select — Resolutions-Status)
   - Priorität (Select)
   - Fällig (DatePicker)
   - Gemeldet von (UserPicker)
   - Zugewiesen an (UserPicker)
   - Tags (TagPicker)

4. **Sections entfernen:** „Typ & Priorität", „Status, Lösung & Fälligkeit", „Zuweisung" und „Tags" als eigenständige Sections entfernen.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- State-Handling unverändert
- `storageKey="ticket-form-sidebar"` für localStorage-Namespacing

## Seiteneffekte

- Felder „Gemeldet von" und „Zugewiesen an" werden nun vertikal gestapelt (waren horizontal nebeneinander) — funktional identisch

## Testanforderungen

- Manuell: Alle 8 Sidebar-Felder sind befüllbar
- Manuell: Speichern, Validierung funktioniert
- Manuell: Formular in Modal öffnen → Sidebar bleibt in Modal-Grenzen

## Abnahmekriterien

- Body: Titel + Beschreibung mit Section-Label „Stammdaten"
- Sidebar: Status, Typ, Lösung, Priorität, Fällig, Gemeldet von, Zugewiesen an, Tags
- Kein Formular-Feld fehlt
- Speichern/Validierung funktioniert unverändert
