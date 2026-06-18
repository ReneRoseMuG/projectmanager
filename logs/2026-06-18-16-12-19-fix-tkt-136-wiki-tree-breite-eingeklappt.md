# Log: TKT-136 Wiki-Tree Breite ignoriert eingeklappte Seitennamen

**Datum:** 18.06.26  
**Uhrzeit:** 16:12:19  
**Schritt:** Fix (Auftragsklasse 4)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`computeIdealWidth` in `WikiTree` berechnete die Baumbreite über **alle** Knoten inklusive der Kinder eingeklappter Knoten. Der Aufklappzustand lag lokal je `WikiNode` (`useState`) und war der Breitenberechnung auf Baum-Ebene unbekannt. Folge: eingeklappte (unsichtbare) Seitennamen hielten den Baum unnötig breit.

Lösung: Aufklappzustand auf die `WikiTree`-Ebene gehoben (Set der eingeklappten IDs), an `WikiNode` durchgereicht; `computeIdealWidth` überspringt die Kinder eingeklappter Knoten; der Breiten-Effekt hängt zusätzlich vom Collapse-Zustand ab. Der Default bleibt unverändert (alles ausgeklappt).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Collapse-State von `WikiNode` nach `WikiTree` gehoben; Breitenberechnung ignoriert eingeklappte Teilbäume |

## Probleme und Abweichungen

Keine. Das State-Lifting ließ das Expand/Collapse-Verhalten unverändert (bestehender Interaktionstest bleibt grün).

## Offene Punkte / Folgeaufgaben

Testabdeckung: Die Breitenreduktion ist in jsdom nicht beobachtbar — `measureTextWidth` nutzt `canvas.getContext("2d")`, das in jsdom nicht implementiert ist (alle Textbreiten = 0). Eine sinnvolle Unit-Assertion auf die Breite ist daher nicht möglich; Abdeckungslücke dokumentiert, Verifikation visuell in der App. Testentwurfs-Leitplanke `test-entwurfsleitplanken` angewendet; Ebene Unit; bestehende `WikiTree.test.tsx` grün (8/8), inkl. Collapse-Interaktion. TypeScript-Check (`tsc`) ohne Fehler.
