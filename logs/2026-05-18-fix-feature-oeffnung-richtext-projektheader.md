# Log: Feature-Öffnung, Rich-Text und Projektheader

**Datum:** 18.05.26  
**Schritt:** Fix — Feature-Öffnung, Rich-Text und Projektheader  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Projekt-Feature-Tab öffnet bestehende Features jetzt über die echte Feature-Detailseite (`/features/:id`) statt über das reduzierte Feature-Formular im Projektkontext. Dadurch ist der Aufruf aus `Projekt → Features` konsistent mit dem direkten Aufruf aus der Feature-Übersicht. Der funktionslose Drei-Punkte-Button im Projektheader wurde entfernt. Für den Rich-Text-Editor wurde eine eigene Typografiefläche ergänzt, weil die bisherige `prose`-Klasse ohne Tailwind-Typography-Plugin keine Überschriften- und Listenformatierung erzeugt hat. Überschriften, Listen, Code, Zitate und fett markierte Zwischenüberschriften werden nun sichtbar strukturiert dargestellt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Feature-Öffnung auf Detailroute umgestellt und Drei-Punkte-Button entfernt |
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | Editorfläche auf eigene Rich-Text-CSS-Klasse umgestellt |
| `apps/web/src/styles.css` | geändert | Typografie-Regeln für Rich-Text-Inhalte ergänzt |
| `logs/2026-05-18-fix-feature-oeffnung-richtext-projektheader.md` | neu | Log-Eintrag für den UI-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

`npm run lint -w apps/web` meldete zunächst einen ungenutzten `Button`-Import, der durch das Entfernen des Drei-Punkte-Buttons entstanden war. Der Import wurde entfernt; danach liefen Lint und Build erfolgreich. Vite meldet weiterhin nur die bekannte Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
