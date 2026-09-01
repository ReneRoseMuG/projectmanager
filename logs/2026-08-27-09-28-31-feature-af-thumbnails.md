# Log: `.af`-Thumbnails über Windows Shell

**Datum:** 27.08.26  
**Uhrzeit:** 09:28:31  
**Schritt:** Feature  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Dokument-Manager erkennt ausschließlich Dateien mit der Endung `.af` als Affinity-Dateien mit Kachel-Thumbnail. Die API ruft dafür den lokal registrierten Windows-Thumbnail-Handler über `IShellItemImageFactory` in einem zeitlich begrenzten PowerShell-STA-Prozess auf. Das Ergebnis wird als PNG validiert und erst danach atomar in den bestehenden Preview-Cache verschoben; eine separate JPEG-Datei neben dem Upload entsteht nicht. Die vorhandene Authentifizierung, Prozessbegrenzung, In-Flight-Deduplizierung und Cache-Bereinigung bleiben erhalten. Im Web wird das Thumbnail geladen und bei fehlendem Handler oder Erzeugungsfehler auf ein `AF`-Typ-Icon zurückgefallen. Die alten Endungen `.afdesign`, `.afphoto` und `.afpub` bleiben ausdrücklich ausgeschlossen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/windows-shell-thumbnail.service.ts` | neu | Gekapselter Windows-Shell-Adapter mit Timeout und PNG-Validierung |
| `apps/api/src/services/attachment-preview.service.ts` | geändert | `.af` in die bestehende Thumbnail-Erzeugung und den Cache eingebunden |
| `apps/web/src/components/attachments/attachmentTypes.ts` | geändert | Eigenen Affinity-Dateityp ausschließlich für `.af` ergänzt |
| `apps/web/src/components/attachments/DocumentTile.tsx` | geändert | `.af`-Kacheln für serverseitige Thumbnails freigeschaltet |
| `tests/unit/api/services/attachment-thumbnail.test.ts` | geändert | Endungsregeln einschließlich negativer Legacy-Fälle abgesichert |
| `tests/integration/api/windows-shell-thumbnail.integration.test.ts` | neu | Echte Windows-COM- und Dateisystemgrenze ohne Mocks geprüft |
| `tests/unit/web/components/attachments/DocumentTile.test.tsx` | geändert | Thumbnail-URL und `AF`-Rückfall getestet |
| `docs/design-leitfaden.md` | geändert | DMS-Kachelregel um den lokalen `.af`-Handler ergänzt |

## Testleitplanken

Der Skill `test-entwurfsleitplanken` wurde angewendet. Auf Unit-Ebene werden die Dateitypentscheidung und das sichtbare Kachelverhalten bewiesen. Auf Integrationsebene werden ein echter Windows-PowerShell-Prozess, die COM-Shell-Schnittstelle und echte temporäre Dateien unter dem Betriebssystem-Temp-Verzeichnis verwendet; Mocks kommen nicht zum Einsatz. Als reale positive Quelldatei dient eine PNG mit vorhandenem Windows-Thumbnail-Handler, der Negativfall verwendet einen fehlenden `.af`-Pfad.

## Probleme und Abweichungen

Im Repository und in den freigegebenen Testpfaden liegt keine echte `.af`-Datei. Deshalb konnte der installierte Affinity-spezifische Thumbnail-Handler noch nicht mit einem realen Affinity-Dokument abgenommen werden. Die generische Windows-Shell-Grenze, die ausschließliche Endungsauswahl und das Fehlerverhalten sind grün getestet.

## Offene Punkte / Folgeaufgaben

Eine kleine echte `.af`-Fixture bereitstellen und damit denselben Integrationstest einmal gegen den registrierten Affinity-Handler ausführen.
