# Log: Rote Tests Testhelper

**Datum:** 20.05.26  
**Schritt:** Fix — Rote Tests Testhelper  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die roten Web-Unit-Tests wurden auf testseitige Ursachen geprüft und korrigiert. Mehrere Komponententests renderten Komponenten, die inzwischen `useCatalogs()` verwenden, ohne dafür einen QueryClient oder Hook-Mock bereitzustellen; diese Tests verwenden nun einen stabilen Katalog-Mock. Zusätzlich wurden veraltete Erwartungen an Statusspalten aktualisiert, weil die betroffenen Listen- und Board-Komponenten inzwischen katalogbasierte Statusspalten nutzen. In den E2E-Tests wurden mehrdeutige Playwright-Selektoren für doppelte `Offen`-Labels korrigiert. Produktionscode wurde nicht geändert; die verbleibenden roten Browsertests betreffen Detailseiten-Navigation nach Create/Save und benötigen vor einer Änderung Bestätigung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/__tests__/ProjectFeaturePanel.test.tsx` | geändert | `useCatalogs`-Mock ergänzt |
| `apps/web/src/components/ui/__tests__/FeatureListBoardView.test.tsx` | geändert | `useCatalogs`-Mock ergänzt |
| `apps/web/src/components/ui/__tests__/BacklogListBoardView.test.tsx` | geändert | `useCatalogs`-Mock und katalogbasierte Statusspalten-Erwartung ergänzt |
| `apps/web/src/components/ui/__tests__/UseCaseListBoardView.test.tsx` | geändert | `useCatalogs`-Mock und Feature-Statusspalten-Erwartung ergänzt |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | geändert | `useCatalogs`-Mock und Arbeitsstatusspalten-Erwartung aktualisiert |
| `apps/web/src/components/ui/__tests__/FeatureProjectPanel.test.tsx` | geändert | `useCatalogs`-Mock und Arbeitsstatusspalten-Erwartung aktualisiert |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | geändert | `useCatalogs`-Mock und mehrdeutige Statusspalten-Selektoren aktualisiert |
| `apps/web/src/components/ui/__tests__/MilestoneListBoardView.test.tsx` | geändert | `useCatalogs`-Mock ergänzt |
| `apps/web/src/components/features/__tests__/FeatureDetail.test.tsx` | geändert | `useCatalogs`-Mock ergänzt |
| `apps/web/e2e/freshness.spec.ts` | geändert | Mehrdeutige `Offen`-Selektoren präzisiert |
| `apps/web/e2e/task.spec.ts` | geändert | Mehrdeutigen `Offen`-Heading-Selektor präzisiert |
| `logs/2026-05-20-fix-rote-tests-testhelper.md` | neu | Schritt-Log für die Test- und Helper-Fixes |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die Web-Unit-Tests sind nach den Testfixes vollständig grün. Die Browsertests sind besser, aber nicht vollständig grün: Nach den Selector-Fixes bestehen 31 von 42 E2E-Tests, 11 bleiben rot. Diese 11 Fälle haben dasselbe Muster: Nach Create oder Save navigiert die App auf `returnTo` zurück, während die bestehenden E2E-Specs eine kanonische Detailroute wie `/projects/:id`, `/features/:id`, `/tasks/:id?...` oder `/tickets/:id?...` erwarten. Das ist kein reiner Test-/Fixture-Fehler, sondern betrifft Produktionscode-Verhalten in den Detailseiten/Formularen und wurde deshalb nicht geändert.

## Offene Punkte / Folgeaufgaben

Benötigt eine Entscheidung: Soll das Produktverhalten so angepasst werden, dass Detailseiten nach Create/Save auf der kanonischen Detailroute bleiben, statt automatisch `returnTo` zu öffnen? Wenn ja, sind die betroffenen Page/Form-Verdrahtungen für Project, Feature, Milestone, Task und Ticket gezielt anzupassen und anschließend die 11 E2E-Fälle erneut auszuführen.
