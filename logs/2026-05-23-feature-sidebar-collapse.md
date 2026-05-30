# Log: Sidebar Collapse

**Datum:** 23.05.26  
**Schritt:** Feature — TASK-38 Sidebar Collapse / Expand  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Sidebar wurde um einen lokalen Collapse-/Expand-Zustand erweitert. Der Zustand wird unter `ui.sidebar.collapsed` in `localStorage` gespeichert und beim Mount der Komponente wieder eingelesen. Im collapsed Zustand zeigt die Navigation nur Icons, blendet Suche, Abschnittsüberschriften, Refresh-Button, User-Details und den ausführlichen Serverstatus aus und zeigt Standalone-Links als dauerhaft sichtbares Badge. Im expanded Zustand füllen die Navigationseinträge die Sidebar-Breite aus; Labels verwenden flexiblen Platz und die Tab-Buttons bleiben rechtsbündig. Backend, API, Datenmodell, Berechtigungen und Routen wurden nicht geändert.

Bei den Tests wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Betroffene Testebene ist Unit/jsdom; bewiesen werden Toggle-Verhalten, Persistenz, initiales Lesen aus `localStorage`, collapsed Rendering und das bestehende Standalone-Tab-Verhalten. Die Tests verwenden echte `CurrentUser`-Fixtures, echten `MemoryRouter` und isolierten DOM-`localStorage`; `window.open` und `useHealthCheck` sind als externe Seiteneffekte gemockt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Collapse-State, Toggle-Button, collapsed/expanded Rendering und ausgerichtete Nav-Items |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Unit-Tests für Toggle, Persistenz, collapsed Rendering und Standalone-Badge ergänzt |
| `logs/2026-05-23-feature-sidebar-collapse.md` | neu | Schritt-Log zu TASK-38 |
| `logs/README.md` | geändert | Log-Index um TASK-38 ergänzt |

## Probleme und Abweichungen

Der gezielte Sidebar-Testlauf war grün: `npm run test -w apps/web -- ../../tests/unit/web/components/layout/Sidebar.test.tsx` mit 10/10 bestandenen Tests. Der Typecheck war ebenfalls grün: `npm run typecheck -w apps/web`. Der vollständige Web-Testlauf `npm run test -w apps/web` ist jedoch rot mit fünf bestehenden, nicht TASK-38-bezogenen UI-Testfehlern in `StatusPill.test.tsx`, `ListBoardView.test.tsx` und `ProjectForm.test.tsx`. Diese Fehler wurden gemäß Regel „keine Regressions-Fixes während Tests“ nicht behoben.

Abweichung vom Aufgabenbeispiel: Das collapsed ExternalLink-Badge verwendet `rounded-md` statt `rounded-full`, weil die verbindlichen Design-Richtlinien `rounded-full` für Schaltflächen verbieten.

## Offene Punkte / Folgeaufgaben

Die nicht TASK-38-bezogenen roten Web-Unit-Tests müssen in einem separaten Folgeauftrag bewertet oder korrigiert werden, wenn der vollständige Web-Testlauf wieder grün sein soll.
