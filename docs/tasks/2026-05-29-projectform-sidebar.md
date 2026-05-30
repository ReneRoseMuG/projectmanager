# Codex-Auftrag: ProjectForm – Sidebar-Integration & Layout vereinheitlichen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-128

---

## Ziel

Das Projekt-Formular (`ProjectForm.tsx`) auf die neue einheitliche Formular-Struktur umstellen: Titel + Beschreibung im Body, alle Metadaten-Felder in der `FormSidebar`.

## Hintergrund & Kontext

Das aktuelle Projekt-Formular hat eine Section „Status" mit Status + Verantwortlich in einer Zeile (grid-cols-2), darunter eine Section mit Von/Bis-Datumsfeldern, und Tags. Auf breiten Bildschirmen werden diese Felder sehr weit. Die Sidebar-Lösung stapelt alle Metadaten vertikal in fixer Breite (160–340 px).

**Abhängigkeit:** TASK-124 (FormSidebar-Komponente) muss fertig sein.

## Aufgabe

1. **Äußeres Layout umstellen:**
   ```tsx
   // Alt: Body allein
   // Neu: flex-row Container
   <div className="flex min-h-0 flex-1">
     <div className="flex-1 overflow-auto p-4 md:p-5 space-y-4">
       {/* Body */}
     </div>
     <FormSidebar storageKey="project-form-sidebar">
       {/* Metadaten */}
     </FormSidebar>
   </div>
   ```

2. **Body enthält nur noch:**
   - Titel (Text-Input, volle Breite)
   - Beschreibung (RichTextInlineField, `toolbar="full"`)

3. **Sidebar enthält (in dieser Reihenfolge):**
   - Status (Select)
   - Verantwortlich (UserPicker)
   - Von (DatePicker)
   - Bis (DatePicker)
   - Tags (TagPicker)

4. **Section-Labels in der Sidebar:** Jedes Feld bekommt ein `<label>`-Element; die Sidebar übernimmt das `p-4 space-y-4`-Layout.

5. **Sections im Body entfernen:** Die bisherige Section „Status" und die Datums-Section im Body entfernen.

## Technische Leitplanken

- `FormSidebar` aus `@/components/ui/FormSidebar` importieren
- State-Handling (formState, onChange) bleibt unverändert — nur Layout-Änderungen
- Kein Breaking Change an Props von `ProjectForm`

## Seiteneffekte

- Detail-Page: Sidebar erscheint rechts neben dem Formular-Body
- Modal: Sidebar erscheint rechts; Modal-Höhe begrenzt die Sidebar (Scroll-Container in FormSidebar übernimmt)

## Testanforderungen

- Manuell: Formular in Detail-Page öffnen → Sidebar ist sichtbar, kollabierbar, resizable
- Manuell: Formular im Modal öffnen → Sidebar bleibt innerhalb der Modal-Grenzen
- Manuell: Alle Felder befüllbar, Speichern funktioniert

## Abnahmekriterien

- Titel und Beschreibung liegen im Body, alle Metadaten in der Sidebar
- Sidebar-Felder haben korrekte Labels
- Kein Formular-Feld fehlt gegenüber dem bisherigen Stand
- Speichern/Validierung funktioniert unverändert
