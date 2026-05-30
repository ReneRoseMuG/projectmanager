# Log: Tabbar Breadcrumb

**Datum:** 21.05.26  
**Schritt:** 5 — Tab-Zähler und Breadcrumb verbessern  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

`TabBar` rendert Count-Badges nur noch für Werte größer als 0. Positive Badges bleiben sichtbar; dabei wurde zusätzlich ein Leerzeichen für eine bessere accessible name-Berechnung eingefügt. `FormModal` zeigt Breadcrumbs als dezente Punkt-Beschriftung mit `text-white/60`, nicht mehr als Pfeilpfad mit Navigations-Anmutung. Die betroffenen Unit- und Browser-Tests wurden angepasst.

## Geänderte / angelegte Dateien

| Datei                                             | Art      | Kurzbeschreibung                                            |
| ------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `apps/web/src/components/ui/TabBar.tsx`           | geändert | Null-Badges ausgeblendet und positive Counts sauber benannt |
| `apps/web/src/components/ui/FormModal.tsx`        | geändert | Breadcrumb als Punkt-Beschriftung gerendert                 |
| `tests/unit/web/components/ui/TabBar.test.tsx`    | neu      | Null-, Positiv- und Ohne-Count-Fälle abgesichert            |
| `tests/unit/web/components/ui/FormModal.test.tsx` | geändert | Breadcrumb-Darstellung abgesichert                          |
| `tests/browser/web/freshness.spec.ts`             | geändert | Tab-Auswahl bei Null-Counter ohne Badge angepasst           |

## Probleme und Abweichungen

Die TabBar-/Breadcrumb-Tests sind grün. Die vollständige Playwright-Abnahme bleibt wegen Kalender-Specs rot, nicht wegen der Tab-Änderung.

## Offene Punkte / Folgeaufgaben

Kalender-E2E separat prüfen.
