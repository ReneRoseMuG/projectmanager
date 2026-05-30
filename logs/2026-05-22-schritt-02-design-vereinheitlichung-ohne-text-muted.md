# Log: Design-Vereinheitlichung ohne text-muted

**Datum:** 22.05.26  
**Schritt:** 2 — Alle übrigen Punkte umsetzen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die mechanisch klaren Designabweichungen wurden in `apps/web/src` umgesetzt: Slate-Farbklassen und Slate-Theme-Referenzen wurden auf Steel-Tokens umgestellt, `rounded-2xl`/`rounded-t-2xl` entfernt und raw Schatten-Klassen durch Schatten-Tokens ersetzt. Zentrale UI-Komponenten wurden an die Richtlinie angepasst, darunter `Button` mit neuer Variante `inverted`, `EmptyState`, `Badge`, `Pill`, `StatusPill`, `TabBar`, `Input`, `ViewToggle`, `SegmentedControl`, `Label`, `Section`, `Modal`, `ConfirmDialog`, `ItemCard`, `ItemRow` und `DetailModal`. Formularfelder in Login, Setup, Admin-Detailseiten, Wiki-Formular, Notiz-Editor und TagPicker laufen nun über `FormField`, während Checkbox-/Toggle- und Search-Wrapper als erlaubte Ausnahmen belassen wurden. `styles.css` enthält jetzt Kommentar-Header für ProseMirror/RichText, TLDraw, FullCalendar sowie Toast/Skeleton-Animationen. Der Web-Typecheck wurde erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/*` | geändert | Zentrale UI-Komponenten auf Token-, Radius-, Shadow- und Formularregeln angepasst |
| `apps/web/src/components/{attachments,calendar,dashboard,features,imports,journal,layout,notes,search,settings,tags,tasks,tickets,usecases,wiki}/*` | geändert | Domain-Komponenten mechanisch auf Steel-Tokens und erlaubte Radii/Schatten umgestellt |
| `apps/web/src/pages/*` | geändert | Page- und Formularflächen auf Steel-Tokens, FormField und einheitlichere Radien angepasst |
| `apps/web/src/pages/admin/*` | geändert | Admin-Detailformulare auf FormField und konsistente Eingabefelder umgestellt |
| `apps/web/src/styles.css` | geändert | Drittanbieter-/Infrastruktur-Blöcke kommentiert und Slate-Theme-Referenzen ersetzt |
| `logs/2026-05-22-schritt-02-design-vereinheitlichung-ohne-text-muted.md` | neu | Schritt-Log zur Umsetzung ohne freigabepflichtige `text-muted`-Änderungen |
| `logs/README.md` | geändert | Log-Übersicht um den neuen Schritt ergänzt |

## Probleme und Abweichungen

`text-muted` wurde absichtlich nicht geändert, weil der Auftrag dafür eine Zwischenfreigabe verlangt. Dadurch bleiben `PageHeader`-Untertitel, Admin-Header, Admin-Tabellenköpfe, Admin-Leer-/Ladezustände, `SetupPasswordPage` und `ProjectMilestoneFilterBar` noch offen. Die vollständige `PageHeader`-Konsolidierung und das komplette Admin-Tabellenmuster wurden deshalb nicht abgeschlossen, weil beide Punkte aktuell direkt oder indirekt `text-muted` betreffen würden. Während der mechanischen Shadow-Ersetzung trat kurz eine PowerShell-Array-Falle auf; die betroffenen Dateien `ItemRow.tsx`, `NoteCard.tsx` und `TagPicker.tsx` wurden gezielt aus dem Branch-Stand rekonstruiert und mit den vorgesehenen Änderungen erneut angewendet.

## Offene Punkte / Folgeaufgaben

Freigabe zu `text-muted` erforderlich: entweder alle 15 Fundstellen durch `text-steel-500` ersetzen oder einzelne Texte/Props entfernen. Danach können `PageHeader` auf den blockierten Übersichtsseiten und das Admin-Tabellenmuster vollständig abgeschlossen werden. Der offizielle Testlauf nach Abschnitt 12 wurde noch nicht gestartet.
