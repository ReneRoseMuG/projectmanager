# Log: Sidebar und Parent-Kontext

**Datum:** 29.05.26  
**Uhrzeit:** 09:17:53  
**Schritt:** 2 — Gemeinsame Sidebar und Parent-Kontexte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die neue `FormSidebar` wurde als gemeinsamer rechter Stammdatenbereich angelegt. Sie unterstützt Collapse, Drag-Resize zwischen 160 und 340 px, Mobile-Default-Collapse und `localStorage`-Persistenz. `FormModal` erhielt den optionalen `contentLayout="flush"`-Modus, damit Details-Flächen selbst Body-Scroll und Sidebar-Scroll kontrollieren können. `ParentContextField` wurde als read-only Badge-Zeile ergänzt. Die Shared Types und Detail-Services für Tasks, Tickets, Features, Use Cases und Backlog-Items liefern nun optionale `parentContexts`, ohne neue Datenbankmigration oder neue Routen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormSidebar.tsx` | neu | Kollabierbare und resizebare Formular-Sidebar |
| `apps/web/src/components/ui/ParentContextField.tsx` | neu | Read-only Parent-Badges für Stammdatenformulare |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Flush-Layoutoption für split layouts |
| `apps/web/src/components/ui/ParentBadge.tsx` | geändert | Ticket als sichtbarer Parent-Typ ergänzt |
| `packages/shared-types/src/index.ts` | geändert | `parentContexts` und Ticket-Parent-Typ ergänzt |
| `apps/api/src/services/*.service.ts` | geändert | Detail-DTOs um vorhandene Parent-Kontexte angereichert |

## Probleme und Abweichungen

Keine DB-Migration wurde angelegt, weil alle neuen Informationen aus vorhandenen Tabellen stammen. Beim ersten Web-Build war die Shared-Types-Ausgabe noch nicht aktualisiert; `npm run build -w packages/shared-types` hat die Typauflösung wieder synchronisiert.

## Offene Punkte / Folgeaufgaben

Keine.
