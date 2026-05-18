# Log: Beschreibungseditoren und Tabs

**Datum:** 18.05.26  
**Schritt:** Fix — Beschreibungseditoren und Tabs  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Alle direkt betroffenen Beschreibungs- und Kurzbeschreibungsfelder verwenden jetzt den vollwertigen Rich-Text-Editor mit vollständiger Toolbar. Damit sind Aufgabe, Projekt, Ticket, Backlog, Kalendertermin, Feature-Kurzbeschreibung und Use-Case-Kurzbeschreibung in der Editor-Bedienung angeglichen. Der Task-Detaildialog verwendet ebenfalls die vollständige Toolbar statt der reduzierten Variante. Zusätzlich wurde das Layout der Modals stabilisiert: Header, Tab-Leiste und Footer schrumpfen nicht mehr in den Scrollbereich hinein, der Inhalt scrollt darunter separat. Dadurch soll die Tab-Leiste im Task-Detail nicht mehr teilweise verdeckt werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Beschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Beschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Kurzbeschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Kurzbeschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Beschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Beschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Beschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Kurzbeschreibungseditor auf vollständige Toolbar umgestellt |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Header, Inhalt und Footer flex-stabilisiert |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Formular-Modal gegen Toolbar- und Footer-Überdeckung stabilisiert |
| `apps/web/src/components/ui/TabBar.tsx` | geändert | Tab-Leiste mit Mindesthöhe und Shrink-Schutz versehen |
| `logs/2026-05-18-fix-beschreibungseditoren-und-tabs.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `toolbar="minimal"` bleibt nur bei Kommentaren und der Readonly-Kommentarausgabe bestehen; das sind keine Beschreibungsfelder.

## Offene Punkte / Folgeaufgaben

Keine.
