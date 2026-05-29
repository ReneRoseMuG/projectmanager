# Codex-Auftrag: FormSidebar – Shared-Komponente entwickeln

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-124

---

## Ziel

Eine neue Shared-Komponente `FormSidebar` erstellen, die in alle Stammdatenformulare als rechte, kollabierbare, drag-resizable Sidebar integriert werden kann. Die Komponente ist Voraussetzung für alle formularspezifischen Redesign-Tasks (TASK-128 bis TASK-135).

## Hintergrund & Kontext

Stammdatenformulare in der Projekt Manager App leiden unter sehr breiten Eingabefeldern (Datepicker, UserPicker etc. können auf großen Bildschirmen 400–500 px breit werden). Eine fixe rechte Sidebar löst das Problem strukturell: Metadaten-Felder werden dort gestapelt und durch die Sidebar-Breite automatisch begrenzt. Die Sidebar muss in zwei Aufruf-Kontexten funktionieren: als Teil einer Detail-Page (volle Viewport-Höhe) und als Teil eines Modals (Höhe durch Modal begrenzt).

## Aufgabe

1. **Neue Datei erstellen:** `apps/web/src/components/ui/FormSidebar.tsx`

2. **Props-Interface:**
   ```typescript
   interface FormSidebarProps {
     children: React.ReactNode
     defaultWidth?: number      // default: 240
     storageKey?: string        // default: "form-sidebar"
     className?: string
   }
   ```

3. **Kollaps-Verhalten:**
   - Toggle-Button mit Icon `‹` (ausgeklappt) / `›` (eingeklappt) am linken Rand der Sidebar
   - Im kollabierten Zustand: schmaler Strip (~32 px) mit vertikalem Label „Stammdaten" (rotiert)
   - Übergänge per CSS `transition` (width, opacity)

4. **Drag-to-Resize:**
   - Drag-Handle am linken Rand der Sidebar (4 px breite Zone, cursor `col-resize`)
   - `onMouseDown` → globales `mousemove`/`mouseup` in `useEffect`
   - Min-Breite: 160 px, Max-Breite: 340 px
   - Während des Drags: `user-select: none` auf `document.body`

5. **localStorage-Persistenz:**
   ```typescript
   // Schlüssel: `${storageKey}-width` und `${storageKey}-collapsed`
   // Beim Mount: gespeicherten Wert lesen und als initialState verwenden
   // Bei Änderung: debounced (300 ms) speichern
   ```

6. **Scroll-Container:**
   - Sidebar-Inhalt in `div` mit `overflow-y: auto`, `flex-1`, `min-h-0`
   - Wichtig: Funktioniert sowohl in `height: 100%`-Kontexten (Detail-Page) als auch in flex-Spalten-Layouts (Modal)

7. **Styling:**
   - Hintergrund: `bg-background-secondary` (CSS-Variable `--color-background-secondary`)
   - Linke Trennlinie: `border-l border-border`
   - Section-Abstände innen: `p-4 space-y-4`

8. **Integration in Formular-Layout:**
   ```tsx
   // Formulare werden zu einem flex-row Container:
   <div className="flex min-h-0 flex-1">
     <div className="flex-1 overflow-auto p-4 md:p-5">
       {/* Body: Titel + Beschreibung */}
     </div>
     <FormSidebar storageKey="task-form-sidebar">
       {/* Metadaten-Felder */}
     </FormSidebar>
   </div>
   ```

## Technische Leitplanken

- Kein externer Drag-Library — pure Pointer/Mouse Events
- `localStorage`-Zugriff immer in `try/catch` (SSR-Kompatibilität, Privacy-Mode)
- Keine feste Höhe setzen — Sidebar füllt den verfügbaren Platz des Parent-Flex-Containers
- Die Komponente muss in `FormModal` (begrenzte Höhe) und Detail-Page (volle Höhe) funktionieren ohne Layout-Änderungen außerhalb der Sidebar
- Tailwind-Klassen bevorzugen; Inline-Styles nur für dynamische Werte (width)

## Seiteneffekte

- Alle Formular-Komponenten, die `FormSidebar` integrieren, müssen ihr äußeres Layout zu `flex flex-row` umstellen
- `FormModal.tsx` oder das übergeordnete Layout darf kein `overflow: hidden` auf dem Form-Body-Container haben, da sonst der Sidebar-Scroll nicht funktioniert

## Testanforderungen

- Unit: Render mit/ohne `children`, Kollaps-Toggle ändert CSS-Klasse, localStorage wird gelesen/geschrieben
- Manuell: Drag-Resize in Detail-Page und Modal; Kollaps persistiert nach Reload; Scroll funktioniert bei kurzem Viewport

## Abnahmekriterien

- Sidebar rendert rechts neben dem Form-Body
- Toggle-Button kollabiert/expandiert die Sidebar mit Transition
- Drag-Handle ändert die Breite zwischen 160 und 340 px
- Breite und Kollaps-Zustand überleben einen Browser-Reload
- In einem Modal bleibt die Sidebar innerhalb der Modal-Höhe (kein Overflow)
- Auf schmalen Viewports (< 768 px) ist die Sidebar standardmäßig kollabiert
