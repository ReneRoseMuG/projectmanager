# Log: Sichere Prozessbeendigung

**Datum:** 23.07.26  
**Uhrzeit:** 10:58:46  
**Schritt:** Fix — Sichere Prozessbeendigung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die generierte PID-Datei speichert für API, Web und MCP nun Rolle, Prozess-ID und Prozess-Startzeit statt nur wiederverwendbarer numerischer IDs. Die Stop-Routine prüft zusätzlich einen rollenbezogenen Kommandozeilen-Marker und beendet nur Prozesse, deren Identität vollständig zum gespeicherten Eintrag passt. Legacy-PIDs werden nicht direkt vertraut; sie dienen nur einmalig zusammen mit einem passenden Prozess auf dem erwarteten App-Port als Übergangspfad. Fremde Port-Eigentümer werden ausdrücklich nicht beendet, sondern mit Port und PID als Fehler gemeldet. Die Stop-Routine liegt nun als eigenständig testbare Quelldatei vor und wird beim Deployment in das Zielverzeichnis kopiert. Die installierte Fassung wurde aktualisiert, die veraltete PID-Datei bereinigt und der zuvor betroffene Intel-WMI-Dienst blieb aktiv.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/stop.ps1` | neu | Sichere, eigenständig testbare Stop-Routine |
| `scripts/deploy.ps1` | geändert | Prozessmarker und PID-Startzeiten ergänzt; Stop-Skript wird kopiert |
| `tests/integration/scripts/stop-script.test.mjs` | neu | Echte Prozess-, PID- und Port-Sicherheitsfälle |
| `scripts/run-tests.mjs` | geändert | Deployment-Skripttest in den seriellen Gesamtlauf aufgenommen |
| `%LOCALAPPDATA%\Projekt Manager\Stop.ps1` | geändert | Geprüfte Stop-Routine direkt installiert |

## Probleme und Abweichungen

Der erste gezielte Testnachlauf hatte einen Fehler im Testaufbau, weil Node den Test-Marker als eigene CLI-Option interpretierte und den Testprozess vorzeitig beendete. Der Testaufruf wurde nach beendetem Lauf korrigiert; der anschließende Lauf war mit vier von vier Tests grün. Ein vollständiger projektweiter Testlauf wurde entsprechend der Testleitplanken nicht ohne ausdrücklichen Auftrag gestartet.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Testebenen

Angewendet wurde `test-entwurfsleitplanken`. Die Testebene ist Integration: echte Windows-Prozesse, echte Startzeiten, echte PID-Dateien in eindeutigen Temp-Verzeichnissen und ein echter lokaler TCP-Listener; keine Mocks. Abgedeckt sind das Beenden eines korrekt markierten Prozesses sowie die Negativfälle fremde Prozessidentität, Legacy-PID und fremder Port-Eigentümer.
