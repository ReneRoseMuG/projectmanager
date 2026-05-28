# Log: Wiki Verwandte Seiten Suche

**Datum:** 28.05.26  
**Uhrzeit:** 17:11:31  
**Schritt:** Fix — Wiki Verwandte Seiten Suche  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Vorschlagslogik für verwandte Wiki-Seiten wurde so angepasst, dass ohne Sucheingabe keine vollständige Seitenliste mehr angezeigt wird. Stattdessen erscheint ein neutraler Hinweis, dass ein Suchbegriff eingegeben werden soll. Sobald eine Sucheingabe vorhanden ist, werden weiterhin passende Seiten vorgeschlagen, bereits ausgewählte Seiten ausgeschlossen und der Projektfilter auf die Suchtreffer angewendet. Die Trefferbuttons haben eindeutige Accessible Names erhalten, damit die Auswahl besser testbar und zugänglicher ist. Die Testleitplanken wurden angewendet: Testebene ist Unit/jsdom, die Tests nutzen echte Komponenten-Props ohne DB-, API- oder Dateisystemzugriff und beweisen beobachtbares UI-Verhalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/RelatedPagesSelector.tsx` | geändert | Vorschläge nur noch bei vorhandenem Suchtext anzeigen |
| `tests/unit/web/components/wiki/RelatedPagesSelector.test.tsx` | neu | Unit-Tests für leere Suche, Suchtreffer, gewählte Seiten und Projektfilter |
| `logs/2026-05-28-17-11-31-fix-wiki-verwandte-seiten-suche.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der Arbeitsbaum enthielt bereits vor Beginn unrelated Änderungen an `apps/web/src/components/wiki/WikiPageForm.tsx`, `tests/unit/web/components/wiki/WikiPageForm.test.tsx`, `logs/README.md` und einem vorhandenen Log. Während der Arbeit waren zusätzlich unrelated Änderungen an Realtime-Dateien sichtbar. Diese Dateien wurden nicht zurückgesetzt und nicht inhaltlich bearbeitet. Keine Abweichung vom bestätigten Plan.

## Offene Punkte / Folgeaufgaben

Keine.
