# Log: Büroumgebung KI Runtime

**Datum:** 20.05.26  
**Schritt:** Fix — Büroumgebung lokale KI und App-Start  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Büroumgebung wurde auf den aktuellen lokalen KI-Stand nachgezogen. Zunächst wurde bestätigt, dass weder eine globale Ollama-Installation im PATH noch eine portable `.local-ai/`-Runtime vorhanden war. Anschließend wurde `npm run ai:start` ausgeführt; dabei wurde die portable Ollama-Runtime lokal eingerichtet, der Dienst auf `127.0.0.1:11434` gestartet und das Modell `llama3.2:1b` installiert. Danach wurden fehlende lokale Node-Abhängigkeiten über `npm install` nachgezogen und `packages/shared-types` neu gebaut, damit API und Web gegen die aktuellen Shared Types laufen. API, Web und KI wurden über `npm run dev` gestartet und per HTTP geprüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.local-ai/` | lokal angelegt | Portable Ollama-Runtime, Modellablage und lokale Dev-Logs; nicht versioniert |
| `node_modules/` | lokal aktualisiert | Fehlende aktuelle Web-Abhängigkeiten wie `@tldraw/tldraw` installiert; nicht versioniert |
| `logs/2026-05-20-fix-bueroumgebung-ki-runtime.md` | neu | Schritt-Log zur Büroumgebungseinrichtung |
| `logs/README.md` | geändert | Log-Index um diesen Auftrag ergänzt |

## Probleme und Abweichungen

Der erste App-Start zeigte veraltete lokale Build-Artefakte in `packages/shared-types/dist`, wodurch API und Web neue Shared-Type-Exports nicht fanden. Das wurde durch `npm run build -w packages/shared-types` behoben. Der Web-Typecheck fand danach eine fehlende lokale Dependency `@tldraw/tldraw`; `npm install` hat die lokale Installation zur vorhandenen Lockfile nachgezogen. `npm install` meldet 19 npm-audit-Hinweise, diese blockieren den Start nicht und wurden nicht eigenständig behoben. Ein Probeaufruf auf `/ai/models` war falsch, weil die Route unter `/api/ai/models` registriert ist; der korrekte Endpunkt ist grün.

## Offene Punkte / Folgeaufgaben

Keine für die lokale Lauffähigkeit. Eine spätere Sicherheitsprüfung der npm-audit-Hinweise kann separat beauftragt werden.
