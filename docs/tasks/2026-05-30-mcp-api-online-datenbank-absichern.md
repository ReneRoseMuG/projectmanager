# Codex-Auftrag: MCP und API für Online-Datenbank absichern

**Parent:** PROJ-3 — Projekt Manager
**Datum:** 2026-05-30
**Aufgaben-ID:** TASK-174

---

## Ziel

Die Verbindung zwischen API-Server und externer MySQL-Datenbank muss verschlüsselt erfolgen (TLS/SSL). Zusätzlich müssen alle sicherheitskritischen Secrets (Session-Geheimnis, API-Key, MCP Bearer Token) mit starken Zufallswerten belegt sein. Die `.env.example`-Dateien sind so zu aktualisieren, dass künftige Deployments korrekt konfiguriert werden.

## Hintergrund & Kontext

Der Projekt Manager wurde von SQLite auf MySQL migriert. Bei einer lokalen SQLite-Datei ist Transportverschlüsselung irrelevant; bei einer Online-MySQL-Instanz ist sie zwingend. Die Code-Analyse hat ergeben:

- `apps/api/src/db/client.ts`: SSL wird bereits unterstützt — `ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined`. Es fehlt nur `DB_SSL=true` in der Produktivkonfiguration.
- `apps/api/src/config.ts:130`: `SESSION_SECRET` fällt auf den Klartext-Fallback `"taskmanager-local-dev-session-secret-change-me"` zurück, wenn die Env-Variable nicht gesetzt ist.
- `apps/api/.env.example`: `DB_SSL=false` und `SESSION_SECRET=change-me-in-production` sind Platzhalter, die aktiv irreführen.
- Der MCP-Server (`apps/mcp-server`) ist architektonisch bereits sicher: Bearer-Token-Auth mit `timingSafeEqual`, Binding auf `127.0.0.1`. Es gibt keinen Code-Änderungsbedarf am MCP.

## Aufgabe

### 1. Produktiv-.env der API aktualisieren

In `apps/api/.env` (bzw. der tatsächlichen Produktiv-Env-Datei) sicherstellen:

```env
DB_SSL=true
SESSION_SECRET=<starkes-zufaelliges-geheimnis-min-32-zeichen>
API_KEY=<starkes-zufaelliges-geheimnis>
```

Zum Generieren starker Secrets (Node.js):
```js
require("crypto").randomBytes(32).toString("hex")
```

### 2. `.env.example` der API anpassen

In `apps/api/.env.example` den Kommentar und Default für `DB_SSL` und `SESSION_SECRET` so ändern, dass der Sicherheitsbedarf klar kommuniziert wird:

```env
# Für Online-Datenbanken IMMER auf true setzen (TLS-Verschlüsselung)
DB_SSL=false

# Muss in der Produktion durch einen starken Zufallswert ersetzt werden (mind. 32 Zeichen)
# Generieren: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=change-me-in-production

# Optionaler statischer API-Key für externe Clients (MCP-Server). Geheim halten.
API_KEY=
```

### 3. `.env.example` des MCP-Servers anpassen

In `apps/mcp-server/.env.example` einen Hinweis zu starken Tokens ergänzen:

```env
# Muss mit dem API_KEY in apps/api/.env übereinstimmen
PROJECT_MANAGER_API_KEY=

# Starkes Zufalls-Token: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MCP_HTTP_BEARER_TOKEN=
```

### 4. Startup-Warnung für schwache Session-Secrets prüfen

In `apps/api/src/config.ts` ist `sessionSecretIsFallback` bereits vorhanden. Sicherstellen, dass beim Start eine sichtbare Warnung ausgegeben wird, wenn dieser Wert `true` ist (falls noch nicht implementiert).

## Technische Leitplanken

- **Kein Breaking Change** an bestehenden API-Endpoints oder am MCP-Auth-Code.
- **Kein neuer Code** im MCP-Server — der ist korrekt implementiert.
- SSL-Option in `client.ts` nicht ändern — `rejectUnauthorized: true` ist bereits richtig gesetzt.
- `.env`-Dateien mit echten Secrets **nie** committen — nur `.env.example` ändern.

## Regeln & Randfälle

- `DB_SSL=true` erfordert, dass der MySQL-Server ein gültiges TLS-Zertifikat ausstellt. Bei selbst-signierten Zertifikaten muss `rejectUnauthorized: false` gesetzt oder das CA-Zertifikat hinterlegt werden — dies ist aber ein Deployment-Thema, kein Code-Thema.
- Der Fallback-Wert für `SESSION_SECRET` in `config.ts` bleibt für lokale Entwicklung bestehen; nur `sessionSecretIsFallback=true` auslösen und warnen.
- `API_KEY=null` (nicht gesetzt) ist für lokale Entwicklung weiterhin erlaubt — die API akzeptiert dann alle Anfragen ohne Key-Check.

## Seiteneffekte

- Keine funktionalen Änderungen am Verhalten der API oder des MCP.
- Deployment-Dokumentation (falls vorhanden) muss mit den neuen `.env.example`-Hinweisen abgeglichen werden.

## Testanforderungen

- Manuell: API-Start mit `DB_SSL=true` gegen eine SSL-fähige MySQL-Instanz verifizieren.
- Manuell: Startup-Log prüfen, ob bei fehlendem `SESSION_SECRET` eine Warnung erscheint.
- Keine neuen automatisierten Tests erforderlich (reine Konfigurationsänderung).

## Abnahmekriterien

- `DB_SSL=true` ist in der Produktiv-`.env` gesetzt und die API verbindet sich erfolgreich.
- `SESSION_SECRET` ist mit einem zufälligen Wert belegt; kein Fallback-String im Einsatz.
- `API_KEY` und `MCP_HTTP_BEARER_TOKEN` sind mit starken Zufallswerten belegt.
- `.env.example`-Dateien enthalten aussagekräftige Kommentare zur Sicherheitskonfiguration.
- Kein Secret ist in der Git-History.
