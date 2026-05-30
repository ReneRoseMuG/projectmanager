# Analyse: Backup-Performance & UX-Probleme

**Datum:** 2026-05-26  
**Status:** Beratung abgeschlossen — Implementierung ausstehend  
**Betroffene Dateien:**
- `apps/api/src/services/dump.service.ts`
- `apps/api/src/services/backup-sftp.service.ts`
- `apps/api/src/routes/dumps.ts`

---

## Zusammenfassung

Es wurden drei Problembereiche identifiziert:

1. **Inkrementelles Backup:** öffnet für jede einzelne Datei-Operation eine eigene SFTP-Verbindung → unerträgliche Laufzeit, Fehler durch Verbindungserschöpfung
2. **Vollbackup & Import:** liest Dateien mehrfach, hält alles im RAM, keine Parallelität beim Schreiben
3. **UX:** keine Fortschrittsanzeige für den User — weder beim Vollbackup noch beim inkrementellen Sync

---

## Problem 1 — SFTP: Eine neue Verbindung pro Operation (Hauptursache)

### Fundstelle

`backup-sftp.service.ts`, Funktion `withSftpClient()`:

```ts
async function withSftpClient<T>(operation: ...) {
  const client = clientFactory();
  await client.connect({ ... }); // ← neue Verbindung
  return await operation(client);
  // ↑ danach: client.end()
}
```

Jede öffentliche Funktion (`uploadBackupSftpFile`, `uploadBackupSftpFileAtPath`,
`deleteBackupSftpFile`, `downloadBackupSftpTextFile` …) ruft `withSftpClient` separat auf.

### Was passiert beim inkrementellen Sync (`performIncrementalSftpSync`)?

Der Ablauf öffnet sequenziell folgende Verbindungen:

| Schritt | Funktion | Verbindungen |
|---|---|---|
| Manifest lesen | `readRemoteSyncManifestOrNull` → `downloadBackupSftpTextFile` | 1 |
| data.json hochladen (wenn geändert) | `uploadBackupSftpFile` | 1 |
| Geänderte Dateien hochladen | `uploadBackupSftpFileAtPath` in Schleife | **N** (eine pro Datei) |
| Gelöschte Dateien entfernen | `deleteBackupSftpFile` in Schleife | **M** (eine pro Datei) |
| Manifest hochladen | `uploadBackupSftpFile` | 1 |

**Beispiel:** 30 geänderte Anhänge + 5 gelöschte = **37 SFTP-Verbindungen**.

Jede SFTP-Verbindung benötigt TCP-Handshake + SSH-Handshake + Passwort-Authentifizierung.
Bei einem lokalen NAS sind das 1–3 Sekunden pro Verbindung → **37–111 Sekunden nur für Verbindungsaufbau**.
Bei erhöhter Latenz (VPN, Internet-SFTP) multipliziert sich das.

### Warum bricht es ab?

Viele SFTP-Server begrenzen die Anzahl gleichzeitiger oder aufeinanderfolgender Verbindungen
pro User/IP innerhalb kurzer Zeit. Nach N schnellen Connects wird die Verbindung verweigert
oder mit Timeout bestraft → der Fehler tritt am Ende einer langen Upload-Reihe auf.

### Lösung (konzeptionell)

Die gesamte Sync-Operation muss eine einzige SFTP-Verbindung halten und alle Uploads/Deletes
innerhalb dieses einen `withSftpClient`-Aufrufs sequenziell ausführen. Alternativ kann die
Verbindungslogik so refaktoriert werden, dass eine bereits geöffnete Connection übergeben wird.

---

## Problem 2 — Vollbackup: Mehrfaches Lesen aller Dateien

### 2a. `buildDumpSnapshot` liest jede Datei für SHA-256

`buildFileRootManifest` → `listFilesRecursive` liest beim Snapshot-Aufbau
**jede einzelne Datei** im Upload- und Content-Ordner, um SHA-256-Hashes zu berechnen.
Das passiert auch beim inkrementellen Sync, der intern ebenfalls `buildDumpSnapshot` aufruft.

Wenn z. B. 200 Anhänge à 1 MB vorhanden sind → 200 MB werden gelesen, nur um Hashes zu erzeugen.

### 2b. Import liest jede Datei dreimal

Beim `applyInspectedDump`-Ablauf:

| Schritt | Funktion | Dateien gelesen |
|---|---|---|
| ZIP-Inspektion | `inspectDumpArchive` → `collectZipFiles` | alle Dateien im ZIP |
| Staging | `stageFileRoots` → `stageZipRoot` | alle Dateien im ZIP (nochmal) |
| Backup vor Import | `createFileRootBackups` → `fs.cpSync` | alle Dateien auf Disk |
| Verifikation nach Import | `verifyRestoredFileRoots` → `currentFileRootSummaries` | alle Dateien auf Disk |

Eine Datei wird also bis zu 4-mal gelesen. Bei einem Backup mit vielen Anhängen
bedeutet das ein Vielfaches der eigentlichen Datenmenge.

### 2c. `archiveToBuffer` hält das gesamte Archiv im RAM

```ts
function archiveToBuffer(archive: Archiver): Promise<Buffer> {
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  archive.on("end", () => resolve(Buffer.concat(chunks)));
  ...
}
```

Das gesamte ZIP wird in einem `Buffer` gehalten, bevor es gespeichert oder per SFTP übertragen wird.
Bei 500 MB Anhängen + DB = 500+ MB RAM für die Dauer des Backups.

### Lösung (konzeptionell)

- SHA-256-Hashes könnten gecacht werden (z. B. in einem LRU-Cache im Memory, invalidiert bei Dateiänderung)
- Beim Import: SHA-256 einmalig beim Entpacken berechnen, Ergebnis für Verifikation wiederverwenden
- Archiv direkt in Datei streamen statt alles in RAM zu halten; anschließend die Datei per SFTP streamen

---

## Problem 3 — UX: Komplette Blackbox

### Inkrementelles Backup

Die Route `POST /dumps/remote/sync` ist ein normaler HTTP-Request, der erst antwortet,
wenn der gesamte Sync abgeschlossen (oder fehlgeschlagen) ist.
Der User sieht währenddessen nichts.

`performIncrementalSftpSync` enthält keinerlei Fortschrittsemission.
Der vorhandene `realtimeBus` (SSE) wird an keiner Stelle genutzt.

Bei langen Läufen kommt dazu:
- Kein Timeout-Hinweis
- Kein Zwischenergebnis (z. B. „15 von 32 Dateien hochgeladen")
- Fehler am Ende geben nicht an, wie weit der Sync kam

### Vollbackup

Auch `saveDumpToLocalBackup` antwortet erst nach vollständigem Abschluss.
Der User wartet ohne Rückmeldung.

### Lösung (konzeptionell)

Der `realtimeBus` ist bereits vorhanden und wird von Frontend-Seite aktiv abgehört.
Progress-Events könnten dort publiziert werden, z. B.:

```
{ type: "backup_progress", phase: "upload_files", current: 15, total: 32 }
```

Alternativ: die Sync-Route gibt sofort eine Job-ID zurück, und ein separater
`GET /dumps/remote/sync/status/:jobId` liefert den aktuellen Fortschritt.

---

## Priorisierung

| # | Problem | Auswirkung | Aufwand |
|---|---|---|---|
| 1 | SFTP: eine Verbindung pro Datei | **kritisch** — Timeout/Abbruch | mittel |
| 2 | Kein Fortschritt für den User | hoch — UX-Blackbox | gering–mittel |
| 3 | Mehrfaches Lesen beim Import | mittel — langsam, aber kein Abbruch | mittel |
| 4 | Archiv im RAM | mittel — Speicherproblem bei großen Backups | mittel |

---

## Empfohlene Reihenfolge

**Schritt 1 (sofort):** SFTP-Verbindung für den gesamten inkrementellen Sync halten.
Das behebt den Abbruch und bringt den größten Geschwindigkeitsgewinn.

**Schritt 2:** Fortschrittsevents über `realtimeBus` beim Sync emittieren.
Damit bekommt der User Rückmeldung, ohne dass das Backend umgebaut wird.

**Schritt 3:** Import-Pfad optimieren (Hashes einmalig berechnen, kein doppeltes Lesen).

**Schritt 4:** Archiv-Streaming evaluieren (sinnvoll erst wenn Backup-Dateien groß werden).

---

## Referenz

- `apps/api/src/services/dump.service.ts` — Vollbackup, Import, inkrementeller Sync
- `apps/api/src/services/backup-sftp.service.ts` — SFTP-Wrapper mit `withSftpClient`
- `apps/api/src/routes/dumps.ts` — HTTP-Endpunkte (kein Streaming, reines Request/Response)
- `apps/api/src/services/realtime-event-bus.service.ts` — SSE-Bus (vorhanden, ungenutzt beim Backup)
- `apps/api/src/routes/realtime.ts` — SSE-Endpunkt (`/realtime/stream`)
