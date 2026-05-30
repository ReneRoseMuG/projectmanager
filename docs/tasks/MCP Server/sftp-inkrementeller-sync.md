# Codex-Auftrag: Inkrementeller SFTP-Sync

## Ziel

Der aktuelle SFTP-Backup erzeugt bei jedem Lauf ein vollständiges ZIP-Archiv (alle Tabellen + alle Uploads + alle Content-Dateien). Das ZIP wächst mit jedem Attachment und kann bei mehreren großen PDFs (je 3–10 MB) in Timeouts laufen.

Das neue Verfahren überträgt nur, was sich seit dem letzten Sync verändert hat. Tabellendaten (JSON) sind selbst bei tausenden Datensätzen wenige hundert Kilobyte — der Flaschenhals ist ausschließlich die Übertragung von Binärdateien. Der inkrementelle Sync sendet diese nur noch einmal: beim ersten Auftauchen.

---

## Wie das Verfahren Eigenschaftsänderungen behandelt

Ja — einzelne Feldänderungen werden erkannt und übertragen:

Ändert sich z. B. der Status einer Aufgabe, ändert sich der SHA-256-Hash der gesamten `tasks`-Tabelle. Der Sync erkennt das, überträgt `data.json` neu (enthält alle Tabellendaten, ist reines JSON, typ. unter 500 KB) — aber kein einziges Attachment wird erneut übertragen.

Der bestehende Code berechnet in `buildTableManifest()` bereits SHA-256-Hashes pro Tabelle und in `listFilesRecursive()` SHA-256-Hashes pro Datei. Diese Infrastruktur wird wiederverwendet.

---

## Remote-Verzeichnisstruktur (nach Sync)

```
/remote-dir/
  manifest.json      ← letzter bekannter Zustand (dient als Sync-Baseline)
  data.json          ← vollständiger Tabellenstand (immer aktuell)
  uploads/           ← Upload-Dateien (inkrementell gepflegt)
    dokument.pdf
    foto.jpg
    ...
  content/           ← Content-Dateien (Feature-Markdown usw.)
    features/
      feature-26-sftp.md
      ...
```

Statt vieler datierter ZIP-Archive gibt es genau einen aktuellen Stand. `manifest.json` ist gleichzeitig Sync-State und Verifizierungsgrundlage für den Restore.

---

## Implementierung

### 1. `backup-sftp.service.ts` — fehlende Operationen ergänzen

Aktuell fehlen `deleteFile` und `exists`. Beide werden für den inkrementellen Sync benötigt:

```typescript
export async function deleteBackupSftpFile(filename: string): Promise<void> {
  return withSftpClient(async (client) => {
    await client.delete(remotePath(filename));
  });
}

export async function backupSftpFileExists(filename: string): Promise<boolean> {
  return withSftpClient(async (client) => {
    try {
      await client.stat(remotePath(filename));
      return true;
    } catch {
      return false;
    }
  });
}

export async function downloadBackupSftpTextFile(filename: string): Promise<string> {
  const buffer = await downloadBackupSftpFile(filename);
  return buffer.toString('utf8');
}

export async function uploadBackupSftpFileAtPath(relativePath: string, buffer: Buffer): Promise<void> {
  return withSftpClient(async (client) => {
    await client.put(buffer, remoteNestedPath(relativePath));
  });
}
```

`remoteNestedPath` ist eine neue Hilfsfunktion, die verschachtelte Pfade (z. B. `uploads/dokument.pdf`) sicher unterhalb von `config.backupSftpRemoteDir` auflöst.

Das `BackupSftpClient`-Interface bekommt entsprechende Methoden ergänzt:
```typescript
delete(remotePath: string): Promise<void>;
stat(remotePath: string): Promise<unknown>;
```

---

### 2. `dump.service.ts` — neue Funktion `performIncrementalSftpSync`

Die Funktion wird neben `saveDumpToLocalBackup` hinzugefügt. Sie teilt sich die bestehenden Helfer (`buildTableManifest`, `listFilesRecursive`, `sha256Buffer`, `sha256Json`, `collectDumpTableRows`) vollständig.

#### Rückgabetyp (neu in `shared-types`)

```typescript
export interface IncrementalSyncResult {
  success: boolean;
  error: string | null;
  tablesUpdated: boolean;       // wurde data.json neu hochgeladen?
  filesUploaded: number;        // neu oder geänderte Dateien
  filesDeleted: number;         // auf Remote entfernte Dateien
  totalRemoteFiles: number;     // Dateien auf Remote nach Sync
  syncedAt: string;
}
```

#### Algorithmus

```
1. assertBackupSftpReady()

2. Aktuelle Tabellendaten und Dateilisten berechnen (wie buildDumpArchive, aber kein ZIP):
     currentTables     = collectDumpTableRows(sqlite)
     currentTableMeta  = buildTableManifest(currentTables)
     currentUploads    = listFilesRecursive(config.uploadDir)
     currentContent    = listFilesRecursive(getContentBaseDir())
     currentFiles      = [...currentUploads (mit Präfix "uploads/"), ...currentContent (mit Präfix "content/")]

3. Vorherigen Manifest vom SFTP laden (falls vorhanden):
     try:
       raw = await downloadBackupSftpTextFile("manifest.json")
       prevManifest = parseManifest(JSON.parse(raw))
     catch:
       prevManifest = null   // erster Sync

4. Tabellen vergleichen:
     tablesChanged = prevManifest === null
       || DUMP_TABLE_KEYS.some(key =>
            currentTableMeta[key].sha256 !== prevManifest.tables[key]?.sha256)

     Wenn tablesChanged:
       payload = { appId, formatVersion, dumpId, exportedAt, schemaRevision, tables: currentTables }
       await uploadBackupSftpFile("data.json", Buffer.from(JSON.stringify(payload, null, 2)))

5. Dateien vergleichen — Uploads und Content gemeinsam:
     prevFilesByPath = Map<relativePath, sha256> aus prevManifest.fileRoots (falls vorhanden)
     currFilesByPath = Map<relativePath, { sha256, buffer }> aus currentFiles

     toUpload = currFilesByPath.entries()
       .filter(([path, curr]) => curr.sha256 !== prevFilesByPath.get(path))

     toDelete = prevFilesByPath.keys()
       .filter(path => !currFilesByPath.has(path))

     für jede Datei in toUpload:
       await uploadBackupSftpFileAtPath(path, buffer)

     für jeden Pfad in toDelete:
       await deleteBackupSftpFile(path)   // best-effort, Fehler loggen, nicht abbrechen

6. Neuen Manifest hochladen:
     newManifest = {
       appId, formatVersion, dumpId, exportedAt, schemaRevision,
       tables: currentTableMeta,
       fileRoots: {
         uploads: buildFileRootManifest("uploads", config.uploadDir),
         content:  buildFileRootManifest("content", getContentBaseDir())
       }
     }
     await uploadBackupSftpFile("manifest.json", Buffer.from(JSON.stringify(newManifest, null, 2)))

7. Ergebnis zurückgeben
```

#### Erster Sync / Fallback

Wenn kein `manifest.json` auf dem SFTP vorhanden ist (erster Sync oder Remote wurde geleert), wird alles hochgeladen. Das ist identisch mit dem bisherigen Verhalten, nur ohne ZIP-Overhead.

---

### 3. SFTP-Route in `dumps.ts` — neuer Endpunkt

```
POST /api/dumps/remote/sync
```

Kein Body erforderlich. Ruft `performIncrementalSftpSync(sqlite)` auf und gibt `IncrementalSyncResult` zurück.

Der bestehende Endpunkt `POST /api/dumps/remote/upload` (der das ZIP hochlädt) bleibt erhalten und wird nicht verändert — er dient weiterhin als vollständiger Backup-Mechanismus.

---

### 4. Restore-Kompatibilität

Der Restore-Pfad (`applyRemoteDump`) liest heute ein ZIP herunter. Er muss nicht geändert werden, solange er das ZIP-Format verarbeitet.

Der neue inkrementelle Sync erzeugt kein ZIP. Für den Restore aus einem inkrementellen Sync wird ein separater Restore-Pfad benötigt:

```
GET /api/dumps/remote/sync/preview   → zeigt aktuellen Remote-Stand (manifest.json lesen)
POST /api/dumps/remote/sync/apply    → lädt data.json + alle Dateien herunter und wendet sie an
```

`applyIncrementalRemoteSync` folgt demselben Transaktionsmuster wie `applyInspectedDump`:
- `beginImportTransaction`
- `restoreTables` (aus `data.json`)
- `assertForeignKeys`
- Dateien in Stage-Verzeichnis laden → `replaceFileRoots`
- `finishImportTransaction`
- Bei Fehler: `rollbackImportTransaction` + Dateisystem rollback

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `apps/api/src/services/backup-sftp.service.ts` | `deleteBackupSftpFile`, `uploadBackupSftpFileAtPath`, `downloadBackupSftpTextFile`, `BackupSftpClient`-Interface erweitern |
| `apps/api/src/services/dump.service.ts` | `performIncrementalSftpSync`, `applyIncrementalRemoteSync` hinzufügen |
| `apps/api/src/routes/dumps.ts` | `POST /remote/sync`, `GET /remote/sync/preview`, `POST /remote/sync/apply` |
| `packages/shared-types/src/index.ts` | `IncrementalSyncResult` und zugehörige Preview-Typen |

---

## Tests

- Unit-Test für `performIncrementalSftpSync`:
  - Erster Sync (kein Remote-Manifest): alle Tabellen + alle Dateien hochgeladen
  - Zweiter Sync ohne Änderungen: weder `data.json` noch Dateien erneut hochgeladen
  - Zweiter Sync mit geänderter Task-Eigenschaft: `data.json` hochgeladen, keine Dateien
  - Zweiter Sync mit neuem Attachment: `data.json` hochgeladen + genau 1 Datei neu übertragen
  - Zweiter Sync nach gelöschtem Attachment: Remote-Datei wird gelöscht
- SFTP-Client per `setBackupSftpClientFactoryForTests` mocken (bestehendes Pattern)
