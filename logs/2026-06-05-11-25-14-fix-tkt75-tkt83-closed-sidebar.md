# Log: TKT-75 + TKT-83 — Closed Sidebar Cards + Tag Picker Fix

**Datum:** 05.06.26  
**Uhrzeit:** 11:25:14  
**Schritt:** Fix — Closed Items Cards größer + Tag Picker Portal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

**TKT-75 — Closed Items Cards zu schmal und nicht ausreichend lesbar:**  
`ClosedItemRow` wurde erweitert: der Titel wechselt von `truncate` auf `line-clamp-2` (bis zu 2 Zeilen, dadurch mehr Inhalt lesbar), das Padding wurde auf `py-2.5` angehoben. Ein optionaler Footer mit `CheckCircle2`-Icon und Zählerwert wird gerendert, wenn `childCount > 0` übergeben wird. Ein optionales `onOpen`-Prop macht die gesamte Karte klickbar.  
`TaskListBoardView` übergibt jetzt `childCount={task.subtaskCount}` und `onOpen={() => onOpen(task)}`.  
`TicketListBoardView` übergibt `childCount={ticket.subTicketCount}` und `onOpen={() => onOpen(ticket)}`.  
`CLOSED_SIDEBAR_WIDTH` in `ListBoardView` wurde von 270 auf 300 erhöht.

**TKT-83 — Tag Picker Panel in der Sidebar abgeschnitten:**  
Der `TagPicker` mit `variant="panel"` ist innerhalb der `FormSidebar` platziert, deren Content-Div `overflow-y: auto` hat (was implizit `overflow-x: auto` setzt und damit das Dropdown-Panel abschneidet). Das Dropdown der Panel-Variante wird jetzt via `createPortal` an `document.body` gehängt und mit `position: fixed` + kalkulierten Koordinaten aus `getBoundingClientRect()` positioniert. Dabei werden `scroll`- und `resize`-Events abgehört, um die Position bei offenem Dropdown nachzuführen. Der Click-Outside-Handler prüft jetzt beide Refs (`containerRef` + `portalRef`). Die Default-Variante bleibt unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ClosedItemRow.tsx` | geändert | childCount-Footer, onOpen-Prop, größere Karte |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | CLOSED_SIDEBAR_WIDTH 270 → 300 |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | subtaskCount + onOpen an ClosedItemRow |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | subTicketCount + onOpen an ClosedItemRow |
| `apps/web/src/components/tags/TagPicker.tsx` | geändert | Panel-Variant: createPortal + position:fixed für Dropdown |

## Probleme und Abweichungen

Die anderen Views (Milestone, Project, Feature, UseCase) nutzen `ClosedItemRow` ebenfalls, übergeben aber kein `childCount`. Da das Prop optional ist, sind keine Änderungen dort nötig — diese Views können bei Bedarf in einem Folgeauftrag ergänzt werden.

## Offene Punkte / Folgeaufgaben

- `childCount` für Milestone, Project, Feature und UseCase in deren `renderClosedRow` ergänzen (separater Auftrag).
