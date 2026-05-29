# Codex-Auftrag: UseCaseForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-133

---

## Ziel

Das Use-Case-Formular (`UseCaseForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen. Zusätzlich: Tags hinzufügen (bisher fehlend).

## Hintergrund & Kontext

`UseCaseForm.tsx` hat aktuell eine Section „Status & Sortierung" (Status + Sortierung grid-cols-[1fr_10rem]), eine Section „Kurzbeschreibung", eine Section „Zuordnung" (nur Verantwortlich) und den Inhalt (RichText). Das neue Layout entfernt die aufzulösenden Felder und stapelt die Metadaten in der Sidebar.

**Abhängigkeiten:**
- TASK-122: Kurzbeschreibung und Sortierung entfernen
- TASK-123: ParentContextField (falls Use Cases parents haben)
- TASK-124: FormSidebar-Komponente

## Aufgabe

1. **Äußeres Layout umstellen:** `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Section-Label „Stammdaten" (neu)
   - Titel (Text-Input, volle Breite)
   - Inhalt (RichTextInlineField, `toolbar="full"`) — war bisher ohne eigene Section, bleibt als einziger Body-Content neben Titel

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Verantwortlich (UserPicker)
   - Tags (TagPicker) — **neu**, bisher nicht vorhanden

4. **Entfernen:**
   - Section „Status & Sortierung": entfernen; Status → Sidebar, Sortierung → entfernt (TASK-122)
   - Section „Kurzbeschreibung": entfernen (TASK-122)
   - Section „Zuordnung" (standalone): entfernen; Verantwortlich → Sidebar

5. **Tags-Feld:** Analog zu FeatureForm (TASK-132) — prüfen ob Backend `tags` für UseCases unterstützt.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- `storageKey="usecase-form-sidebar"`
- State-Handling für entfernte Felder analog TASK-122

## Testanforderungen

- Manuell: Formular öffnen → Sidebar rechts, keine Kurzbeschreibung, keine Sortierung
- Manuell: Alle verbleibenden Felder befüllbar, Speichern funktioniert

## Abnahmekriterien

- Body: Titel + Inhalt mit Section-Label „Stammdaten"
- Sidebar: Status, Verantwortlich, Tags
- Keine Kurzbeschreibung, keine Sortierung im Formular
- Speichern/Validierung funktioniert unverändert
