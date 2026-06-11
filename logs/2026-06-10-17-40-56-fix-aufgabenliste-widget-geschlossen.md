# Log: Aufgabenliste-Widget — geschlossene Aufgaben sichtbar halten

**Datum:** 10.06.26  
**Uhrzeit:** 17:40:56  
**Schritt:** Fix — Persönliche Planung, Widget „Aufgabenliste"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Widget „Aufgabenliste" (und „Aufgaben-Board") der Persönlichen Planung verschwand eine Aufgabe komplett, sobald ihr Status auf „geschlossen" gesetzt wurde, statt in die Geschlossen-Gruppe zu wandern.

Ursache: Die Widget-Daten kommen aus `GET /tasks/recent` → `listRecentTasks`, das geschlossene Aufgaben grundsätzlich herausfiltert. Dieselbe Funktion bedient das Journal-Widget „Aktuelle Aufgaben" (dort ist das Ausblenden gewollt) sowie die Board-/Listen-Widgets (dort falsch, weil diese eine eigene Geschlossen-Gruppe/-Sidebar haben).

Lösung: Optionaler, additiver Parameter `includeClosed`. `listRecentTasks` überspringt den Offen-Filter nur, wenn `includeClosed` gesetzt ist (Default unverändert offen-only). Die Route `GET /tasks/recent` nimmt `includeClosed` (boolean) im Query-Schema entgegen. Im Web-API setzt `getDashboardWidgetData` den Flag ausschließlich für `taskBoard` und `taskList`; `taskJournal` bleibt unverändert. Die bereits vorhandene Invalidierung (`invalidateDayPlan` → `dashboards.root`) sorgt dafür, dass die geschlossene Aufgabe nach dem Statuswechsel in der Geschlossen-Gruppe erscheint.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | `listRecentTasks`: Option `includeClosed`, Offen-Filter konditional |
| `apps/api/src/routes/tasks.ts` | geändert | Neues `dashboardRecentTaskQuerySchema` mit `includeClosed`; `/tasks/recent` reicht Flag durch |
| `apps/web/src/api/dashboard.ts` | geändert | `getDashboardRecentTasks` mit `includeClosed`; für `taskBoard`/`taskList` auf `true` gesetzt |
| `tests/integration/api/dashboard-widgets.test.ts` | geändert | Neuer Fall „Schritt 6": `includeClosed=true` behält geschlossene Day-Plan-Aufgabe; Default blendet aus |
| `tests/unit/web/api/dashboard.test.ts` | geändert | Verdrahtung: `taskList`/`taskBoard` senden `includeClosed`, `taskJournal` nicht |

## Tests / Prüfungen

- `npm run test -w apps/web -- --run tests/unit/web/api/dashboard.test.ts` → 4/4 grün
- `npm run test -w apps/api -- --run tests/integration/api/dashboard-widgets.test.ts` → 9/9 grün (inkl. neuer Fall; bestehende Tests zum Default-Ausblenden unverändert gültig)

Testebene: Unit (Web-API-Verdrahtung) + Integration (echte Fastify-App, MySQL-Temp-DB via `createTestDb()`). Bewiesenes Verhalten: Ausgangszustand offene + zu schließende Day-Plan-Aufgabe → Aktion `PATCH status=done` → Ergebnis: `tasks/recent` ohne Flag blendet aus, mit `includeClosed=true` bleibt sie sichtbar. Test-Entwurfs-Leitplanken angewandt (keine Skips, nur Temp-DB).

## Probleme und Abweichungen

Keine. Reiner additiver Parameter, kein DB-/Schema-Eingriff, keine Auth-/Rollen-Änderung, keine UI-Visuals. Behoben wurde neben `taskList` bewusst auch `taskBoard`, da beide dieselbe Datenquelle und eine Geschlossen-Ansicht teilen.

## Offene Punkte / Folgeaufgaben

Keine. Hinweis: Board-/Listen-Widgets behalten weiterhin das vorhandene `limit`/Recency-Verhalten von `tasks/recent` (nicht Teil dieses Fixes).
