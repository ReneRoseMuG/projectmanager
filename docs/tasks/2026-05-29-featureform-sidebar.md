# Codex-Auftrag: FeatureForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-132

---

## Ziel

Das Feature-Formular (`FeatureForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen. Zusätzlich: dauerhaftes Parent-Projekt-Feld entfernen (ersetzt durch TASK-123), Tags hinzufügen (bisher fehlend).

## Hintergrund & Kontext

`FeatureForm.tsx` hat aktuell eine Section „Parent-Projekt" (dauerhaft sichtbar, auch wenn bereits im Projekt-Kontext geöffnet), eine Section „Status" (Status + Verantwortlich grid-cols-2), Titel mit Sortierung (grid-cols-[1fr_10rem]), eine Kurzbeschreibung und den Inhalt (RichText). Das neue Layout entfernt redundante Felder und vereinheitlicht die Struktur.

**Abhängigkeiten:**
- TASK-122: Kurzbeschreibung und Sortierung entfernen
- TASK-123: ParentContextField ersetzt die dauerhafte Parent-Projekt-Section
- TASK-124: FormSidebar-Komponente

## Aufgabe

1. **Äußeres Layout umstellen:** `flex flex-row` Container mit Body und Sidebar.

2. **Body enthält nur noch:**
   - Section-Label „Stammdaten" (neu)
   - Titel (Text-Input, volle Breite — kein Sortierung-Grid mehr)
   - Inhalt (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select — featureStatus: draft/active/done)
   - Verantwortlich (UserPicker)
   - Tags (TagPicker) — **neu**, bisher nicht vorhanden

4. **Entfernen:**
   - Section „Parent-Projekt" mit dauerhaftem Parent-Select: entfernen (wird durch `ParentContextField` aus TASK-123 ersetzt, das nur ohne Kontext angezeigt wird)
   - Section „Kurzbeschreibung": entfernen (TASK-122)
   - Sortierung-Feld (grid-col-10rem neben Titel): entfernen (TASK-122)

5. **Tags-Feld:** Wenn `TagPicker`-Komponente existiert (in TaskForm/TicketForm vorhanden), analog integrieren. State: `tags: string[]` im formState; API-Payload entsprechend ergänzen.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- `storageKey="feature-form-sidebar"`
- Tags-API: prüfen, ob Feature bereits ein `tags`-Feld in API und DB hat; falls nicht, ist das eine separate Backend-Aufgabe — Frontend kann `tags: []` als Dummy implementieren und das Feld deaktivieren bis Backend ready
- Kein Breaking Change an bestehenden Feature-Daten

## Seiteneffekte

- Sortierung und Kurzbeschreibung-Felder verschwinden aus der UI; DB-Werte bleiben erhalten (TASK-122 setzt server-seitige Defaults)
- Parent-Projekt-Feld verschwindet dauerhaft; `ParentContextField` (TASK-123) erscheint automatisch ohne Kontext

## Testanforderungen

- Manuell: Feature aus Projekt-Kontext öffnen → kein Parent-Feld, kein Kurzbeschreibung-Feld, keine Sortierung
- Manuell: Feature aus globaler Liste öffnen → `ParentContextField` erscheint oben
- Manuell: Tags-Feld ist befüllbar (wenn Backend unterstützt)
- Manuell: Speichern, Validierung funktioniert

## Abnahmekriterien

- Body: Titel (ohne Sortierung) + Inhalt
- Sidebar: Status, Verantwortlich, Tags
- Keine Kurzbeschreibung, keine Sortierung, keine dauerhafte Parent-Section im Formular
- Speichern/Validierung funktioniert unverändert
