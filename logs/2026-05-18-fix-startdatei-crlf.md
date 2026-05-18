# Log: Startdatei CRLF

**Datum:** 18.05.26  
**Schritt:** Fix — Startdatei CRLF  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Startdatei wurde auf Windows-kompatible CRLF-Zeilenenden konvertiert. Die vorherige LF-only-Datei wurde von `cmd.exe` fehlerhaft geparst, wodurch Befehle am Zeilenanfang abgeschnitten wurden. Dadurch entstanden Meldungen wie `le`, `cho`, `wershell` oder `meout` als angeblich unbekannte Befehle. Inhaltlich wurde der Startablauf nicht geändert. Eine entschärfte Parse-Check-Kopie wurde ausgeführt und von `cmd.exe` korrekt gelesen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `Projekt Manager starten.bat` | geändert | Zeilenenden auf CRLF umgestellt |
| `logs/2026-05-18-fix-startdatei-crlf.md` | neu | Log zum Startdatei-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der echte Start wurde nicht ausgeführt, weil die Datei API- und Web-Prozesse startet; geprüft wurde die `cmd`-Lesbarkeit über eine entschärfte Kopie.

## Offene Punkte / Folgeaufgaben

Keine.
