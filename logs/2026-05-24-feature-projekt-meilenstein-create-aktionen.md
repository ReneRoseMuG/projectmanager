# Log: Projekt-Meilenstein Create-Aktionen

**Datum:** 24.05.26  
**Schritt:** Feature — Projekt-Meilenstein Create-Aktionen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Im Projektformular werden die Meilenstein-Karten im Tab „Meilensteine“ jetzt wie in der globalen Meilenstein-Ansicht mit kontextnahen Create-Aktionen verdrahtet. Die Einträge „Neue Aufgabe“ und „Neues Ticket“ werden nur übergeben, wenn `tasks:write` beziehungsweise `tickets:write` erlaubt ist. Beim Klick wird ein lokaler Modal-Flow geöffnet, der die bestehenden `TaskForm`- und `TicketForm`-Komponenten nutzt und den Owner fest auf den gewählten Meilenstein setzt. Erfolgreiche Creates laufen über die bestehenden TanStack-Query-Hooks `useTasks` und `useTickets`, damit die vorhandenen Invalidierungen für Meilenstein-, Aufgaben- und Ticketdaten greifen. Die Testentwurfsleitplanken wurden angewendet: Testebene ist Unit/jsdom, geprüft werden echte Klicks auf Tab, Menüeintrag und Formular-Submit; die Testdaten kommen aus isolierten Fixtures ohne DB- oder Dateisystemzugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Meilenstein-Create-Aktionen mit Permission-Gating, Owner-State und Task/Ticket-Modal-Flows ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Form-Testfixture um steuerbare Permission- und Create-Mocks für Aufgaben/Tickets erweitert |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Unit-Tests für sichtbare und ausgeblendete Meilenstein-Create-Aktionen im Projektformular ergänzt |
| `logs/2026-05-24-feature-projekt-meilenstein-create-aktionen.md` | neu | Schritt-Log für den Follow-up-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`npm run typecheck -w apps/web` ist grün. Die fokussierten neuen ProjectForm-Tests sind grün. Der vollständige Lauf von `ProjectForm.test.tsx` hat weiterhin eine bestehende, nicht durch diese Änderung verursachte CSS-Erwartung im Test „behält im Meilenstein-Tab die Listenansicht nach Tabwechsel“: Der Test erwartet alte Klassen `border-steel-700 bg-steel-700`, die Komponente rendert aktuell `border-steel-900 bg-steel-900`. Dieser Altbefund wurde gemäß Testregel nicht im Rahmen dieses Auftrags korrigiert.

## Offene Punkte / Folgeaufgaben

Die alte `ListBoardView`-/ProjectForm-Klassenerwartung sollte separat an den aktuellen Designstand angepasst werden, damit der vollständige ProjectForm-Testlauf wieder grün ist.
