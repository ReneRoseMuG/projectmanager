# Log: Wiki Navigation WIKI-20

**Datum:** 07.07.26  
**Uhrzeit:** 04:53:09  
**Schritt:** Fix — Wiki Navigation WIKI-20  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Hauptnavigationseintrag „Wiki“ in der Sidebar verweist jetzt direkt auf `/wiki/20`, damit beim Klick die Wiki-Seite WIKI-20 geladen wird. Der zugehörige „in neuem Tab öffnen“-Button übernimmt dasselbe Ziel und öffnet entsprechend `/wiki/20?standalone=1`. Die Änderung bleibt auf die bestehende Web-Navigation begrenzt; Backend, DB, Berechtigungen und Wiki-Detailrouten wurden nicht verändert. Der bestehende Sidebar-Unit-Test wurde erweitert, damit sowohl Linkziel als auch Standalone-Ziel künftig abgesichert sind. Die Testleitplanken wurden auf Unit-Ebene angewendet: echte React-Komponente mit MemoryRouter, isoliertes `window.open`, kein DB-Zugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Wiki-Navigation zeigt auf `/wiki/20` |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Assertions für Wiki-Link und Standalone-Ziel ergänzt |
| `logs/2026-07-07-04-53-09-fix-wiki-navigation-wiki-20.md` | neu | Schritt-Log für den Navigations-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
