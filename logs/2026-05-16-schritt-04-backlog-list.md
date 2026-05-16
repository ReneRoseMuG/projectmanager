# Log: BacklogList

**Datum:** 16.05.26  
**Schritt:** 4 — BacklogList  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Statusfilter im Backlog wurden auf pill-förmige Studie-2-Chips mit Steel-700-Aktivzustand umgestellt. Der Empty-State nutzt nun den gleichen `rounded-2xl`-Stil wie der Dateien-Tab. Backlog-Items werden als modernere Cards mit Hover-Border, Hover-Schatten und kompakterem Body gerendert. Status erscheint als Solid-`Pill`, Priorität als getönte `Badge`, und Feature-Bezüge werden als Teal-Badge mit `Feature:`-Prefix angezeigt. Verworfene Items sind gedimmt, und der Titel wird durchgestrichen dargestellt. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/backlog/BacklogList.tsx` | geändert | Status-Chips, Backlog-Cards, Pill/Badge-Footer und Rejected-Stil ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Projekt.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Projekt-Mockup stattfinden.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
