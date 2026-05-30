# Codex-Auftrag: Backup-Performance & UX optimieren (SFTP, Fortschritt, Import)

**Parent:** PROJ-3 — Projekt Manager  
**Datum:** 2026-05-26  
**Aufgaben-ID:** TASK-95  
**Feature:** FEAT-40 — Datensicherung & Import

---

## Ziel

Der inkrementelle SFTP-Sync soll ohne Abbruch und in akzeptabler Zeit durchlaufen.
Vollbackup, inkrementeller Sync und Import sollen dem Administrator laufende
Fortschrittsmeldungen über den bestehenden Realtime-Bus senden.
Der Import-Pfad soll Dateien nicht mehrfach lesen.
Das ZIP-Archiv soll direkt in eine Datei gestreamt werden, ohne den kompletten Inhalt im RAM zu halten.

---

## Hintergrund & Kontext

### Problem 1 — SFTP: Eine neue Verbindung pro Operation (Hauptursache für Abbruch)

`withSftpClient()` in `backup-sftp.service.ts` öffnet für **jede einzelne SFTP-Operation**
eine eigene SSH-Verbindung (TCP-Handshake + SSH-Handshake + Authentifizierung).

Beim inkrementellen Sync (`performIncrementalSftpSync`) bedeutet das:
- 1 Verbindung für `readRemoteSyncManifestOrNull`
- 1 Verbindung pro `uploadBackupSftpFileAtPath` (Schleife über alle geänderten Dateien)
- 1 Verbindung pro `deleteBackupSftpFile` (Schleife über alle gelöschten Dateien)
- 1 Verbindung für data.json-Upload
- 1 Verbindung für finales manifest.json-Upload

Bei 30 geänderten Dateien → **33+ Verbindungen**. Viele SFTP-Server drosseln oder
sperren nach vielen schnellen Connects → Timeout/Fehler am Ende.

### Problem 2 — Vollbackup & Import: Dateien werden mehrfach gelesen

**Snapshot-Aufbau** (`buildDumpSnapshot` → `listFilesRecursive`): Liest jede Datei
komplett, um SHA-256 zu berechnen. Wird auch im inkrementellen Sync aufgerufen.

**Import** (`applyInspectedDump`): Jede Datei wird bis zu 4× gelesen:
1. `collectZipFiles` → SHA-256 aus ZIP berechnen
2. `stageFileRoots` → Dateien aus ZIP extrahieren
3. `createFileRootBackups` → `fs.cpSync` des gesamten Upload-Ordners
4. `verifyRestoredFileRoots` → `currentFileRootSummaries` liest wieder alle Dateien

**ZIP im RAM** (`archiveToBuffer`): Alle Chunks werden in einem `Buffer` gesammelt,
bevor geschrieben oder per SFTP übertragen wird.

### Problem 3 — UX: Komplette Blackbox

Der `realtimeBus` (`app.realtimeBus`) ist vorhanden und am Frontend abgehört,
wird beim Backup aber nie genutzt. Alle drei Routes (`/dumps/local/save`,
`/dumps/remote/sync`, `/dumps/remote/sync/apply`) antworten erst nach vollständigem Abschluss.

---

## Aufgabe

### Schritt 1 — `backup-sftp.service.ts`: Persistente Verbindung ermöglichen

Ergänze eine neue Funktion `withSftpSession`, die eine bereits offene
`BackupSftpClient`-Instanz entgegennimmt und alle Operationen darauf ausführt.
Die bestehenden `withSftpClient`-Wrapper (für Einzeloperationen) bleiben für externe
Aufrufe erhalten.

Füge eine Batch-Funktion hinzu, die eine Liste von Operationen innerhalb einer
einzigen SFTP-Verbindung ausführt:

```
async function batchSftpOperations<T>(
  operations: (client: BackupSftpClient) => Promise<T>
): Promise<T>
```

Diese Funktion öffnet **eine** Verbindung, führt alle übergebenen Operationen aus
und schließt die Verbindung danach.

### Schritt 2 — `dump.service.ts`: `performIncrementalSftpSync` auf eine SFTP-Session umstellen

Ersetze die sequenziellen Einzelaufrufe im inkrementellen Sync durch einen einzigen
`batchSftpOperations`-Block, der folgende Schritte innerhalb der offenen Verbindung ausführt:

1. Manifest herunterladen (`client.get("manifest.json")`)
2. data.json hochladen (wenn Tabellen geändert)
3. Geänderte Dateien hochladen (sequenziell, innerhalb derselben Verbindung)
4. Gelöschte Dateien entfernen (sequenziell, innerhalb derselben Verbindung)
5. Manifest hochladen (letzter Schritt)

### Schritt 3 — Realtime-Fortschrittsevents definieren und emittieren

Definiere in `@taskmanager/shared-types` ein neues Event-Interface:

```typescript
interface BackupProgressEvent {
  type: "backup_progress";
  operation: "full_backup" | "incremental_sync" | "import";
  phase: string;           // z.B. "db_export", "archive", "sftp_upload", "file_compare"
  current: number;         // Fortschrittswert (0 wenn unbekannt)
  total: number;           // Gesamtwert (0 wenn unbekannt)
  detail?: string;         // optional: Dateiname, Tabellenname o.ä.
}
```

Emittiere Events an geeigneten Stellen über `app.realtimeBus.publish(event)`:

**Vollbackup (`saveDumpToLocalBackup`):**
- `phase: "db_export"` — nach `collectDumpTableRows`
- `phase: "archive"` — nach `archiveToBuffer`
- `phase: "local_save"` — nach `fs.writeFileSync`
- `phase: "sftp_upload"` — während/nach SFTP-Upload (mit current/total in Bytes)

**Inkrementeller Sync (`performIncrementalSftpSync`):**
- `phase: "manifest_fetch"` — nach Manifest-Download
- `phase: "file_compare"` — nach Hash-Vergleich (mit total = Anzahl zu übertragender Dateien)
- `phase: "file_upload"` — pro hochgeladener Datei (current = N, total = M)
- `phase: "file_delete"` — pro gelöschter Datei
- `phase: "manifest_update"` — nach finalem Manifest-Upload
- `phase: "done"` — Abschlussevent mit Zusammenfassung

**Import (`applyInspectedDump` / `applyIncrementalRemoteSync`):**
- `phase: "staging"` — Dateien werden extrahiert/heruntergeladen
- `phase: "db_restore"` — Tabellen werden wiederhergestellt
- `phase: "file_swap"` — Dateien werden ausgetauscht
- `phase: "verify"` — Prüfsummen werden verifiziert
- `phase: "done"` — Abschlussevent

Da `realtimeBus` derzeit nicht in den Service-Schichten verfügbar ist,
muss er per Parameter oder über einen globalen Event-Emitter zugänglich gemacht werden.
Empfohlener Weg: optionaler `progressCallback`-Parameter in den Service-Funktionen,
den die Route-Handler mit einem `realtimeBus.publish`-Aufruf befüllen.

### Schritt 4 — Import-Pfad: SHA-256 einmalig berechnen

In `inspectDumpArchive` → `collectZipFiles`:
Speichere die gelesenen Buffer aus dem ZIP zwischen (Map: `relativePath → Buffer`).

In `stageFileRoots` → `stageZipRoot`:
Nutze die bereits gelesenen Buffer aus `collectZipFiles` statt das ZIP erneut zu lesen.
Übergib den Map als Parameter oder füge ihn in ein gemeinsames `InspectedDump`-Objekt ein.

Ziel: Jede Datei aus dem ZIP wird **einmal** gelesen. SHA-256 und Staging nutzen denselben Buffer.

### Schritt 5 — ZIP-Streaming statt RAM-Buffer

Ändere `archiveToBuffer` zu `archiveToFile(archive, targetPath)`:
Statt alle Chunks zu sammeln, streame das Archiv direkt in eine temporäre Datei im `backupWorkDir`.

Beim SFTP-Upload: Lese die Datei als Stream und übergib diesen an `client.put`.
`ssh2-sftp-client` unterstützt `ReadableStream` als Input für `put`.

Passe `saveDumpToLocalBackup` entsprechend an: die lokale Datei ist bereits vorhanden
(von `archiveToFile`), kein separater `fs.writeFileSync` nötig.

---

## Technische Leitplanken

- **Kein Breaking Change an bestehenden API-Endpunkten** — alle Routes und Response-Schemas
  bleiben identisch. Nur neue Events werden hinzugefügt.
- **`withSftpClient` für Einzeloperationen beibehalten** — bestehende Aufrufe außerhalb
  des inkrementellen Sync (z.B. `listBackupSftpFiles`, `downloadBackupSftpFile`) dürfen
  nicht verändert werden.
- **Keine Parallelisierung von SFTP-Uploads** — sequenziell bleibt die Anforderung;
  nur der Verbindungsaufbau wird zusammengelegt.
- **`archiver`-Bibliothek** — die bestehende `archiver`/`ZipArchive`-Instanz wird beibehalten;
  nur die Ausgabe wird auf Streaming umgestellt.
- **Typescript strict** — keine `any`-Typen einführen; alle neuen Interfaces vollständig typisieren.
- **Keine Änderungen an der Datenbank oder am Drizzle-Schema** — dieses Feature
  berührt nur Services und Routes.

---

## Regeln & Randfälle

- Falls kein Client den Realtime-Bus abonniert hat (`subscriberCount() === 0`),
  dürfen Events trotzdem publiziert werden — es gibt keine Empfänger, aber auch keinen Fehler.
- Der `progressCallback` darf niemals eine Exception werfen, die den Backup-Vorgang abbricht.
  Wrap ihn in `try/catch` an der Aufrufstelle.
- Wenn der SFTP-Batch-Block fehlschlägt, muss die Verbindung in einem `finally`-Block
  geschlossen werden (analog zum bestehenden `withSftpClient`).
- Der gecachte Buffer-Map in `stageZipRoot` darf nur für die Dauer des Imports im Speicher
  gehalten werden — er ist nach `applyInspectedDump` freizugeben (kein globaler Cache).
- `archiveToFile` muss die temporäre Datei im Fehlerfall ebenfalls bereinigen (`fs.rmSync`).

---

## Seiteneffekte

- **`realtime-event-bus.service.ts`** — keine Änderungen am Interface nötig;
  `publish` wird nur mit dem neuen Event-Typ aufgerufen.
- **`@taskmanager/shared-types`** — neues `BackupProgressEvent`-Interface hinzufügen
  und in den `RealtimeInvalidationEvent`-Union-Typ einbinden.
- **`app.ts` / Route-Handler** (`dumps.ts`)— `realtimeBus` ist bereits auf `app` verfügbar
  (`app.realtimeBus`); die Route-Handler müssen den `progressCallback` befüllen und weitergeben.
- **Tests** (`dump.service.test.ts`, `backup-sftp.service.test.ts`) — bestehende Mocks
  für `BackupSftpClient` müssen um die neuen Batch-Aufrufe erweitert werden.

---

## Testanforderungen

### Integration-Tests (`apps/api/tests/integration/`)

**`dump-incremental-sync.test.ts` (neu oder erweitern):**
- Inkrementeller Sync mit 0 Änderungen → kein Upload, Manifest unverändert
- Sync mit N geänderten Dateien → genau N `client.put`-Aufrufe, alle innerhalb derselben
  Mock-Verbindung (prüfen: `clientFactory` wird nur 1× aufgerufen)
- Sync mit gelöschten Dateien → `client.delete`-Aufrufe innerhalb derselben Verbindung
- SFTP-Fehler mitten im Upload → Fehler wird zurückgegeben, Verbindung wird geschlossen

**`dump-backup.test.ts` (bestehend erweitern):**
- Vollbackup: `archiveToFile` erzeugt eine Datei auf Disk; kein großer RAM-Buffer
- Fortschrittsevents: `progressCallback` wird mit den erwarteten Phasen aufgerufen
- Import: `stageZipRoot` liest jede Datei aus dem ZIP nur einmal
  (prüfen über Mock/Spy auf `file.buffer()` — darf pro Datei nur 1× aufgerufen werden)

### Bestehende Tests

- Alle bestehenden Dump- und SFTP-Tests müssen weiterhin grün sein.
- Mock für `BackupSftpClient.connect` prüfen: beim inkrementellen Sync darf `connect`
  nur **einmal** aufgerufen werden, unabhängig von der Anzahl übertragener Dateien.

---

## Abnahmekriterien

- [ ] `performIncrementalSftpSync` ruft `client.connect` genau **einmal** auf,
      unabhängig von der Anzahl zu übertragender Dateien.
- [ ] `performIncrementalSftpSync` läuft mit realer SFTP-Verbindung ohne Timeout-Fehler
      durch (manueller Test mit NAS oder lokalem SFTP-Server).
- [ ] `progressCallback` wird bei Vollbackup, Sync und Import mit den definierten Phasen aufgerufen.
- [ ] Frontend-Realtime-Verbindung empfängt `backup_progress`-Events während eines laufenden Syncs
      (sichtbar im Browser-DevTools → Network → EventStream).
- [ ] `file.buffer()` wird pro ZIP-Datei im Import-Pfad nur **einmal** aufgerufen.
- [ ] `archiveToBuffer` existiert nicht mehr; ZIP wird direkt in Datei geschrieben.
- [ ] Alle neuen Integration-Tests grün.
- [ ] `vitest run` vollständig grün (keine bestehenden Tests gebrochen).

---

## Referenz

- `apps/api/src/services/dump.service.ts` — Vollbackup, Import, inkrementeller Sync
- `apps/api/src/services/backup-sftp.service.ts` — SFTP-Wrapper mit `withSftpClient`
- `apps/api/src/routes/dumps.ts` — HTTP-Endpunkte
- `apps/api/src/services/realtime-event-bus.service.ts` — SSE-Bus
- `apps/api/src/routes/realtime.ts` — SSE-Endpunkt `/realtime/stream`
- `packages/shared-types/` — Typen für Realtime-Events
- `docs/tasks/2026-05-26-backup-performance-analyse.md` — vollständige Analysedokumentation
