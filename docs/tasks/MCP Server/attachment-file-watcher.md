# Codex-Auftrag: Attachment File Watcher

## Problem

Wenn ein Attachment über `openAttachment` im nativen Editor geöffnet und bearbeitet wird, ändern sich die Bytes auf Disk. Die App bekommt davon nichts mit — der DB-Record behält die alte `size` und das veraltete `updatedAt`. Damit ist der inkrementelle SFTP-Sync zwar in der Lage, die Datei korrekt zu übertragen (da er SHA-256 der tatsächlichen Bytes prüft), aber der Datenbestand ist inkonsistent: ein Restore auf einem anderen System hätte die neue Datei, aber den alten DB-Eintrag.

## Lösung

Nach dem Öffnen einer Datei wird ein temporärer `fs.watch`-Watcher auf genau diese Datei gesetzt. Sobald die Datei gespeichert wird (Ereignis `change`), liest die App die neue Dateigröße, inkrementiert `version` und aktualisiert `size`, `updatedAt` und `updatedBy` im DB-Record.

Der Watcher wird nach dem ersten `change`-Ereignis — oder spätestens nach einem konfigurierbaren Timeout — automatisch beendet.

Keine externe Abhängigkeit nötig: Node's eingebautes `fs.watch` reicht.

---

## Implementierung

### 1. Neuer Service `attachment-watcher.service.ts`

Neue Datei: `apps/api/src/services/attachment-watcher.service.ts`

```typescript
import fs from "node:fs";
import type { DbClient } from "../db/client.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";

const WATCHER_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten

interface ActiveWatcher {
  watcher: fs.FSWatcher;
  timer: NodeJS.Timeout;
}

const activeWatchers = new Map<number, ActiveWatcher>();

function stopWatcher(attachmentId: number): void {
  const entry = activeWatchers.get(attachmentId);
  if (!entry) return;
  entry.watcher.close();
  clearTimeout(entry.timer);
  activeWatchers.delete(attachmentId);
}

export function watchAttachmentForChanges(
  database: DbClient,
  attachmentId: number,
  diskPath: string,
  actorUserId?: number | null
): void {
  // Vorherigen Watcher für dieselbe Datei beenden
  stopWatcher(attachmentId);

  let watcher: fs.FSWatcher;
  try {
    watcher = fs.watch(diskPath, { persistent: false });
  } catch {
    // Datei existiert nicht oder fs.watch nicht verfügbar — still ignorieren
    return;
  }

  const timer = setTimeout(() => stopWatcher(attachmentId), WATCHER_TIMEOUT_MS);

  watcher.on("change", () => {
    stopWatcher(attachmentId);
    try {
      const stat = fs.statSync(diskPath);
      const record = attachmentRepository.findById(database, attachmentId);
      if (!record) return;
      attachmentRepository.updateSizeAndVersion(database, attachmentId, {
        size: stat.size,
        updatedBy: actorUserId ?? null
      });
    } catch {
      // Datei wurde zwischenzeitlich gelöscht oder DB-Update schlägt fehl — still ignorieren
    }
  });

  watcher.on("error", () => stopWatcher(attachmentId));

  activeWatchers.set(attachmentId, { watcher, timer });
}

export function stopAllAttachmentWatchers(): void {
  for (const id of activeWatchers.keys()) {
    stopWatcher(id);
  }
}
```

**Hinweise zur Implementierung:**
- `persistent: false` sorgt dafür, dass der Watcher den Node-Prozess nicht am Beenden hindert
- Der Timeout von 30 Minuten verhindert, dass Watcher unbegrenzt laufen, wenn der Nutzer einen Editor offen lässt
- `stopAllAttachmentWatchers` wird beim App-Shutdown aufgerufen (Graceful Shutdown)

---

### 2. `attachment.repository.ts` — neue Update-Methode

```typescript
updateSizeAndVersion(
  database: DbSession,
  id: number,
  data: { size: number; updatedBy: number | null }
): void {
  const now = new Date().toISOString();
  database
    .update(attachments)
    .set({
      size: data.size,
      updatedBy: data.updatedBy,
      updatedAt: now,
      version: sql`${attachments.version} + 1`
    })
    .where(eq(attachments.id, id))
    .run();
}
```

---

### 3. `attachments.service.ts` — Watcher in `openAttachment` starten

```typescript
// vorher:
export async function openAttachment(database, id, fileOpener) {
  ...
  await fileOpener(diskPath);
}

// nachher:
export async function openAttachment(database, id, fileOpener, actor?) {
  ...
  await fileOpener(diskPath);
  // Watcher nach dem Öffnen registrieren
  watchAttachmentForChanges(database, record.id, diskPath, actor?.actorUserId ?? null);
}
```

Die Route in `attachments.ts` übergibt den vorhandenen `actor` an `openAttachment`.

---

### 4. Graceful Shutdown in `app.ts`

```typescript
app.addHook("onClose", async () => {
  stopAllAttachmentWatchers();
});
```

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `apps/api/src/services/attachment-watcher.service.ts` | neu anlegen |
| `apps/api/src/repositories/attachment.repository.ts` | `updateSizeAndVersion` ergänzen |
| `apps/api/src/services/attachments.service.ts` | `openAttachment` ruft Watcher auf |
| `apps/api/src/routes/attachments.ts` | `actor` an `openAttachment` weitergeben |
| `apps/api/src/app.ts` | `stopAllAttachmentWatchers` im `onClose`-Hook |

---

## Tests

- Watcher registriert sich nach `openAttachment`
- Nach `change`-Ereignis: `size` und `version` im DB-Record aktualisiert
- Nach Timeout: Watcher beendet, kein Update mehr
- Zweites `openAttachment` auf dieselbe Datei: vorheriger Watcher wird ersetzt
- `stopAllAttachmentWatchers` schließt alle offenen Watcher
- Fehlerfall: Datei nicht vorhanden → kein Absturz
