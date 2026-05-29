# Codex-Auftrag: TaskForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-130

---

## Ziel

Das Aufgaben-Formular (`TaskForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen: Titel + Beschreibung im Body, alle Metadaten-Felder in der `FormSidebar`.

## Hintergrund & Kontext

`TaskForm.tsx` ist ein großes Formular mit Tabs. Der Details-Tab enthält aktuell: Titel + Beschreibung (ohne Section-Label), eine Section „Status, Priorität & Fälligkeit" (grid-cols-3), eine Section „Zuständigkeit" (grid-cols-2, nur 1 Feld) und eine Section „Tags". Auf breiten Bildschirmen werden Status, Priorität und Fällig-Datepicker sehr breit. Die Sidebar löst das Problem strukturell.

**Abhängigkeit:** TASK-124 (FormSidebar-Komponente) muss fertig sein.

## Aufgabe

1. **Äußeres Layout des Details-Tabs umstellen:**
   ```tsx
   <div className="flex min-h-0 flex-1">
     <div className="flex-1 overflow-auto p-4 md:p-5 space-y-4">
       {/* Body */}
     </div>
     <FormSidebar storageKey="task-form-sidebar">
       {/* Metadaten */}
     </FormSidebar>
   </div>
   ```

2. **Body enthält nur noch:**
   - Section-Label „Stammdaten" (war bisher ohne Label)
   - Titel (Text-Input, volle Breite)
   - Beschreibung (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Priorität (Select)
   - Fällig (DatePicker)
   - Verantwortlich (UserPicker) — war bisher in grid-cols-2 mit halber Breite; in Sidebar volle Breite
   - Tags (TagPicker)

4. **Sections entfernen:** „Status, Priorität & Fälligkeit", „Zuständigkeit" und „Tags" als eigenständige Sections entfernen.

5. **`contentClassName`:** Der bestehende `contentClassName="w-full max-w-7xl self-center"` auf den Tab-Containern bleibt, betrifft aber nur den Tab-Wrapper; der innere Flex-Container kommt neu dazu.

## Technische Leitplanken

- Nur den Details-Tab umbauen; andere Tabs (z.B. Kommentare, Subtasks) bleiben unverändert
- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- State-Handling unverändert

## Seiteneffekte

- Verantwortlich-Feld ist in der Sidebar nun volle Breite (war bisher halbe grid-Breite) — UserPicker muss mit voller Sidebar-Breite funktionieren

## Testanforderungen

- Manuell: Details-Tab öffnen → Sidebar rechts, alle Felder befüllbar
- Manuell: Speichern, Validierung funktioniert
- Manuell: Andere Tabs unverändert

## Abnahmekriterien

- Body: Titel + Beschreibung mit Section-Label „Stammdaten"
- Sidebar: Status, Priorität, Fällig, Verantwortlich, Tags in korrekter Reihenfolge
- Kein Formular-Feld fehlt
- Speichern/Validierung funktioniert unverändert
