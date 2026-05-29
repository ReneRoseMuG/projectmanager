# Codex-Auftrag: EventForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-135

---

## Ziel

Das Kalender-Event-Formular (`EventForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen: Titel + Beschreibung im Body, alle Zeitraum- und Zuordnungs-Felder in der `FormSidebar`.

## Hintergrund & Kontext

`EventForm.tsx` hat aktuell eine Section „Zeitraum" (Start, Ende, Erinnerung in grid-cols-3 — sehr breit auf großen Bildschirmen), eine Section „Zuordnung" (Verantwortlich + Relation-Felder für Projekte/Meilensteine/Aufgaben) und eine Section „Farbe". Die Sidebar fasst alle diese Felder kompakt zusammen.

**Abhängigkeit:** TASK-124 (FormSidebar-Komponente) muss fertig sein.

## Aufgabe

1. **Äußeres Layout umstellen:** `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Titel (Text-Input, volle Breite)
   - Beschreibung (RichTextInlineField oder Textarea, `toolbar="minimal"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Start (DateTimePicker)
   - Ende (DateTimePicker)
   - Erinnerung (Select/DateTimePicker)
   - Verantwortlich (UserPicker)
   - Projekte (Multi-Select/Relation)
   - Meilensteine (Multi-Select/Relation)
   - Aufgaben (Multi-Select/Relation)
   - Farbe (ColorPicker)

4. **Sections entfernen:** „Zeitraum", „Zuordnung" und „Farbe" als Body-Sections entfernen; alle Felder in die Sidebar verschieben.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- `storageKey="event-form-sidebar"`
- Relation-Felder (Projekte/Meilensteine/Aufgaben) sind möglicherweise aufwändige Multi-Select-Komponenten — nur in die Sidebar verschieben, nicht umbauen
- ColorPicker: sofern vorhanden, nur verschieben, nicht neu implementieren

## Seiteneffekte

- Start/Ende/Erinnerung sind nun vertikal gestapelt (waren horizontal in grid-cols-3) — DateTimePicker muss mit Sidebar-Breite (160–340 px) funktionieren; Dropdown-Kalender öffnet nach unten oder links

## Testanforderungen

- Manuell: Event-Formular öffnen → alle 8 Sidebar-Felder vorhanden und befüllbar
- Manuell: DateTimePicker-Dropdown öffnet korrekt (nicht abgeschnitten)
- Manuell: Farbe wählbar, Relation-Felder befüllbar
- Manuell: Speichern, Validierung funktioniert

## Abnahmekriterien

- Body: Titel + Beschreibung
- Sidebar: Start, Ende, Erinnerung, Verantwortlich, Projekte, Meilensteine, Aufgaben, Farbe
- Kein Formular-Feld fehlt
- DateTimePicker-Dropdowns sind nicht durch Sidebar-Bounds abgeschnitten
- Speichern/Validierung funktioniert unverändert
