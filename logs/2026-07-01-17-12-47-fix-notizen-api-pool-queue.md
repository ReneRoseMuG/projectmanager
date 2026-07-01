# Log: Notizen API Pool Queue

**Datum:** 01.07.26  
**Uhrzeit:** 17:12:47  
**Schritt:** Fix — Notizen API Pool Queue  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der 500-Fehler bei `GET /api/notes` wurde auf einen Pool-Überlauf zurückgeführt: Die globale Notizenliste löste pro Notiz parallel mehrere Parent-Kontext-Abfragen aus und erreichte bei echten Bestandsdaten das MySQL-Queue-Limit. Die Parent-Kontexte werden nun für alle geladenen Notizen gebündelt pro Owner-Typ abgefragt und anschließend per `noteId` zugeordnet. Dadurch bleiben die Parent-Badges in der Notizen-Hauptansicht erhalten, ohne N+1-Queries auszulösen. Der bestehende Detailpfad bleibt unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/notes.service.ts` | geändert | Gebündelte Parent-Kontext-Abfragen für globale Notizenliste |
| `tests/integration/api/notes.test.ts` | geändert | Regressionstest mit 70 Notizen und Parent-Kontexten ergänzt |
| `logs/2026-07-01-17-12-47-fix-notizen-api-pool-queue.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Graphify war erneut durch den lokalen `uv trampoline`-Fehler nicht nutzbar. Der laufende API-Prozess auf Port 3001 liefert nach der Codeänderung weiterhin 500, weil der aktuelle Dev-Start den bereits geladenen Node-Prozess nicht automatisch neu startet. Die gebaute Service-Funktion lädt die echte Datenbank nach dem Fix erfolgreich.

## Offene Punkte / Folgeaufgaben

Den laufenden API-Server neu starten, damit die Änderung im HTTP-Endpunkt aktiv wird.

## Testleitplanken und Testebenen

Angewendet wurden die Testentwurfsleitplanken für API-Integration und Typecheck. Der Regressionstest nutzt echte HTTP-Routen, echte Testdatenbank-Isolation und echte Parent-Kontext-Daten ohne Mocks.
