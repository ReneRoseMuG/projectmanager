# Log: API Key Authentifizierung

**Datum:** 23.05.26  
**Schritt:** Feature — API Key Authentifizierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die bestehende Session-Authentifizierung wurde additiv um einen optionalen API-Key-Pfad erweitert. `API_KEY` wird in der API-Konfiguration als getrimmtes Secret gelesen und bleibt bei fehlendem oder leerem Wert deaktiviert. `requireCurrentUser` prüft nun vor der Session-Auflösung den Header `X-API-Key` und liefert bei exakter Übereinstimmung den Admin-User mit Standardadmin-Rechten. `/api/auth/me` nutzt jetzt ebenfalls die zentrale Auth-Auflösung, damit Session, Dev-Bypass und API-Key konsistent funktionieren. Die neue Env-Variable wurde in `.env.example` dokumentiert und die Auth-/Config-Tests wurden erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/config.ts` | geändert | Optionales `apiKey`-Config-Feld aus `API_KEY` ergänzt |
| `apps/api/src/plugins/auth.ts` | geändert | `X-API-Key`-Prüfung vor Session-Auflösung ergänzt |
| `apps/api/src/services/auth.service.ts` | geändert | Admin-User-Auflösung für API-Key-Authentifizierung ergänzt |
| `apps/api/src/routes/auth.ts` | geändert | `/auth/me` auf `requireCurrentUser` zentralisiert |
| `apps/api/.env.example` | geändert | `API_KEY` mit Geheimhaltungs-Hinweis dokumentiert |
| `tests/integration/api/auth.test.ts` | geändert | API-Key-Erfolgs- und Negativfälle ergänzt |
| `tests/unit/api/config.test.ts` | geändert | Env-Auswertung für leere und gesetzte API-Keys ergänzt |
| `logs/2026-05-23-feature-api-key-auth.md` | neu | Schritt-Log für die Umsetzung |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine funktionalen Abweichungen vom bestätigten Plan. Die Aufgabendatei `codex-auftrag-api-key-auth.md` liegt weiterhin untracked im Repo-Root; sie wurde nicht verschoben, weil das nicht Teil des bestätigten Umsetzungsplans war. Die vorbestehende Änderung an `codex-auftrag-eventbus-sse.md` wurde nicht berührt.

## Offene Punkte / Folgeaufgaben

Der vollständige Testlauf nach Abschnitt 12 wurde noch nicht ausgeführt; bisher wurden gezielt `npm run test -w apps/api -- ../../tests/unit/api/config.test.ts ../../tests/integration/api/auth.test.ts` und `npm run build -w apps/api` erfolgreich ausgeführt.
