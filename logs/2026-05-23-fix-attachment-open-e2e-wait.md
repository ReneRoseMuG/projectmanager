# Log: Attachment Open E2E Wait

**Datum:** 23.05.26  
**Schritt:** Fix — Attachment Open E2E Wait  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der rote Browser-/E2E-Test für „Lokal öffnen“ bei Attachments wurde stabilisiert. Der Test wartete bisher nach dem ersten Klick nur auf den Open-Request, aber nicht auf die abgeschlossene 204-Antwort; dadurch konnte der zweite Klick noch in den laufenden Mutation- oder Disabled-Zustand fallen. Der Test wartet jetzt explizit auf die 204-Antwort des erfolgreichen Open-Aufrufs und anschließend auf die 404-Antwort des Fehlerfalls, bevor die Toast-Meldung geprüft wird. Die angewendeten Testleitplanken waren `projekt-manager-planungsleitplanken` und `projekt-manager-test-entwurfsleitplanken`; abgedeckte Testebene ist Browser/E2E mit echter UI-Interaktion und isolierten Playwright-Testdaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/browser/web/freshness.spec.ts` | geändert | Attachment-Open-Test wartet auf konkrete 204- und 404-Antworten |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
