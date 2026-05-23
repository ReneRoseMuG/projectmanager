# Log: API-Key Env

**Datum:** 23.05.26  
**Schritt:** Fix — API-Key Env  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der neu erzeugte API-Key wurde in die lokale Backend-Umgebungsdatei `apps/api/.env` eingetragen. Zusätzlich wurde derselbe Wert als `PROJECT_MANAGER_API_KEY` gesetzt, damit der lokale MCP-Server denselben Schlüssel für Zugriffe auf die Projekt-Manager-API verwenden kann. Der konkrete Geheimwert wird im Log bewusst nicht wiederholt. Es wurden keine Quellcode-, API-, UI- oder Datenbankschema-Änderungen vorgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env` | lokal geändert | `API_KEY` und `PROJECT_MANAGER_API_KEY` gesetzt |
| `logs/2026-05-23-fix-api-key-env.md` | neu | Schritt-Log für die lokale API-Key-Konfiguration |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
