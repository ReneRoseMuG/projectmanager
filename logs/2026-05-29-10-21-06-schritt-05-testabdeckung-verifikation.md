# Log: Testabdeckung und Verifikation

**Datum:** 29.05.26  
**Uhrzeit:** 10:21:06  
**Schritt:** 5 — Testabdeckung und Verifikation  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Testabdeckung für den MS-25-Wiki-Redesign-Plan wurde gezielt geprüft und ergänzt. Der Testentwurfs-Skill wurde angewendet; betroffen sind Unit-Tests für Wiki-Komponenten und Wiki-Seite sowie der bestehende Browser/E2E-Flow für Wiki-Kommentare. Bewiesen werden der dunkle WikiTree mit Root-/Child-Create und Expand/Collapse, das Inline-Formular ohne Modal-Zwischenstufe, Journal-Permission-Gating, Delete-Aktion, Dirty-Navigation sowie der weiterhin bestehende Create-Flow. Die gezielten Wiki-Unit-Tests laufen grün. Die vollständigen Pflichtkommandos wurden seriell ausgeführt; bestehende Fremdfehler und ein E2E-Infrastrukturblocker verhindern aktuell die vollständige Abnahme.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/components/wiki/WikiTree.test.tsx` | neu | Unit-Tests für Dark-Sidebar, Create-Aktionen und Expand/Collapse |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Unit-Tests für Inline-Modus, Journal-Gating, Delete und Save-Verhalten |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | Unit-Tests für Two-Pane-Rendering, Create-Modal und Dirty-Navigation |
| `tests/browser/web/create-child-elements.spec.ts` | geändert | Wiki-E2E-Erwartung auf Inline-Detailbereich angepasst |
| `logs/2026-05-29-10-21-06-schritt-05-testabdeckung-verifikation.md` | neu | Verifikations- und Testabdeckungslog |
| `logs/README.md` | geändert | Log-Index um Verifikationseintrag ergänzt |

## Testleitplanken und Testebenen

Testebenen: Unit und Browser/E2E. Unit-Tests nutzen gemockte API-/Query-Hooks und prüfen beobachtbares UI-Verhalten ohne echte Backend-Verbindung. Der Browser/E2E-Test nutzt den bestehenden echten E2E-Fluss und die vorhandene Testisolation des Web-Testsetups; er konnte wegen belegtem Health-Port nicht starten. Die geprüften Negativfälle umfassen fehlende Journal-Permission und abgebrochene Dirty-Navigation.

## Ausgeführte Prüfungen

| Kommando | Status | Ergebnis |
|---|---|---|
| `npm run test -w apps/web -- --run ../../tests/unit/web/components/wiki/WikiTree.test.tsx ../../tests/unit/web/components/wiki/WikiPageForm.test.tsx ../../tests/unit/web/pages/WikiPage.test.tsx` | ✅ | 3 Testdateien, 17 Tests grün |
| `npm run test -w apps/web` | ⚠️ | 4 Testdateien fehlgeschlagen, 86 grün; 30 Tests fehlgeschlagen, 529 grün |
| `npm run build -w apps/web` | ⚠️ | TypeScript-Build blockiert durch bestehenden Fehler in `ParentBadge.tsx` |
| `npm run e2e -w apps/web` | ⚠️ | Keine Tests ausgeführt, da `http://127.0.0.1:3101/health` bereits belegt ist |
| `git diff --check` | ✅ | Keine Whitespace-Fehler; nur CRLF-Warnungen |

## Probleme und Abweichungen

Der vollständige Web-Unit-Testlauf scheitert weiterhin in nicht durch MS-25 geänderten Testbereichen: `rich-text-inline-field.test.tsx` mit fehlender Editor-Selection, `BacklogItemForm.test.tsx` und `MilestoneForm.test.tsx` mit fehlendem `QueryClientProvider`, sowie `TaskListBoardView.test.tsx` mit abweichender overdue-Klasse. Der Web-Build scheitert an `apps/web/src/components/ui/ParentBadge.tsx`, weil im `Record<VisibleParentType, string>` der Eintrag `ticket` fehlt. Der E2E-Lauf ist infrastrukturell blockiert, weil der Health-Port `3101` bereits belegt ist. Diese Fremdfehler wurden wegen der Testlauf-Regel nicht eigenständig repariert.

## Offene Punkte / Folgeaufgaben

Die bestehenden Fremdfehler im Web-Testlauf und der Build-Fehler in `ParentBadge.tsx` müssen separat behoben werden. Vor der finalen Abnahme sollte der E2E-Port freigemacht oder die E2E-Konfiguration angepasst werden, damit `npm run e2e -w apps/web` tatsächlich Tests ausführt. Danach sollten die drei Pflichtkommandos erneut seriell laufen.
