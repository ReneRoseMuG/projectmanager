# Log: DMS mit eigenem Scrollcontainer

**Datum:** 12.07.26  
**Uhrzeit:** 03:38:33  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumentbibliothek besitzt auf Desktop-Größe nun einen eigenen begrenzten Scrollcontainer unterhalb der Filterleiste. Auswahlleiste, Lade- und Fehlermeldungen, Dokumentkacheln sowie die Nachladeanzeige liegen gemeinsam in diesem Container. Die Filterleiste befindet sich außerhalb des scrollenden Inhalts und hat einen vollständig deckenden Hintergrund; Dokumente können deshalb nicht mehr oberhalb der Leiste sichtbar werden. Die vorhandenen Filter-, Auswahl-, Drag-and-Drop- und Upload-Abläufe wurden nicht verändert. Der Fix wurde gebaut, in die lokale Installation eingespielt und über den Gesundheitsstatus sowie die ausgelieferten Produktionsdateien kontrolliert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Bibliothekshöhe begrenzt und eigenen Scrollcontainer unter der Filterleiste ergänzt |
| `tests/unit/web/pages/DocumentsPage.upload.test.tsx` | geändert | Struktur-Regression für getrennte Filter- und Scrollbereiche ergänzt |
| `logs/2026-07-12-03-38-33-fix-dms-eigener-scrollcontainer.md` | neu | Umsetzungs- und Prüfnachweis |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Testleitplanken

Angewendet wurden die Testentwurfsleitplanken auf Unit-Ebene. Der Test rendert die echte `DocumentsPage` mit isolierten Datenhooks und weist nach, dass eine echte Dokumentkachel innerhalb des scrollenden Bereichs liegt, die Filterleiste jedoch außerhalb als direktes Geschwisterelement verbleibt. Der gezielte Testlauf bestand mit 10 von 10 Tests; Typecheck, ESLint und der vollständige Produktions-Build waren ebenfalls erfolgreich.

## Probleme und Abweichungen

Der erste Testlauf verwendete irrtümlich den vollständigen Dateinamen als sichtbaren Kacheltext, obwohl die bestehende Kachel die Erweiterung bewusst ausblendet. Die Abfrage wurde auf den bereits vorhandenen vollständigen Titel der Kachel korrigiert. Die eingebettete Browserinstanz war nicht verfügbar, daher konnte kein automatisierter Scroll-Screenshot erstellt werden; API, Weboberfläche und beide neuen Containerkennungen wurden stattdessen in der ausgelieferten Installation geprüft.

## Offene Punkte / Folgeaufgaben

Keine.
