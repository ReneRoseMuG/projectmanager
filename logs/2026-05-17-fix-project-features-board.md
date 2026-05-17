# Log: Project Features Board

**Datum:** 17.05.26  
**Schritt:** Fix — Project Features Board  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der frühere Projekt-Features-Tab wurde wiederhergestellt. `ProjectDetailPage` nutzt im Tab `Features` nicht mehr `FeatureRelationPanel`, sondern wieder eine reine Ergebnisansicht der Projekt-Feature-Join-Daten über `projectFeatureLinks.features`. Die Komponente `ProjectFeaturePanel` wurde neu angelegt und zeigt verknüpfte Features als Board nach Statusspalten oder als Liste. Projektseitige Checkbox-Auswahl und der Speichern-Flow für Feature-Relationen wurden aus diesem Tab entfernt; die Projektpflege bleibt featureseitig im Feature-Detail-Tab `Projekte`. Zusätzlich wurden Breiten-Schutzklassen für Statusspalten und Feature-Karten ergänzt, damit Karten nicht breiter als ihre Spalte laufen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | neu | Projekt-Features als Board/List-Ergebnisansicht wiederhergestellt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Features-Tab von RelationPanel auf ProjectFeaturePanel umgestellt |
| `apps/web/src/components/ui/__tests__/ProjectFeaturePanel.test.tsx` | neu | Regressionstests für Board/List, fehlenden Relation-Flow und Kartenbreite |
| `logs/2026-05-17-fix-project-features-board.md` | neu | Schritt-Log für die Wiederherstellung |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Der Testlauf meldet weiterhin nur React-Router-Future-Flag-Warnungen aus bestehenden `MemoryRouter`-Tests sowie einen npm-Versionshinweis; beides ist nicht testrot.

Testlauf:

- `npm run test -w apps/web`
- Ergebnis: 11 Testdateien ausgeführt, 11 grün, 0 rot; 79 Tests ausgeführt, 79 grün, 0 rot.

## Offene Punkte / Folgeaufgaben

Keine.
