# Log: Sidebar-Navigation Breite

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar-Navigation Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die expanded Sidebar wurde so angepasst, dass ihre Breite von der Navigationsspalte plus der separaten „in neuem Tab öffnen“-Buttonspalte bestimmt wird. Die querlaufenden Sidebar-Elemente wie Kopfzeile, Collapse-Button, Suche, Serverstatus und Benutzerbereich behalten die volle verfügbare Breite, beeinflussen aber nicht mehr die intrinsische Navigationsbreite. Die rechte Außenkante der expanded Sidebar liegt dadurch am rechten Rand der Tab-Buttons. Collapse-Zustand, Permission-Filterung, Linkziele und Standalone-Öffnen bleiben unverändert.

Testleitplanken angewendet: Testebene Unit/jsdom; geprüft wird die echte Sidebar-Komponente mit MemoryRouter, echten User-Fixtures und isoliertem `localStorage`. `window.open` und `useHealthCheck` bleiben als externe Seiteneffekte gemockt. Zusätzlich wurde eine lokale Chromium-Messung mit minimaler Tailwind-Struktur ausgeführt, um die CSS-Breitenwirkung sichtbar zu prüfen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Expanded Sidebar-Breite an Navigation plus Tab-Button-Spalte gebunden |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Erwartung für schmale expanded Sidebar und Grid-Struktur angepasst |
| `logs/2026-05-24-fix-sidebar-nav-breite.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die vorhandene Arbeitskopie enthielt bereits uncommitted Änderungen an Sidebar, Sidebar-Test und weiteren Dateien; diese wurden nicht zurückgesetzt.

## Offene Punkte / Folgeaufgaben

Keine.
