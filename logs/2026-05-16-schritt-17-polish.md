# Log: Polish

**Datum:** 16.05.26  
**Schritt:** 17 — Polish (Skeletons, Leerzustände, Überfällig-Highlighting, Toast)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Leerzustände und Ladezustände wurden in den wichtigsten Listen und Seiten ergänzt. Überfällige Aufgaben werden visuell hervorgehoben. Die UI verwendet konsistente Buttons, Badges, Modals, Selects und Date-Picker. Der Vite-Produktionsbuild läuft erfolgreich durch.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Button.tsx` | neu | Button-Basis |
| `apps/web/src/components/ui/Badge.tsx` | neu | Badge-Basis |
| `apps/web/src/components/ui/Modal.tsx` | neu | Modal-Basis |
| `apps/web/src/components/ui/Select.tsx` | neu | Select-Basis |
| `apps/web/src/components/ui/DatePicker.tsx` | neu | Datumsfeld |
| `apps/web/src/styles.css` | neu | Tailwind- und App-Stile |
| `apps/web/src/utils/date.ts` | neu | Datumsformatierung |

## Probleme und Abweichungen

Toast-Komponenten und echte Skeleton-Komponenten wurden noch nicht separat umgesetzt; es gibt einfache Lade- und Leerzustände.

## Offene Punkte / Folgeaufgaben

Toast-System und Skeleton-Komponenten ergänzen, wenn der Native-Blocker gelöst ist.
