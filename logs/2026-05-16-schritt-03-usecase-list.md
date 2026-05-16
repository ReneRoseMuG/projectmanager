# Log: UseCaseList

**Datum:** 16.05.26  
**Schritt:** 3 — UseCaseList  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Use-Case-Liste wurde zu einer sticky Sidebar mit Steel-50-Head, Scrollbereich und Footer umgebaut. Der Header zeigt nun Titel, Eintragsanzahl und den bestehenden Neu-Button. Jede Use-Case-Row nutzt ein dreispaltiges Layout mit deterministisch getöntem UC-Nummer-Badge, Titel/Slug und Status-`Pill`. Der ausgewählte Use Case erhält eine Steel-700-Border und einen leichten Steel-Hintergrund. Unten ergänzt ein gestrichelter „Use Case hinzufügen"-Button die bestehende Create-Funktion. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/UseCaseList.tsx` | geändert | Sticky Sidebar, UC-Badges, Status-Pills und Add-Footer ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Feature.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Feature-Mockup stattfinden.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
