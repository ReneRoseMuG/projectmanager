# Log: ParentBadge WikiPage

**Datum:** 28.05.26  
**Uhrzeit:** 16:26:02  
**Schritt:** Fix — ParentBadge WikiPage  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Buildfehler in der Web-App wurde durch eine fehlende Zuordnung im `ParentBadge` behoben. Der Shared-Type `VisibleParentContext["type"]` enthält bereits `wikiPage`, die Label-Map der Komponente deckte diesen Fall aber noch nicht ab. Die Komponente wurde daher um das Label `Wiki-Seite` ergänzt. Es wurden keine API-, Auth-, Rollen-, Permission-, Datenmodell- oder Query-Änderungen vorgenommen. Der vollständige Build wurde anschließend erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ParentBadge.tsx` | geändert | Fehlendes Label für `wikiPage` ergänzt |
| `logs/2026-05-28-16-26-02-fix-parentbadge-wikipage.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
