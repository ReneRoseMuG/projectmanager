# Log: Ausgefilterte Dokumente verlieren ihre Markierung

**Datum:** 08.07.26  
**Uhrzeit:** 12:14:13  
**Schritt:** Fix — verwaiste Auswahl in gefilterten Ansichten der Dokumentenbibliothek  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Nutzer meldete: Ein markiertes Dokument wurde durch einen Filter unsichtbar und ließ sich nicht mehr abwählen. Das ist ein von mir verursachter Regress. Der zuvor entfernte Dialog `promptContinueOrClear` hatte genau diesen Zweck — sein Code-Kommentar lautete wörtlich: „Bei ‚Nein' wird die (in gefilterten Ansichten sonst verwaiste) Auswahl vollständig aufgehoben — sie zeigt sonst auf Dokumente, die aus der Liste gefallen sind." Ich habe ihn im Zuge des Drag-&-Drop-Umbaus entfernt, ohne einen Ersatz zu schaffen. Zusätzlich hatte mein damaliger Plan einen Hinweis „n ausgewählt, m nicht sichtbar" versprochen, den ich nicht gebaut und nicht als Abweichung gemeldet habe.

Über die reine Bedienbarkeit hinaus war das ein Sicherheitsproblem derselben Klasse, die der D&D-Umbau gerade beseitigt hatte: `dragDocumentIds` zieht die gesamte `selectedIds`-Menge. Eine unsichtbare Markierung wurde beim Ziehen einer sichtbaren Kachel **stillschweigend mitgeschrieben** — verborgene Schreibwirkung.

Umgesetzt nach Vorgabe des Nutzers: Sobald die Bibliothek vollständig geladen ist, wird die Auswahl auf die tatsächlich sichtbaren Kacheln eingedampft (`visibleDocuments`, also inklusive Endungsfilter). Der versprochene „nicht sichtbar"-Hinweis entfällt damit ersatzlos — es gibt keine unsichtbaren Markierten mehr.

**Der entscheidende Punkt ist das Gate.** `useProgressiveList` lädt alle Blöcke sequenziell nach und bietet dafür bereits ein `isComplete` (`!hasNextPage && !isLoading`), das `useDocumentLibrary` bisher nicht durchreichte. Ein naives `!loading && !loadingMore` wäre falsch: Zwischen zwei Blöcken liegt eine 200-ms-Pause, in der beide Flags `false` sind, obwohl noch Dokumente fehlen. Dort hätte das Pruning eine Auswahl gelöscht, die bloß noch nicht geladen war. Der Effekt hängt deshalb an `isComplete`.

Der State wird nur gesetzt, wenn sich die Menge wirklich ändert (die neue Menge ist stets eine Teilmenge, gleiche Größe heißt unverändert) — keine Render-Schleife.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useDocuments.ts` | geändert | `isComplete` aus `useProgressiveList` durchgereicht |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | `useEffect`: Auswahl auf sichtbare Dokumente eindampfen, Gate `isComplete` |
| `tests/unit/web/pages/DocumentsPage.dnd.test.tsx` | geändert | Fixtures veränderbar gemacht (Filterwechsel, unvollständiger Ladezustand); vier neue Testfälle; Pflichtkommentar erweitert |

Backend, API, Berechtigungen, Datenbank: unberührt.

## Probleme und Abweichungen

**Beobachtung, nicht behoben (kein Auftrag):** Der Endungsfilter-Reset in `DocumentsPage` prüft `if (loading || loadingMore || extFilter === "") return;` und tappt damit in dieselbe 200-ms-Lücke. Kommt die gewählte Endung erst in einem späteren Block vor, setzt er den Filter fälschlich zurück. Der Fehler bestand vor diesem Auftrag; mit dem nun durchgereichten `isComplete` wäre er ein Einzeiler. Dem Nutzer als Folgeaufgabe vorgelegt, nicht eigenmächtig geändert.

Der Nutzer hat auf die Zusatzfrage nach diesem Bug nicht ausdrücklich geantwortet („Ja" bezog sich auf den Plan); der Bug bleibt daher unangetastet.

## Angewendete Leitplanken

`planungsleitplanken` (Plan vorgelegt, Freigabe abgewartet), `test-entwurfsleitplanken`.

**Testebene:** Unit (jsdom). **Mock-Entscheidung:** wie zuvor `@dnd-kit/core` als Page-Grenze, Datenhooks gestubbt; der Bibliotheks-Hook liefert jetzt einen veränderbaren Zustand, damit Filterwechsel und Teil-Ladezustand real durchgespielt werden. **Isolation:** jsdom, keine API, keine Produktivdaten.

**Bewiesenes Verhalten:**
1. Ein Dokument, das aus der Ergebnisliste fällt, verliert die Markierung; das sichtbare Gegenbeispiel bleibt markiert.
2. Ein Dokument, das der Endungsfilter ausblendet, verliert die Markierung.
3. **Solange die Liste unvollständig geladen ist, bleibt die Auswahl unangetastet** — Regressionsschutz gegen die 200-ms-Lücke.
4. Die Drag-Nutzlast enthält nach der Bereinigung nur noch sichtbare IDs — kein stilles Mitziehen.

**Prüfungen:** `npm run typecheck -w apps/web` ✅ · `npm run lint -w apps/web` ✅ · `DocumentsPage.dnd` 11 Tests grün (vorher 7) · `useDocuments`, `DocumentTile`, `documentDnd`, `documentPanelWidth` 31 Tests grün, unverändert.

## Offene Punkte / Folgeaufgaben

- **Endungsfilter-Reset** hängt weiterhin am falschen Gate (siehe oben). Einzeiler, wartet auf Freigabe.
- **Design-Leitfaden §8.26** kennt die Regel „ausgefilterte Dokumente verlieren ihre Markierung" noch nicht. Formulierungsvorschlag liegt dem Nutzer vor; nicht ungefragt geschrieben.
- Weiterhin offen aus den Vorgänger-Logs: keine visuelle Browser-Prüfung, keine E2E-Abdeckung für `/documents`, kein Rückgängig nach einem Drop, In-Memory-Filterung der Bibliotheksliste, Etappe 2 (Mehrfachfilter für Kategorien und Tags).
