# Log: Attachment/DMS-Trennung Abschluss

**Datum:** 01.09.26  
**Uhrzeit:** 09:11:04  
**Schritt:** Abschluss — Attachment/DMS-Trennung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Auftrag zur Trennung von Parent-Attachments und globalem Dokumentenmanagement wurde abgeschlossen und dokumentiert. Die Implementierung trennt fachliche Parent-Dateien von DMS-Dokumenten und verhindert, dass Parent-Ordner als DMS-Sammlungen modelliert werden. Lokale Windows-Ordner beziehungsweise Parent-Dateien sind angebunden. Die zuletzt blockierenden E2E-Probleme wurden gezielt bereinigt: Auth-Tests starten nun mit leerem Storage-State, Kalender-Events können wieder mit Projekten, Meilensteinen und Aufgaben verknüpft werden, und veraltete Kalender-Assertions wurden an den aktuellen UI-Vertrag angepasst. Zusätzlich wurde ein Projekt-Kommentar im Projekt Manager an `PROJ-3` geschrieben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-09-01-09-11-04-abschluss-attachment-dms-trennung.md` | neu | Abschluss-Log zur Attachment/DMS-Trennung |
| `logs/README.md` | geändert | Log-Index um Abschluss-Eintrag ergänzt |
| `PROJ-3 Kommentar #242` | extern | Projekt-Kommentar zum Abschlussstand im Projekt Manager |

## Probleme und Abweichungen

Ein vollständiger erneuter E2E-Gesamtlauf wurde bewusst nicht gestartet, um Budget zu schonen. Stattdessen wurden die bekannten Abschlussblocker gezielt geprüft: `auth.spec.ts` lief mit 3 Tests grün, `calendar.spec.ts` lief mit 7 Tests grün, und der Web-Typecheck war grün.

## Offene Punkte / Folgeaufgaben

Keine bekannten offenen Punkte aus den zuletzt gemeldeten Abschlussblockern. Ein späterer vollständiger E2E-Gesamtlauf kann noch unabhängige, bisher nicht sichtbare Testdrifts finden.
