# Log: Karten Rich-Text Preview

**Datum:** 18.05.26  
**Schritt:** Fix — Karten Rich-Text Preview  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für Karten- und Listenoberflächen wurde eine zentrale Rich-Text-zu-Plaintext-Funktion ergänzt. HTML-Inhalte aus `RichTextEditor`-Feldern werden dadurch in Karten nicht mehr als rohe Tags angezeigt. Leere Rich-Text-Werte wie `<p></p>` werden zu leerem Text normalisiert und dadurch nicht gerendert; Platzhalter wie „Keine Beschreibung" oder „Keine Kurzbeschreibung" wurden aus den betroffenen Karten entfernt. Die gleiche Normalisierung wird in Listen- und Relation-Suchen genutzt, damit HTML-Tags nicht als Suchinhalt zählen. Zusätzlich wurden Projekt- und Feature-Detail-Header sowie Ticket-Readonly-Beschreibung an dieselbe Anzeige-Regel angepasst, weil sie denselben Beschreibungstext sichtbar machten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/richText.ts` | neu | Zentrale Plaintext-Normalisierung für Rich-Text-Inhalte |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Beschreibung als Plaintext, leerer Inhalt wird nicht gerendert |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Suche nutzt Plaintext-Beschreibung |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Beschreibung als Plaintext, kein leerer Platzhalter |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Suche nutzt Plaintext-Beschreibung |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Feature-Board-Karten rendern nur vorhandenen Plaintext |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Karten- und Zeilenbeschreibung als Plaintext |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Suche nutzt Plaintext-Beschreibung |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Karten- und Zeilenbeschreibung als Plaintext |
| `apps/web/src/components/tickets/TicketDetail.tsx` | geändert | Leere Ticket-Beschreibung wird nicht als Feld angezeigt |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Suche nutzt Plaintext-Beschreibung |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Backlog-Karten und Suche nutzen Plaintext |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Karten- und Zeilenbeschreibung als Plaintext |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Aufgaben-Relationszeile rendert nur vorhandenen Plaintext |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Suche nutzt Plaintext-Beschreibung |
| `apps/web/src/components/calendar/UpcomingEvents.tsx` | geändert | Terminzeilen rendern nur vorhandenen Plaintext |
| `apps/web/src/components/ui/RelationPanel.tsx` | geändert | Relation-Suche normalisiert Rich-Text-Werte |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Globale Suche normalisiert Projekt-/Task-/Ticket-Beschreibungen |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Header und Relationseinträge rendern nur vorhandenen Plaintext |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Header rendert nur vorhandenen Plaintext |
| `logs/2026-05-18-fix-karten-richtext-preview.md` | neu | Log-Eintrag für den Anzeige-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Die Browser-Automation konnte nicht genutzt werden, weil das benötigte Node-Repl-/Browser-Tool in dieser Sitzung nicht verfügbar war. Die Verifikation erfolgte daher über `npm run build -w apps/web`, `npm run lint -w apps/web` und gezielte Code-Suchen. Vite meldet weiterhin nur die bekannte Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
