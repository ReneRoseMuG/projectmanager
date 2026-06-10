# Log: TKT-109 Versionsnummer im Navigation-Header

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:02  
**Schritt:** Fix — TKT-109 „Unsinnige Versionsnummer im Navigation Header"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Sidebar-Header wurde unter „Projekt Manager" die Zeile „Lokal · v<Version>"
angezeigt. Die Version stammte aus der `package.json` der Web-App (`0.1.0`) und
ist für Anwender ohne Aussagekraft. Die Versionsangabe wurde entfernt; es bleibt
das aussagekräftige Label „Lokal". Der nicht mehr benötigte Import von
`package.json` wurde ebenfalls entfernt. Der zugehörige Sidebar-Unit-Test wurde
auf den neuen Text angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | „· v{webPackage.version}" entfernt, ungenutzten Import entfernt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Assertion „Lokal · v0.1.0" → „Lokal" |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
