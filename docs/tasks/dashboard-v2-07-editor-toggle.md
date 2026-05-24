# Codex-Auftrag: Dashboard-Editor als Toggle statt permanenter Toolbar

## Problem

Die aktuelle `DashboardView`-Komponente zeigt oberhalb des Dashboards eine dauerhaft sichtbare Toolbar mit Dashboard-Picker, „Neues Dashboard"-Button und „Bearbeiten"-Button. Diese Toolbar nimmt dauerhaft Platz ein und wirkt im Kontext von Detailseiten (Projektdetails, Meilensteindetails) überladen.

## Gewünschtes Verhalten

- Die Toolbar entfällt als dauerhaft sichtbares Element.
- Stattdessen gibt es pro Dashboard einen kleinen, unauffälligen **Toggle-Button** (z. B. ein Zahnrad- oder Stift-Icon, `Settings2` oder `SlidersHorizontal` aus lucide), der den Editor-Container ein- und ausblendet.
- Der Toggle-Button sitzt dezent in der rechten oberen Ecke des Dashboard-Bereichs (oder direkt neben dem Dashboard-Picker, falls dieser bestehen bleibt).
- Der Dashboard-Picker (Auswahl zwischen mehreren Dashboards) bleibt sichtbar, aber kompakter — z. B. als kleines Dropdown ohne Label.
- Beim Klick auf den Toggle-Button wird ein Bearbeitungs-Panel eingeblendet, das Buttons für „Neues Dashboard", „Bearbeiten" und „Als Standard setzen" enthält. Beim erneuten Klick schließt sich das Panel wieder.
- Der `DashboardBuilder`-Dialog (Modal) bleibt unverändert — er öffnet sich wie bisher beim Klick auf „Bearbeiten" oder „Neues Dashboard".

## Implementierung

### `apps/web/src/components/dashboard/DashboardView.tsx`

1. **State hinzufügen:**
   ```ts
   const [editorOpen, setEditorOpen] = useState(false);
   ```

2. **Aktuelle Toolbar ersetzen:**
   Die bisherige `<div className="flex flex-wrap items-end justify-between ...">` mit Picker und Buttons wird ersetzt durch:
   
   - Eine kompakte Zeile mit Dashboard-Picker (links) und Toggle-Button (rechts).
   - Darunter: ein konditionell gerendertes Bearbeitungs-Panel (`editorOpen && <EditorPanel ... />`).

3. **Toggle-Button:**
   ```tsx
   <Button
     variant="ghost"
     icon={<SlidersHorizontal size={16} />}
     onClick={() => setEditorOpen((open) => !open)}
     aria-label="Dashboard bearbeiten"
     title="Dashboard bearbeiten"
     className="h-8 w-8 px-0"
   />
   ```

4. **Bearbeitungs-Panel** (nur wenn `editorOpen && canWrite`):
   ```tsx
   <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-shell p-3">
     <Button icon={<Plus size={16} />} onClick={() => openBuilder(null)}>
       Neues Dashboard
     </Button>
     <Button variant="primary" icon={<Pencil size={16} />} onClick={() => openBuilder(selectedDashboard)}>
       Bearbeiten
     </Button>
   </div>
   ```

5. **Dashboard-Picker** bleibt in der kompakten Kopfzeile sichtbar (auch ohne `editorOpen`), damit der Nutzer jederzeit zwischen Dashboards wechseln kann.

6. **`showHeader`-Prop:** Die bisherige Logik mit `showHeader` (PageHeader vs. h2-Überschrift) kann vereinfacht werden, da die Toolbar nun separat gehandhabt wird.

## Abnahmekriterien

- Beim Laden einer Dashboard-Seite ist kein Bearbeitungs-Panel sichtbar.
- Ein kleiner Toggle-Button ist rechts neben dem Dashboard-Picker sichtbar (nur für Nutzer mit Schreibrecht).
- Klick auf Toggle-Button → Bearbeitungs-Panel erscheint; erneuter Klick → Panel verschwindet.
- Der Dashboard-Builder öffnet sich wie bisher als Modal.
- Der Dashboard-Picker (Wechsel zwischen Dashboards) bleibt immer sichtbar.
- Für Nutzer ohne Schreibrecht ist kein Toggle-Button sichtbar.
- TypeScript-Kompilierung fehlerfrei.
