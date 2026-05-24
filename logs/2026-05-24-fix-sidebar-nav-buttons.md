# Log: Sidebar-Navigation Buttonhöhe und Breite

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar-Navigation Buttonhöhe und Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der „in Tab öffnen“-Button im expanded Zustand hat jetzt dieselbe Höhe wie die eigentliche Link-Fläche. Die Aktionsspalte verwendet ebenfalls für Platzhalter dieselbe Höhe, damit Einträge ohne Tab-Button das Raster nicht anders beeinflussen. Der aktive Navigationseintrag wird nun dezenter hervorgehoben: kein weißer Vollflächen-Aktivzustand mehr, sondern eine transparente helle Fläche mit dezenter Rahmenbetonung. Die expanded Sidebar nutzt jetzt eine content-orientierte Breite (`w-fit`) mit Mindestbreite, sodass sie sich an den Navigationsflächen und Aktionsbuttons orientiert, statt starr `w-64` zu sein.

Testleitplanken angewendet: Testebene Unit/jsdom; geprüft wird die echte Sidebar-Komponente mit MemoryRouter, echten User-Fixtures und isoliertem `localStorage`. `window.open` und `useHealthCheck` bleiben als externe Seiteneffekte gemockt. Geprüft wurden die gleiche Buttonhöhe, der dezentere aktive Zustand und die content-orientierte expanded Breite.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Tab-Button-Höhe, aktiver Nav-Zustand und expanded Sidebar-Breite angepasst |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Erwartungen für Buttonhöhe, aktiven Zustand und expanded Breite angepasst |
| `logs/2026-05-24-fix-sidebar-nav-buttons.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die vorhandene Arbeitskopie enthielt bereits weitere uncommitted Änderungen; sie wurden nicht berührt.

## Offene Punkte / Folgeaufgaben

Keine.
