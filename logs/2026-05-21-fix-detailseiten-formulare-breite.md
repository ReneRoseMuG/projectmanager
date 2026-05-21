# Log: Detailseiten-Formulare Breite

**Datum:** 21.05.26  
**Schritt:** Fix — Detailseiten-Formulare Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Detailseiten-Wrapper der Formularseiten nutzen nun die volle Breite des verfügbaren Main-Bereichs. Dafür wurde die bisherige Zentrierung mit `mx-auto` und die Breitenbegrenzung `max-w-7xl` auf den betroffenen Detailrouten entfernt. Stattdessen verwenden die Wrapper `w-full` und `min-w-0`, damit die bestehende Formular-Shell horizontal sauber wachsen kann. Die gemeinsame `FormModal`-Shell, die Sticky-TabBar, der Footer und die Modal-Variante bleiben unverändert. Ergänzend wurden Page-Unit-Tests um Assertions erweitert, die gegen eine Rückkehr zur alten Maximalbreite absichern.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Create- und Edit-Wrapper nutzen volle Breite. |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Detailseiten-Wrapper nutzt volle Breite. |
| `tests/unit/web/pages/ProjectDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/MilestoneDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/TaskDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/TicketDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/FeatureDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/UseCaseDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |
| `tests/unit/web/pages/BacklogItemDetailPage.test.tsx` | geändert | Layout-Regressionstest für volle Detailseitenbreite ergänzt. |

## Probleme und Abweichungen

Der Codex-Browser-Plugin-Zugang stand in dieser Sitzung nicht zur Verfügung, weil die erforderliche Node-Repl-Ausführung per Toolsuche nicht gefunden wurde. Die Layout-Änderung wurde daher über gezielte Web-Unit-Tests und den Web-Build verifiziert. Der Web-Build meldet weiterhin nur die bekannte Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.

## Ausgeführte Prüfungen

- `npm run test -w apps/web -- ProjectDetailPage MilestoneDetailPage TaskDetailPage TicketDetailPage FeatureDetailPage UseCaseDetailPage BacklogItemDetailPage` — grün, 7 Testdateien / 29 Tests.
- `npm run build -w apps/web` — grün, mit bekannter Vite-Chunk-Size-Warnung.
