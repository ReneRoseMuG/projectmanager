# Log: Lokale KI Runtime Paket

**Datum:** 20.05.26  
**Schritt:** Fix — Lokale KI Runtime Paket  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die lokale KI-Integration wurde um einen auslieferbaren Runtime-Pfad ergänzt. Das Repository enthält jetzt Skripte, die eine vorhandene globale Ollama-Installation nutzen oder andernfalls eine portable Ollama-Runtime in `.local-ai/` einrichten. `npm run dev` startet vor API und Web automatisch die lokale KI und stellt das Standardmodell `llama3.2:1b` sicher. Die Windows-Startdatei nutzt denselben Startpfad, sodass der normale App-Start die KI ebenfalls vorbereitet. Die Runtime und Modelle liegen bewusst in `.local-ai/` und werden nicht versioniert.
Die große Runtime-Zip wird nach erfolgreichem Entpacken entfernt, damit nur die nutzbare Runtime und die lokalen Modelle Speicher belegen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.gitignore` | geändert | Lokales KI-Runtime-Verzeichnis `.local-ai/` ausgeschlossen |
| `scripts/setup-local-ai.ps1` | neu | Lädt und entpackt eine portable Ollama-Runtime bei fehlender Installation |
| `scripts/start-local-ai.ps1` | neu | Startet Ollama lokal und stellt das konfigurierte Modell sicher |
| `package.json` | geändert | `ai:setup`, `ai:start` und KI-Start vor `npm run dev` ergänzt |
| `Projekt Manager starten.bat` | geändert | Lokale KI-Vorbereitung in den normalen App-Start integriert |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Der erste Downloadversuch über PowerShell `Invoke-WebRequest` lief in einen Timeout und erzeugte nur eine leere Zip-Datei. Der Setup-Pfad wurde deshalb auf einen sichtbaren, wiederholbaren `curl.exe`-Download mit Fallback umgestellt. Die aktuelle offizielle Windows-amd64-Ollama-Runtime ist groß; auf einem neuen Rechner muss beim ersten Setup mit mehreren Gigabyte Download für Runtime und Modell gerechnet werden.

## Offene Punkte / Folgeaufgaben

Keine.
