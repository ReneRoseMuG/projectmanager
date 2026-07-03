# Log: Attachment-Ablage von SFTP-Sync auf Nextcloud umgestellt

**Datum:** 03.07.26  
**Uhrzeit:** 06:19:50  
**Schritt:** Feature/Umstellung — Attachment-Sync auf Nextcloud (Kontext MS-75 DMS)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die App synchronisierte Attachment-Dateien bisher selbst per SFTP zwischen lokalem Upload-Ordner und einem Webspace. Da die produktive DB zentral bei Aiven liegt (beide Rechner teilen sie) und nur die Datei-Bytes verteilt werden mussten, wird diese Aufgabe künftig vom Nextcloud-Desktop-Client übernommen. Der Umstellungskern ist eine Konfigurationsänderung: `UPLOAD_DIR` zeigt jetzt auf den lokalen Nextcloud-Ordner. Weil die `attachments`-Tabelle nur relative UUID-Dateinamen speichert, ist das transparent — kein Schema-Change, keine Migration. Die komplette SFTP-Sync-Schicht (Service, Route, Admin-Seite, Web-API, Query-Keys, Shared Types, zugehöriger Test) und die Abhängigkeit `ssh2-sftp-client` (einziger Nutzer war dieser Sync) wurden ersatzlos entfernt. Watcher, Vorschau-Cache und statisches `/uploads`-Serving bleiben unberührt. Backend, Frontend und Shared Types kompilieren fehlerfrei.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/attachment-sync.service.ts` | gelöscht | Kompletter SFTP-Delta-Sync mit Manifest |
| `apps/api/src/routes/attachment-sync.ts` | gelöscht | Status-/Run-Endpunkte |
| `apps/web/src/pages/admin/AttachmentSyncPage.tsx` | gelöscht | Admin-Seite „Attachment-Synchronisation" |
| `apps/web/src/api/attachment-sync.ts` | gelöscht | Web-API-Aufrufe |
| `tests/integration/api/attachment-sync.test.ts` | gelöscht | Test des entfallenden Sync-Codes |
| `apps/api/src/services/attachments.service.ts` | geändert | `push/removeAttachmentToRemote`-Aufrufe + Import entfernt |
| `apps/api/src/app.ts` | geändert | Startup-Sync, Imports und Route-Registrierung entfernt |
| `apps/api/src/config.ts` | geändert | `sftp*`/`attachmentSync*`-Felder entfernt |
| `apps/api/src/plugins/auth.ts` | geändert | Permission-Mapping `/attachment-sync` entfernt |
| `apps/api/package.json` | geändert | `ssh2-sftp-client` + `@types/...` entfernt |
| `apps/api/.env` | geändert | `UPLOAD_DIR` → Nextcloud-Pfad; tote SFTP-Variablen entfernt |
| `apps/api/.env.example` | geändert | SFTP-/Sync-Variablen aus Doku entfernt |
| `apps/web/src/App.tsx` | geändert | Import, Route `/admin/sync`, Legacy-Redirect `/settings/backup` entfernt |
| `apps/web/src/components/layout/AdminSidebar.tsx` | geändert | Nav-Eintrag „Sync" + ungenutzter Icon-Import entfernt |
| `apps/web/src/queries/queryKeys.ts` | geändert | `attachmentSync`-Block entfernt |
| `apps/web/src/queries/invalidation.ts` | geändert | `attachmentSync.root` + `invalidateAttachmentSync` entfernt |
| `packages/shared-types/src/index.ts` | geändert | `AttachmentSyncReadiness/Stats/Status` entfernt |
| `tests/fixtures/api/app.ts` | geändert | Sync-Route-Registrierung aus Test-App entfernt |
| `package-lock.json` | geändert | 63 Pakete durch Dependency-Entfernung bereinigt |

## Probleme und Abweichungen

- **Scope-Erweiterung (vorab benannt):** Zusätzlich zum geplanten Umfang entfielen der Sidebar-Nav-Eintrag `/admin/sync` und die Legacy-Weiterleitung `/settings/backup` → `/admin/sync`, die sonst ins Leere gezeigt hätte.
- **Beobachtung (nicht angefasst):** Die `BACKUP_SFTP_*`-Variablen in der `.env` sind tote Konfiguration — es existiert kein Backup-Code mehr im Repo, `config.ts` liest sie nicht. Kandidat für separaten Aufräumauftrag.
- **Fremde Änderungen bewahrt:** Der Working Tree enthielt uncommittete Fremdänderungen (Wiki, Kalender, Journal, `date.ts`); ausschließlich attachment-sync-bezogene Zeilen wurden angefasst.

## Offene Punkte / Folgeaufgaben

- **Nutzer:** Bestandsdateien aus dem alten Upload-Ordner nach `C:\Users\schro\Nextcloud\Next Cloud Projekte\Projekt Manager Attachments` kopieren **bevor** die App neu gestartet wird; NC-Ordner auf „immer auf diesem Gerät behalten" stellen.
- **Büro-Rechner:** dort `UPLOAD_DIR` in der lokalen `.env` auf den Büro-Nextcloud-Pfad setzen (reine Konfiguration, kein Code).
- **Testlauf:** Build (API + Web) grün; vollständiger Vitest-/E2E-Lauf noch nicht ausgeführt (Angebot offen).
- **Architektur-Leitfaden:** Entfernung der SFTP-Sync-Schicht dokumentieren (Leitfaden-Pflege).
