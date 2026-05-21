# Log: Kommentar-Platzhalter

**Datum:** 21.05.26  
**Schritt:** 4 — Kommentar-Platzhalter entfernen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Shared-Type `Comment` enthält kein Autorenfeld, daher wurde kein neuer Autorenname erfunden. Stattdessen wurden Avatar- und Autorenblock aus `CommentThread` entfernt; das Datum bleibt sichtbar. Die statischen UI-Elemente „0 Reaktionen“ und „Antworten“ wurden entfernt. Erstellung und Löschung von Kommentaren bleiben unverändert und sind durch bestehende Unit- und Integrationstests abgesichert.

## Geänderte / angelegte Dateien

| Datei                                                                    | Art         | Kurzbeschreibung                                    |
| ------------------------------------------------------------------------ | ----------- | --------------------------------------------------- |
| `apps/web/src/components/ui/CommentThread.tsx`                           | geändert    | Platzhalterautor, Avatar und tote Elemente entfernt |
| `tests/unit/web/components/ui/CommentThread.test.tsx`                    | geändert    | negative Assertions für Platzhalter ergänzt         |
| `tests/integration/web/components/ui/CommentThread.integration.test.tsx` | unverändert | bestehende API-Hook-Integration blieb grün          |

## Probleme und Abweichungen

Von der Task-Variante „echten Autor anzeigen“ wurde bewusst abgewichen, weil kein Autorenfeld im öffentlichen `Comment`-DTO vorhanden ist. Die übergreifende E2E-Abnahme bleibt wegen unveränderter Kalender-Specs blockiert.

## Offene Punkte / Folgeaufgaben

Falls Autoren angezeigt werden sollen, braucht das einen separaten API-/Shared-Type-Auftrag mit Auth-/DTO-Entscheidung.
