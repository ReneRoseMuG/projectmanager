# Log: ListBoardView Testsuite Blocker

**Datum:** 17.05.26  
**Schritt:** 0 — Analyse vor der Umsetzung  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Der Auftrag wurde als Klasse 5 eingestuft und die geforderte Voranalyse wurde gezielt durchgeführt. Gelesen wurden die Auftragsdatei, die fünf `*ListBoardView`-Adapter, `FeatureCard`, `ProjectCard`, `TaskCard`, `UseCaseCard`, `ListBoardView`, `ItemCard`, `ItemRow`, `apps/web/vite.config.ts`, `apps/web/package.json`, `packages/shared-types/src/index.ts` und der bestehende Referenztest `ListBoardView.test.tsx`. Es wurden keine Produktionskomponenten und keine Testdateien angelegt oder geändert. Die Umsetzung wurde kontrolliert gestoppt, weil mehrere Pflicht-Assertions aus dem Auftrag dem aktuellen Produktionsverhalten widersprechen und der Auftrag Produktionscode-Änderungen ausdrücklich ausschließt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-17-schritt-00-listboardview-testsuite-blocker.md` | neu | Blocker-Log für die ListBoardView-Testsuite |
| `logs/README.md` | geändert | Blocker in der Log-Übersicht ergänzt |

## Probleme und Abweichungen

Die Feature-Listenansicht rendert aktuell keine `ItemRow`, sondern erneut `FeatureCard`; `FeatureCard` besitzt keinen `variant="row"` und nutzt ausschließlich `ItemCard`. Damit können die geforderten Row-Dimensionsassertions für `FeatureListBoardView` nicht erfüllt werden, ohne Produktionscode zu ändern.

Backlog und UseCase übergeben aktuell kein `statusKey` und keine `statusColumns` an `ListBoardView`. Im Board-Modus rendert `ListBoardView` deshalb für diese beiden Adapter `CardGrid` statt eines `div.lg:grid-cols-3` mit `section.rounded-lg`-Statusspalten. Die im Auftrag zugleich geforderte Spaltenstruktur für alle fünf Domänenobjekte widerspricht damit der ebenfalls im Auftrag genannten Einschränkung, dass BacklogItem und UseCase kein Board-Status-Splitting haben.

Die Toolbar-Assertion im Auftrag erwartet einen Button mit Accessible Name `Board`. Die vorhandene `ViewToggle`-Komponente rendert jedoch `Liste` und `Kanban`. Außerdem existiert in `apps/web/package.json` kein `test`-Script, sodass der geforderte Befehl `npm run test -w apps/web` aktuell nicht ausführbar wäre.

## Offene Punkte / Folgeaufgaben

Für die Umsetzung wird eine Entscheidung benötigt:

- Entweder Produktionscode-Änderungen freigeben, damit Feature eine echte Row-Variante erhält, Backlog/UseCase optional Statusspalten bekommen und die Toolbar-Benennung bzw. das Web-Testscript angepasst werden kann.
- Oder den Testauftrag explizit auf das aktuelle Produktionsverhalten anpassen: Feature-Listenmodus als cardbasiert testen, Backlog/UseCase-Board als `CardGrid` testen, `Kanban` statt `Board` erwarten und den Testlauf über ein vorhandenes bzw. neu freigegebenes Kommando ausführen.
