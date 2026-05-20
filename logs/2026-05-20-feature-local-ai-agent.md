# Log: Lokaler KI-Agent

**Datum:** 20.05.26  
**Schritt:** Feature — Lokaler KI-Agent  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde eine lokale KI-Integration auf Basis von Ollama ergänzt. Das Backend bietet neue AI-Endpunkte für lokale Modellliste, RichText-Textassistenz, Agent-Planung und bestätigte Agent-Ausführung. Der App-Agent arbeitet über eine serverseitige Action-Registry und darf in v1 nur fachliche Create- und Relation-Set-Aktionen ausführen; Datei-, Import-, Backup-, Restore-, Update-, Delete- und Unlink-Aktionen sind ausgeschlossen. Im Frontend wurde ein globales KI-Agent-Panel ergänzt und die bestehende RichText-Toolbar um Umformulieren, Absatz formatieren und Hervorhebungen entfernen erweitert. Alle Modellaufrufe sind nicht-persistent; Prompts und Rohantworten werden nicht gespeichert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | AI-DTOs, Textoperationen und Agent-Action-Typen ergänzt |
| `apps/api/src/routes/ai.ts` | neu | Fastify-Routen für Modelle, Textassistenz, Agent-Plan und Agent-Ausführung |
| `apps/api/src/services/ai-ollama.service.ts` | neu | Lokaler Ollama-Client mit Modellliste und Chat-Aufrufen |
| `apps/api/src/services/ai.service.ts` | neu | Textassistenz, Action-Planung, Zielauflösung und Action-Ausführung |
| `apps/web/src/components/ai/AiAgentPanel.tsx` | neu | Globales Agent-Panel mit Modellwahl, Vorschau und Bestätigung |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | KI-Aktionen in die zentrale RichText-Toolbar integriert |
| `apps/api/tests/integration/ai.test.ts` | neu | Integrationstests für AI-API, Blocker und bestätigte Aktionen |
| `apps/web/src/components/ai/__tests__/AiAgentPanel.test.tsx` | neu | Frontendtests für Agent-Planung, Vorschau und Blocker |

## Probleme und Abweichungen

Der erste fokussierte API-Testbefehl wurde mit einem falschen Workspace-relativen Pfad gestartet und fand deshalb keine Testdatei. Der korrekte Befehl wurde anschließend erfolgreich ausgeführt. Die lokalen Tests verwenden gemockte AI-Clients; es wurde kein echtes Ollama gestartet oder kontaktiert.

## Offene Punkte / Folgeaufgaben

Ein vollständiger serieller Testlauf nach Abschnitt 12 wurde noch nicht ausgeführt. Für echte Nutzung muss Ollama lokal installiert sein und mindestens ein Modell, empfohlen `llama3.2:1b`, vorhanden sein.
