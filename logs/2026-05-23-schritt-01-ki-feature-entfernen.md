# Log: KI-Feature entfernen

**Datum:** 23.05.26  
**Schritt:** 1 — KI-Feature entfernen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das lokale KI-Feature wurde aus API, Web, Shared Types, Startskripten und Tests entfernt. Die Fastify-App registriert keine AI-Routen und keinen `aiClient`-Dekorator mehr. Die Web-Oberfläche zeigt keine KI-Agenten- oder KI-Textassistenz-Aktionen mehr; die generische Rich-Text-Komponente behält ihre normale Bearbeitung, Toolbar und Bildfunktionen. KI-bezogene Env-Variablen, Root-Scripts und der lokale Produktionsstart wurden bereinigt. `npm run build` lief nach der Bereinigung erfolgreich durch.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/app.ts` | geändert | AI-Route, AI-Client und AI-Dekorator entfernt |
| `apps/api/src/config.ts` | geändert | KI-Konfiguration aus `AppConfig` und Env-Auswertung entfernt |
| `apps/api/src/types.ts` | geändert | Fastify-`aiClient`-Deklaration entfernt |
| `apps/api/src/plugins/auth.ts` | geändert | `/ai`-Permission-Mapping entfernt |
| `packages/shared-types/src/index.ts` | geändert | AI/Ollama-Typen und `ai`-Resource entfernt |
| `apps/web/src/components/layout/*` | geändert | KI-Agent-Auslöser aus Shell, Sidebar und TopBar entfernt |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | KI-Textassistenz aus generischem Rich-Text-Feld entfernt |
| `package.json`, `apps/api/.env.example`, `Projekt Manager starten.bat` | geändert | AI-Startskripte und Env-Werte entfernt |
| `apps/api/src/routes/ai.ts`, `apps/api/src/services/ai*.ts` | gelöscht | KI-Backend entfernt |
| `apps/web/src/api/ai.ts`, `apps/web/src/components/ai/*` | gelöscht | KI-Webclient und KI-Komponenten entfernt |
| `scripts/*local-ai.ps1` | gelöscht | Ollama-Setup- und Startskripte entfernt |
| `tests/*/ai*`, `tests/fixtures/api/app.ts`, `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert/gelöscht | KI-spezifische Tests und Test-Fixtures bereinigt |

## Probleme und Abweichungen

Keine. MCP-Dokumentation, historische Logs und lokale `.local-ai/`-Runtime-Artefakte wurden gemäß Auftrag bewusst nicht bereinigt.

## Offene Punkte / Folgeaufgaben

Event-Bus-Plan als nächster Schritt.
