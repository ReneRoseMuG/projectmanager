# Log: FeaturePicker und TaskList

**Datum:** 16.05.26  
**Schritt:** 5 — FeaturePicker und TaskList  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`FeaturePicker` wurde auf die Studie-2-Row-Optik mit Custom-Checkbox, farbiger Icon-Box, Status-Pill und Use-Case-Counter umgestellt. Die native Checkbox bleibt im Label erhalten und ist nur visuell versteckt, damit die Bedienbarkeit und Zugänglichkeit erhalten bleiben. `TaskCard` unterstützt zusätzlich die neue Prop `variant="row"`; im Row-Modus wird ab `md` eine dichte Listenzeile mit Prioritäts-Border-Left, Status-Checkbox, Status-Pill, primärem Tag, Fälligkeit, Avatar und Aktionen gerendert. Unterhalb von `md` fällt die Row automatisch auf die bestehende Card-Variante zurück. `TaskList` nutzt nun `variant="row"`, während Kanban weiterhin die Default-Card-Variante verwendet. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeaturePicker.tsx` | geändert | Picker-Rows mit Custom-Checkbox, Icon-Tone, Status-Pill und UC-Counter |
| `apps/web/src/components/tasks/TaskList.tsx` | geändert | Aufgabenliste nutzt `TaskCard` im Row-Modus |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Neue `variant="row"` mit mobilem Card-Fallback ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Projekt.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Projekt-Mockup stattfinden. Statt eines neuen Action-Menüs wurden die bestehenden Öffnen- und Löschen-Aktionen erhalten, weil funktionale Menüänderungen nicht Teil des Auftrags sind.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
