# Log: Templates

**Datum:** 17.05.26  
**Schritt:** 5 — TabBar & Modal-Templates  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Template-Komponenten `TabBar`, `DetailModal` und `FormModal` wurden unter `apps/web/src/components/ui/` angelegt. `TabBar` kapselt die bisher in `TaskDetail` inline gebaute horizontale Tab-Leiste und zeigt Count-Werte auch bei `0` an. `DetailModal` kapselt den gemeinsamen Detail-Chrome mit Gradient-Header, Breadcrumb, Meta-Informationen, Tab-Leiste, scrollbarem Body und optionalem Sticky-Footer. `FormModal` stellt den entsprechenden Formular-Chrome mit immer sichtbarem Footer bereit. `TaskDetail` wurde als erster Konsument auf `DetailModal` umgestellt; fachliche Hooks, Handler und Tab-Inhalte blieben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/TabBar.tsx` | neu | Scrollbare TabBar mit Icons und Count-Badges |
| `apps/web/src/components/ui/DetailModal.tsx` | neu | Detail-Template mit Header, TabBar, Body und Footer |
| `apps/web/src/components/ui/FormModal.tsx` | neu | Formular-Template mit Header, Body und Sticky-Footer |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Inline Header/TabBar/Footer durch `DetailModal` ersetzt |
| `logs/2026-05-17-schritt-05-templates.md` | neu | Schritt-Log für Schritt 5 |
| `logs/README.md` | geändert | Log-Index um Schritt 5 ergänzt |

## Probleme und Abweichungen

Keine. `FormModal` wurde gemäß Schritt 5 angelegt, aber noch nicht breit in bestehende Formulare migriert, weil der Auftrag für diesen Schritt ausdrücklich `TaskDetail` als ersten Konsumenten nennt.

## Offene Punkte / Folgeaufgaben

Keine.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
