# Log: TKT-138 Wiki-Tree Scrollposition bleibt nach Navigation erhalten

**Datum:** 18.06.26  
**Uhrzeit:** 16:12:19  
**Schritt:** Fix (Auftragsklasse 4)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Beim Wechsel zwischen Wiki-Seiten wechselt der Query-Key in `useWiki` pro Seite (`wiki.detail(id)`), wodurch `wiki.loading` kurz `true` wird und `WikiPage` den gesamten Seitenbaum durch ein Skeleton ersetzt. Dadurch unmountet `WikiTree`, und die Scrollposition seines Scroll-Containers sprang auf 0 zurück.

Lösung minimal-invasiv: Die Scrollposition wird in einer modul-lokalen Variable festgehalten (`onScroll`-Handler) und beim erneuten Mounten per `useLayoutEffect` wiederhergestellt. Bewusst **nicht** gewählt wurde der größere Umbau, den Baum-Query von der Seiten-Query zu trennen — höherer Blast-Radius über `useWiki`/`WikiPage`/`queryKeys`, vom Ticket nicht gefordert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Scrollposition über Remount via modul-lokale Variable + `useLayoutEffect`-Restore bewahren |

## Probleme und Abweichungen

Keine. `WikiTree` unmountet weiterhin bei Navigation (vorbestehendes Verhalten, außerhalb des Auftragsumfangs); behoben wurde nur das Scroll-Symptom.

## Offene Punkte / Folgeaufgaben

Testabdeckung: Scrollpersistenz ist in jsdom nicht aussagekräftig unit-testbar (kein echtes Layout/Scrolling), daher kein synthetischer Test ergänzt — Verifikation visuell in der App oder per E2E. Testentwurfs-Leitplanke `test-entwurfsleitplanken` angewendet; Ebene Unit; bestehende `WikiTree.test.tsx` grün (8/8). TypeScript-Check (`tsc`) ohne Fehler.
