# Log: MS-67 AP06 — Per-Worker-Storage

**Datum:** 10.06.26  
**Uhrzeit:** 08:18:00  
**Schritt:** AP06 — Per-Worker-Storage (MS-67)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Helfer für isolierte Storage-Verzeichnisse pro E2E-Worker
(`tests/fixtures/e2e/worker-storage.ts`):
- `workerStoragePaths(index)` → `tests/.runtime/e2e/w<index>/{uploads,previews,content,backups}`.
- `prepareWorkerStorage(index)` → validiert die Ziele über `assertSafeTestRuntimeTargets`
  (AP04-Nachbarschaft), räumt einen vorhandenen Worker-Root ab und legt die
  Verzeichnisstruktur neu an; liefert die Pfade für den Serverstart.
- `cleanupWorkerStorage(index)` → entfernt den Worker-Root.

Damit teilen sich parallele Worker keine Uploads/Content/Previews/Backups mehr
(bisher ein gemeinsames `tests/.runtime/e2e`).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/e2e/worker-storage.ts` | neu | Per-Worker-Storage-Pfade + prepare/cleanup |
| `tests/unit/api/worker-storage.test.ts` | neu | Unit-Test der Storage-Isolation |
| `logs/2026-06-10-08-18-00-ms67-ap06-per-worker-storage.md` | neu | Dieser Schritt-Log |
| `logs/README.md` | geändert | Index-Eintrag AP06 |

## Testleitplanken

- Testebene: **Unit** (Dateisystem unter `tests/.runtime`, erlaubt).
- Beobachtbares Verhalten: alle vier Verzeichnisse existieren und liegen unter
  `tests/.runtime`; verschiedene Worker-Indizes liefern verschiedene Roots; ein
  vorhandener Root (mit Altdatei) wird vor dem Neuaufbau geleert.
- Ergebnis: **3/3 Tests grün**.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

- AP05/AP08: `prepareWorkerStorage` in der worker-scoped Fixture aufrufen und die
  Pfade als `UPLOAD_DIR`/`PREVIEW_CACHE_DIR`/`CONTENT_DIR` an den Worker-API-Server geben.
