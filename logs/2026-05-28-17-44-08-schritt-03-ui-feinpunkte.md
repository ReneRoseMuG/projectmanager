# Log: UI-Feinpunkte

**Datum:** 28.05.26  
**Uhrzeit:** 17:44:08  
**Schritt:** 3 — DatePicker, Tab-Titel, Dashboard-Builder und Rich-Text-Auswahlverhalten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der DatePicker hat nun eine explizite Kalender-Schaltfläche und öffnet den nativen Picker auch über die erweiterte Klickfläche, ohne den nativen Input zu ersetzen. Detailseiten setzen den Browser-Tab-Titel mit Item-Typ und Item-Name, zum Beispiel „Aufgabe: Titel | Projekt Manager“. Der Dashboard-Builder wurde gezielt geprüft: in der Builder-Liste werden keine Widget-Untertexte oder Statuslabels gerendert. Der Rich-Text-Toolbar aktualisiert aktive Formatbuttons bei Selektionsänderungen zuverlässig; Highlight setzen und entfernen ist auf echte Textauswahl beschränkt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/DatePicker.tsx` | geändert | Native Picker-Öffnung über Klickfläche und Icon-Button ergänzt |
| `apps/web/src/hooks/useDocumentTitle.ts` | neu | Hook für Browser-Tab-Titel ergänzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Tab-Titel für Projekt-Detail/Create gesetzt |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Tab-Titel für Meilenstein-Detail/Create gesetzt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Tab-Titel für Feature-Detail/Create gesetzt |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Tab-Titel für Use-Case-Detail/Create gesetzt |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Tab-Titel für Backlog-Item-Detail/Create gesetzt |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Tab-Titel für Aufgaben-Detail/Create gesetzt |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Tab-Titel für Ticket-Detail/Create gesetzt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Tab-Titel für Wiki-Seiten gesetzt |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Toolbar-State und Highlight-Auswahlverhalten korrigiert |
| `apps/web/src/components/dashboard/DashboardBuilder.tsx` | geprüft | Keine Untertitel-/Statuslabel-Ausgabe im Builder vorhanden |

## Probleme und Abweichungen

Keine. Der gezielte Web-Build `npm run build -w apps/web` lief erfolgreich; Vite meldete nur die bekannte Chunk-Größenwarnung.

## Offene Punkte / Folgeaufgaben

Die Browserfälle für DatePicker, Tab-Titel und Rich-Text-Auswahlverhalten werden im Testschritt angepasst beziehungsweise ausgeführt.
