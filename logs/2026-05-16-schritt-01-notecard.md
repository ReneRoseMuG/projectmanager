# Log: NoteCard

**Datum:** 16.05.26  
**Schritt:** 1 — NoteCard  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Notizkarte wurde auf den Studie-2-Stil mit abgerundeterer Card, Hover-Border und Hover-Schatten umgestellt. Die linke Icon-Box nutzt nun deterministische Farbtöne aus `note.id % 4`, damit Notizen im Tab leichter unterscheidbar sind. Titel und Zeitstempel wurden kompakter und etwas kräftiger gesetzt. Edit- und Delete-Aktionen bleiben funktional unverändert und werden nur über kleinere Ghost-Buttons dargestellt. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Studie-2-Card, deterministische Icon-Tönung und kleinere Aktionsbuttons |

## Probleme und Abweichungen

`Designstudie-2/Projekt.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Projekt-Mockup stattfinden. Eine neue `size`-Prop für `Button` wurde nicht ergänzt, weil `Button.tsx` in diesem Schritt nicht als betroffene Datei freigegeben ist; die kleinere Größe wurde lokal über `className` gesetzt.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
