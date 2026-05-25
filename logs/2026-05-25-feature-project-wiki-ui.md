# Log: Project Wiki UI

**Datum:** 25.05.26  
**Schritt:** Feature — Project Wiki UI  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Im Project-Stammdatenformular wurde im Details-Tab eine kompakte Sektion „Projekt Wiki“ ergänzt. Gespeicherte Projekte können dort über einen icon-only Link-Button eine Wiki-Seite auswählen; eine gesetzte Seite erscheint als kleine klickbare Kachel zur Wiki-Detailroute. Der X-Button löst die Relation über `wikiPageId: null`, ohne die Wiki-Seite zu löschen. Das versionierte Project-Update wurde in einen eigenen TanStack-Mutation-Hook ausgelagert, damit `expectedVersion` und Query-Invalidierung zentral bleiben. Der Create-Modus bleibt unverändert, weil die Relation eine gespeicherte Projektversion benötigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectWikiPanel.tsx` | neu | Kompakte UI für Wiki-Seiten-Auswahl, klickbare Kachel und Entfernen der Relation |
| `apps/web/src/hooks/useProjectWikiRelation.ts` | neu | Versioniertes Project-Update für `wikiPageId` mit Query-Cache-Aktualisierung |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Project-Wiki-Sektion im Details-Tab eingebunden und Toasts verdrahtet |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Wiki-Testdaten und Hook-Doubles für ProjectForm-Tests ergänzt |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Tests für Wiki-Seite verknüpfen, Kachel-Link und Entfernen ergänzt |

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Testebene ist Web-Unit/Komponententest mit jsdom. Bewiesen wird: Ausgangszustand Projekt ohne Wiki-Seite, Auswahl einer echten Wiki-Testseite, beobachtbarer Mutation-Aufruf; sowie Ausgangszustand Projekt mit Wiki-Seite, sichtbarer Link zur Wiki-Route und Entfernen über den X-Button. Die Tests verwenden kontrollierte Fixture-Daten und Hook-/API-Doubles; es werden keine produktiven Daten, Uploads oder Dateisystempfade verwendet.

## Probleme und Abweichungen

Die automatisierte Browser-Sichtung war blockiert: Der Browser-Skill ist lokal vorhanden, aber das dafür erforderliche Node-REPL-Tool wurde über die Tool-Suche nicht verfügbar gemacht. Die funktionale Abnahme wurde deshalb über Web-Typecheck und vollständigen Web-Testlauf abgesichert.

## Offene Punkte / Folgeaufgaben

Browser-Sichtung nachholen, sobald das Node-REPL-Tool für den Browser-Skill verfügbar ist.
