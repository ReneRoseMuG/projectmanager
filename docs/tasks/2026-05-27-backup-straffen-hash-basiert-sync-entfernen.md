# Codex-Auftrag: Backup straffen — Hash-basierte Attachments, Sync entfernen

**Datum:** 2026-05-27
**Status:** Bereit zur Implementierung
**Abhängigkeit:** Kann unabhängig von `2026-05-27-html-content-in-datenbank-image-support.md`
umgesetzt werden. Wenn der Content-in-DB-Auftrag bereits abgeschlossen ist, entfällt
der `content/`-Ordner aus dem ZIP vollständig — das vereinfacht diesen Auftrag weiter.

---

## Ziel

Das Vollbackup wird in drei Punkten verbessert:

1. **Hash-basierte Attachments:** Das ZIP enthält nur noch Attachment-Dateien, die sich
   gegenüber dem letzten Backup verändert haben oder neu sind. Unveränderte Dateien
   werden nicht erneut gepackt und übertragen.

2. **Import straffen:** Die Import-Logik enthält doppelten Code zwischen
   `applyInspectedDump` und `applyIncrementalRemoteSync`. Der Datei-Kopierpfad ist
   vierstufig (Puffer → Cache → Stage-Dir → Backup-Dir → Zielverzeichnis) und wird
   auf zwei Stufen reduziert.

3. **Sync-Funktionen entfernen:** `performIncrementalSftpSync` und der zugehörige
   Import- und Preview-Code werden vollständig entfernt. Das Vollbackup mit
   Hash-Filterung übernimmt deren Aufgabe zuverlässiger.

---

## Ist-Zustand (Problemanalyse)

### Redundanzen im Import

**Problem 1 — Vierstufige Dateikopie:**
In `applyInspectedDump` werden Dateien viermal bewegt:
1. `collectZipFiles` → liest jeden Datei-Buffer aus dem ZIP in `zipFileBuffers`-Cache
2. `stageZipRoot` → schreibt aus Cache auf Disk (Stage-Dir)
3. `createFileRootBackups` → kopiert aktuellen Ordner → Backup-Dir (`fs.cpSync`)
4. `replaceFileRoots` → kopiert Stage-Dir → Zielverzeichnis (`fs.cpSync`)

Schritt 3 erzeugt eine Backup-Kopie für den Rollback-Fall. Diese Kopie wird im
`finally`-Block immer gelöscht — auch im Fehlerfall nach dem Rollback. Der
Backup-Dir-Schritt kann entfallen, wenn Stage-Dir und Zielverzeichnis atomar
getauscht werden (Stage-Dir direkt umbenennen statt kopieren).

**Problem 2 — Duplizierter Import-Pfad:**
`applyIncrementalRemoteSync` (`dump.service.ts` ab Zeile 2661) ist nahezu eine
vollständige Kopie von `applyInspectedDump` (ab Zeile 2497):
- Beide rufen `buildDumpArchiveFile` auf (Safety-Backup vor Import)
- Beide rufen `createFileRootBackups` auf
- Beide führen `beginImportTransaction` / `finishImportTransaction` aus
- Beide rufen `verifyRestoredTables` / `verifyRestoredFileRoots` auf
- Beide emittieren identische Progress-Events

**Problem 3 — `buildDumpArchiveFile` im Import:**
Während des Imports wird ein vollständiges ZIP des aktuellen Zustands erstellt
(`targetBackupPath`). Das liest alle aktuellen Dateien erneut von Disk. Mit
Hash-basiertem Backup ist dieses Safety-ZIP bereits implizit vorhanden
(das letzte Backup war bereits ein konsistenter Stand).

### Schwachstellen im Sync (wird entfernt)

`readRemoteSyncManifestOrNull` schluckt alle Fehler kommentarlos und gibt `null`
zurück — der Unterschied zwischen "Manifest nicht vorhanden" und "Manifest
ungültig/Parse-Fehler" ist nicht unterscheidbar. Das führt dazu, dass bei
Parse-Fehlern alle Dateien als "neu" gelten und komplett neu übertragen werden.

---

## Soll-Zustand

### 1 — Lokales Backup-Manifest

Datei: `apps/api/data/last-backup-manifest.json`

Nach jedem erfolgreichen Backup wird dieses Manifest geschrieben. Es enthält
die Datei-Hashes aller Attachment-Dateien aus dem letzten Backup:

```json
{
  "backupId": "taskmanager_20260527T...",
  "createdAt": "2026-05-27T...",
  "files": [
    { "relativePath": "abc123.pdf", "sizeBytes": 12345, "sha256": "..." },
    ...
  ]
}
```

### 2 — Hash-basiertes ZIP-Backup

Beim Erstellen eines Backups:

```
previousManifest = readLastBackupManifest()   // null beim ersten Backup
currentFiles     = listFilesRecursive(uploadDir)  // alle aktuellen Dateien

filesToPack = currentFiles.filter(file =>
  previousManifest?.files.find(f => f.relativePath === file.relativePath)?.sha256
    !== file.sha256
)
// filesToPack enthält: neue Dateien + veränderte Dateien
// unveränderte Dateien werden NICHT gepackt
```

Das ZIP enthält:
- `data.json` — vollständiger DB-Export (immer vollständig)
- `manifest.json` — Hashes ALLER aktuell existierenden Dateien (nicht nur der gepackten)
  plus neues Feld `"partial": true` wenn nicht alle Dateien enthalten sind
- `uploads/` — nur geänderte/neue Attachment-Dateien

Nach erfolgreichem Upload → `last-backup-manifest.json` aktualisieren.

### 3 — Import mit Partial-ZIP-Unterstützung

`inspectDumpArchive` und `applyInspectedDump` werden erweitert:

**Inspect:**
- Liest `manifest.json` → prüft `partial`-Flag
- Bei `partial: true`: ZIP enthält nur einen Teil der Dateien
- Für Dateien im Manifest aber NICHT im ZIP → werden als "local-verify" markiert
- Für Dateien im ZIP → normal verarbeiten

**Apply:**
- Dateien aus ZIP → extrahieren und schreiben (wie bisher)
- Dateien mit "local-verify" → prüfen ob sie lokal vorhanden sind mit korrektem Hash;
  wenn nicht → Blocking-Issue (Datei fehlt, kein Rollout möglich ohne Basis-Backup)
- Dateien lokal vorhanden, die NICHT im Manifest stehen → löschen

**Verbesserter Kopierpfad** (gilt für alle Imports):
- `collectZipFiles` → liest ZIP-Dateien in Buffer-Cache (bleibt)
- `stageZipRoot` → schreibt Buffer in Stage-Dir (bleibt)
- ~~`createFileRootBackups`~~ → entfällt
- `replaceFileRoots` → Stage-Dir per `fs.renameSync` ins Zielverzeichnis tauschen
  (statt `fs.cpSync` + Backup-Dir)
  - Fallback: wenn Rename über Laufwerksgrenzen scheitert → `cpSync` + `rmSync`

**Safety-Backup im Import:**
`buildDumpArchiveFile` vor dem Import wird durch eine einfache DB-Snapshot-Sicherung
ersetzt (`db.backup(targetPath + '.sqlite')`). Die Dateien müssen nicht mehr als ZIP
archiviert werden, weil das letzte Backup bereits ein konsistenter Snapshot war.

### 4 — Zu entfernende Funktionen und Routen

**`dump.service.ts` — Funktionen entfernen:**
- `performIncrementalSftpSync`
- `applyIncrementalRemoteSync`
- `previewIncrementalRemoteSync`
- `inspectIncrementalRemoteSync`
- `stageRemoteSyncFileRoots`
- `stageRemoteSyncRoot`
- `readRemoteSyncManifestOrNull`
- `manifestFileHashByRemotePath`
- `currentSyncFileEntries`
- `fileRootEntries`
- `hasTableChanges` (prüfen ob noch anderswo verwendet)

**`apps/api/src/routes/dumps.ts` — Routen entfernen:**
- `POST /dumps/remote/incremental-sync` (apply)
- `GET /dumps/remote/incremental-sync/preview`

**`apps/web/src/` — Frontend bereinigen:**
- `api/dumps.ts` — Sync-API-Aufrufe entfernen
- `pages/SettingsBackupPage.tsx` — Sync-UI-Bereich entfernen
- `hooks/useBackupProgress.ts` — Sync-Events entfernen
- `hooks/useLocalDumpStatus.ts` — Sync-Status entfernen

**`packages/shared-types/` — Types entfernen:**
- `DumpIncrementalSyncResult`
- `DumpIncrementalSyncPreviewResult`
- `DumpIncrementalSyncApplyRequest`
- `DumpIncrementalSyncApplyResult`

---

## Nicht in diesem Auftrag

- SFTP-Verbindungsparameter ändern (Timeout, Retry-Logik)
- Content-Ordner aus dem ZIP entfernen → ergibt sich automatisch nach Abschluss
  von `2026-05-27-html-content-in-datenbank-image-support.md`
- Vollständige Neuentwicklung der Import-UI

---

## Tests

- Unit-Test für `readLastBackupManifest`: kein Manifest → null; gültiges Manifest → gelesen
- Unit-Test für Hash-Filter: nur geänderte/neue Dateien landen in `filesToPack`
- Integration-Test: Backup → Änderung einer Datei → zweites Backup → ZIP enthält
  nur die geänderte Datei + vollständiges Manifest
- Integration-Test: Import eines Partial-ZIP → unveränderte Dateien bleiben erhalten;
  fehlende lokale Datei → Blocking-Issue
- Integration-Test: Import eines Full-ZIP → funktioniert wie bisher
- Bestehende Backup- und Import-Tests müssen weiterhin grün bleiben

---

## Betroffene Dateien (Zusammenfassung)

```
apps/api/src/services/dump.service.ts        ← Hauptarbeit
apps/api/src/routes/dumps.ts                  ← Routen entfernen
apps/api/data/last-backup-manifest.json       ← neu (gitignore-Eintrag prüfen)
packages/shared-types/src/                    ← Types entfernen
apps/web/src/api/dumps.ts
apps/web/src/pages/SettingsBackupPage.tsx
apps/web/src/hooks/useBackupProgress.ts
apps/web/src/hooks/useLocalDumpStatus.ts
apps/web/src/hooks/useRealtimeSync.ts
```
