# Log: Formular-Board-Tabs füllen

**Datum:** 20.05.26  
**Schritt:** Fix — Formular-Board-Tabs füllen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Page-Variante von `FormModal` nutzt jetzt eine direkte Viewport-Mindesthöhe über `min-h-[calc(100dvh-4rem)]`. Damit hängt die Form-Karte nicht mehr von einer nicht auflösbaren Prozent-Höhenkette aus Parent-`min-height` ab. Der Page-Body der Formular-Shell hat zusätzlich `min-h-0`, damit der verfügbare Raum sauber an die aktiven Tab-Inhalte weitergegeben wird. `ListBoardView` wurde von einer viewport-basierten Mindesthöhe auf echtes Flex-Füllen umgestellt (`min-h-0 flex-1`), damit leere und kurze Board-/Listenflächen den Raum zwischen TabBar und Footer einnehmen, ohne künstlich zu hoch zu werden. Die bestehenden runden Page-Ecken und die bereits bestätigten Sticky-Positionen von TabBar und Footer bleiben erhalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Page-Form bekommt definite Viewport-Mindesthöhe und Body-`min-h-0`. |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | List/Board-Fläche füllt den Flex-Raum statt eine starre Viewport-Mindesthöhe zu erzwingen. |
| `apps/web/src/components/ui/__tests__/FormModal.test.tsx` | geändert | Erwartung an die neue Page-Höhenklasse und Body-`min-h-0` angepasst. |
| `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | geändert | Erwartung an Flex-Füllverhalten der List/Board-Root angepasst. |

## Probleme und Abweichungen

Der gezielte Playwright-Check `npm run e2e -w apps/web -- e2e/project.spec.ts -g "Projektformular hält Tab Bar und Footer"` konnte nicht bis zum Browser starten. Der API-Webserver bricht vorher beim TypeScript-Build in bestehenden Dump-/Google-Drive-Dateien ab, unter anderem wegen fehlender `AppConfig`-Properties und nicht aufgelöster Dump-Types. Dieser Buildfehler liegt außerhalb des Formular-Layout-Fixes und wurde nicht verändert.

## Offene Punkte / Folgeaufgaben

Sobald der bestehende API-Buildblocker behoben ist, sollte der gezielte Playwright-Check für das Projektformular erneut laufen. Für den hier betroffenen Web-Code sind Komponenten-Tests und Web-Build grün.

## Ausgeführte Prüfungen

- `npm run test -w apps/web -- FormModal ListBoardView` — grün, 8 Testdateien / 45 Tests.
- `npm run test -w apps/web -- ProjectForm FeatureForm TaskForm MilestoneForm UseCaseForm` — grün, 5 Testdateien / 67 Tests.
- `npm run build -w apps/web` — grün; Vite meldet nur die bekannte Chunk-Size-Warnung.
- `npm run test -w apps/web` — grün, 50 Testdateien / 286 Tests.
- `npm run e2e -w apps/web -- e2e/project.spec.ts -g "Projektformular hält Tab Bar und Footer"` — blockiert vor Browserstart durch bestehenden API-TypeScript-Buildfehler.
- `npm run build -w apps/api` — rot; bestehende Dump-/Google-Drive-TypeScript-Fehler blockieren den E2E-Webserver.
