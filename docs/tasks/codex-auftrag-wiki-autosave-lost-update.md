# Codex-Auftrag: Wiki-Autosave überschreibt externe Änderungen (Lost Update)

## Ziel

Das Autospeichern im Wiki-Editor überschreibt parallele externe Änderungen an derselben Seite, ohne dass das Optimistic Locking greift. Der Editor soll externe Änderungen erkennen und nicht mehr stillschweigend überschreiben.

## Kontext / Fehleranalyse

Beobachtet am 13.06.26: Eine über den MCP geschriebene Wiki-Seite (FT(16), id 24) wurde Sekunden später durch das Autospeichern eines offenen Editor-Tabs wieder auf den alten Inhalt zurückgesetzt (Versionsfolge: externe Schreibung → v3, danach Autosave → v4/v5 mit altem Inhalt).

Ursache:

1. `apps/web/src/components/wiki/WikiPageForm.tsx` hält den Editor-Inhalt im lokalen State und setzt ihn bei einem Hintergrund-Refetch **bewusst nicht** zurück (Kommentar „TKT-98", damit Eingaben nicht verloren gehen). Eine extern geänderte Seite wird im offenen Editor also nicht sichtbar.
2. `apps/web/src/pages/WikiPage.tsx` baut beim Autosave `expectedVersion: wiki.page.version` aus dem **frisch nachgeladenen** Query-Cache. Nach der externen Schreibung ist `wiki.page.version` bereits hochgezählt, der gesendete **Inhalt** stammt aber noch aus dem alten Editor-State.
3. Backend `apps/api/src/services/wiki.service.ts` / `wiki-page.repository.ts` prüft `assertVersion(current.version, expectedVersion)`. Da `expectedVersion` mit der aktuellen Serverversion übereinstimmt, wird der Schreibvorgang akzeptiert — der alte Inhalt überschreibt den neuen (Lost Update).

Kernproblem: `expectedVersion` ist von der Version **entkoppelt, auf der der Editor-Inhalt tatsächlich beruht**. Das Optimistic Locking kann externe Änderungen daher nicht erkennen.

## Scope

- `apps/web/src/components/wiki/WikiPageForm.tsx`
- `apps/web/src/pages/WikiPage.tsx`
- `apps/web/src/hooks/useAutoSave.ts`
- `apps/web/src/hooks/useWiki.ts` (Konflikt-Behandlung/Invalidierung)
- Prüfen, ob dasselbe Muster in weiteren Autosave-Formularen besteht: `FeatureForm`, `UseCaseForm`, `TaskForm`, `TicketForm`, `MilestoneForm`, `ProjectForm`, `BacklogItemForm` (alle nutzen `useAutoSave`). Falls ja, im Plan benennen — Fix möglichst an einer gemeinsamen Stelle.

Backend bleibt voraussichtlich unverändert (Locking ist korrekt); nur falls eine serverseitige Lücke gefunden wird, gesondert benennen.

## Aufgabe

1. **Basis-Version mitführen:** Beim Laden/Öffnen einer Seite die Version festhalten, auf der der aktuelle Editor-Inhalt beruht (`baseVersion`). Diese `baseVersion` als `expectedVersion` beim Autosave senden — **nicht** die jeweils aktuelle Cache-Version. Damit führt eine zwischenzeitliche externe Änderung zu `409 CONFLICT` statt zum stillen Überschreiben.
2. **Konflikt aktiv behandeln:** Bei `409 CONFLICT` das Autospeichern **nicht** still wiederholen. Stattdessen den Nutzer aktiv informieren (vgl. FT(32) Aktive Änderungsbenachrichtigung) und eine bewusste Entscheidung anbieten: neu laden (externe Version übernehmen) oder eigene Fassung erneut speichern. Kein automatisches Überschreiben.
3. **Externe Änderung erkennbar machen:** Wenn ein Hintergrund-Refetch eine höhere Version liefert als die `baseVersion` des offenen Editors, dezent anzeigen, dass die Seite extern geändert wurde (ohne den getippten Inhalt zu verwerfen).

## Regeln & Einschränkungen

- Bestehendes Verhalten „lokale Eingaben gehen bei Refetch nicht verloren" (TKT-98) bleibt erhalten.
- Kein stilles Überschreiben fremder Änderungen mehr.
- Frontend-State weiter über TanStack Query; Konfliktfehler über `toQueryError` sauber darstellen.
- Keine Abschwächung des serverseitigen Optimistic Locking.

## Randfälle & Fehlerpfade

- Zwei Tabs desselben Nutzers editieren dieselbe Seite.
- Externe MCP-Schreibung während offenem Editor (der Auslöser dieses Bugs).
- Schneller Folge-Autosave nach Konflikt — kein Endlos-Retry, keine Überschreibung.
- Anlegen neuer Seiten (noch keine Version) bleibt unberührt.

## Seiteneffekte

- Reine Frontend-Konflikt-/Versionslogik; keine Schema- oder API-Änderung erwartet.

## Testhinweise

- Vor Test-Erstellung `test-entwurfsleitplanken` anwenden.
- **Integration/Component:** Editor mit `baseVersion` N geladen; Seite serverseitig auf N+1 geändert; Autosave sendet `expectedVersion = N` → erwartet `409`; UI zeigt Konflikt statt zu überschreiben; Inhalt des Nutzers bleibt erhalten.
- **Negativfall vorher absichern:** Ohne Fix führt derselbe Ablauf zum Überschreiben — als Reproduktions-Test formulieren, dann grün nach Fix.
- **E2E (optional):** Seite öffnen, extern ändern (zweiter Pfad/MCP-Simulation), Autosave auslösen, Konflikthinweis prüfen.

## Abnahmekriterien

- [ ] Reproduktions-Test für das Überschreiben vorhanden und nach Fix grün.
- [ ] Autosave sendet die `baseVersion` des Editor-Inhalts als `expectedVersion`.
- [ ] Externe Änderung an offener Seite führt zu Konflikt-Hinweis, nicht zu stillem Überschreiben; getippter Inhalt bleibt erhalten.
- [ ] Geprüft und dokumentiert, ob die weiteren Autosave-Formulare betroffen sind; ggf. mitbehoben oder als Folgeaufgabe benannt.
- [ ] Keine bestehenden Tests gebrochen; Schritt-Log gemäß agents.md §5.

## Implementierungsreihenfolge

1. Reproduktions-Test (Lost Update) schreiben.
2. `baseVersion`-Mitführung in WikiPageForm/WikiPage umsetzen.
3. Konfliktbehandlung (kein stilles Retry, aktive Meldung) in useAutoSave/useWiki.
4. Andere Autosave-Formulare prüfen, ggf. gemeinsame Lösung.
5. Tests grün, Schritt-Log, Abnahmeprüfung.

## Referenz

- `apps/web/src/pages/WikiPage.tsx` (Zeilen um `expectedVersion: wiki.page.version`)
- `apps/web/src/components/wiki/WikiPageForm.tsx` (TKT-98-Verhalten, `useAutoSave`)
- `apps/web/src/hooks/useAutoSave.ts`, `apps/web/src/hooks/useWiki.ts`
- `apps/api/src/services/wiki.service.ts`, `apps/api/src/repositories/wiki-page.repository.ts` (`assertVersion`)
- Bezug: FT(32) Aktive Änderungsbenachrichtigung / Optimistic Locking
