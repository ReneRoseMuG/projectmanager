# Log: Dashboard-Row-Widgets — Tab-Öffnen und returnTo

**Datum:** 17.06.26  
**Uhrzeit:** 04:13:58  
**Schritt:** Fix — Navigationsverhalten der Dashboard-Row-Widgets (Übersicht-Tab)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Widget „Aktuelle Aufgaben" (`taskJournal`) in der Meilenstein-Übersicht — und alle strukturgleichen Row-Widgets in allen Dashboard-Kontexten — hatten zwei Fehler: Ein Klick öffnete das Item in-place, obwohl ein `ExternalLink`-Icon (↗) „in neuem Tab öffnen" signalisierte; und die Navigation gab kein `returnTo` mit, weshalb der „Zurück"-Button der Zielseite auf den Fallback `/projects` fiel.

Auf Nutzerentscheidung wurden die Widgets mit ↗-Icon (`taskJournal`, `overdueTasks` → `TaskRows`; `ticketJournal` → `TicketRows`) auf **echtes Tab-Öffnen** umgestellt: Aus `<Link to="/tasks/:id">` wurde `<a href={withStandaloneView("/tasks/:id")} target="_blank" rel="noopener noreferrer">`. Damit ist das Icon ehrlich und das „Zurück"-Problem entfällt (die Übersichtsseite wird nicht verlassen).

Die Row-Widgets ohne ↗-Icon (`globalJournal`/`JournalRows`, `commentJournal`/`CommentRows`, `attachmentJournal`/`AttachmentRows`, `milestoneProgress`/`MilestoneRows`) bleiben in-place, geben aber jetzt über `dashboardDetailPath(type, id, returnTo)` ein `returnTo` mit. Dazu erhielt jede dieser Komponenten einen `returnTo`-Prop, durchgereicht aus `DashboardWidgetCard` (dort bereits als `${location.pathname}${location.search}` vorhanden). `NoteRows` (kein Link) und die Board/List-Widgets (navigieren bereits korrekt über `navigateToDetail`) blieben unberührt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | TaskRows/TicketRows auf `<a target="_blank">` + withStandaloneView; JournalRows/CommentRows/AttachmentRows/MilestoneRows mit `returnTo`-Prop + dashboardDetailPath; returnTo in 4 Render-Zweigen durchgereicht |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | commentJournal-Test auf hrefs mit returnTo nachgeführt (§4.4); 4 neue Tests: Tab-Öffnen für taskJournal/overdueTasks/ticketJournal, in-place+returnTo für milestoneProgress; Kopfkommentar erweitert |

## Probleme und Abweichungen

- **Vorbestehender Testfehler (nicht im Scope):** Der Test „filtert das Kalender-Widget im DayPlan-Kalender strikt auf Termine des DayPlan-Kontexts" schlägt mit `No "useDayPlanEvents" export is defined on the … useDayPlan mock` fehl. Per `git stash` der eigenen Änderungen verifiziert: Der Fehler besteht auch ohne meine Änderung (alter Stand 31/32 grün, derselbe rote Test). Betrifft `DayPlanCalendarWidget`/`useDayPlanEvents`, die ich nicht angefasst habe. Gemäß agents.md §4.3 kein Fix nebenbei — als Beobachtung gemeldet.
- **Fremde uncommittete Änderungen im Working Tree:** `apps/mcp-server/src/tools.ts`, `tools.test.ts`, `tools.integration.test.ts`, `docs/MCP-Tools.md` stammen aus dem parallelen `update_note`-MCP-Arbeitsstrang (Log-Einträge 02:41/02:50 Uhr), nicht aus diesem Auftrag. Strikt getrennt gehalten.

## Verifikation

- `npm run typecheck -w apps/web` → grün.
- `npm run test -w apps/web -- DashboardWidgets.test` → 35/36 grün (1 vorbestehender Kalenderfehler s. o.); die 4 neuen Navigationstests grün.
- Testleitplanken: Unit (jsdom), beobachtbares Verhalten geprüft (href, target, rel, returnTo im href) — keine reinen Sichtbarkeitsassertions.

## Offene Punkte / Folgeaufgaben

- Optionaler Folgeauftrag: `useDayPlanEvents` im `useDayPlan`-Mock von `DashboardWidgets.test.tsx` ergänzen, um den vorbestehenden Kalender-Testfehler zu beheben (separater Auftrag, da außerhalb dieses Scopes).
