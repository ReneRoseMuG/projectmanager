# Log: Kalender-Sync-Konfiguration DB-gestützt (Admin)

**Datum:** 07.07.26  
**Uhrzeit:** 08:10:38  
**Schritt:** Feature — Kalender-Sync-Konfiguration von .env in den DB-gestützten Admin-Bereich  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Google-/Sync-Konfiguration des Kalender-Sync (MS-79) wird nicht mehr ausschließlich pro Arbeitsplatz in der `.env` gepflegt, sondern zentral in der Datenbank. Sechs Werte (Client-ID, Client-Secret, Redirect-URI, Sync an/aus, Intervall, Push-Webhook-URL) liegen als eine versionierte `GLOBAL`-Zeile in `settings_values`; ein neuer `calendar-config.service` löst sie mit der Vorrangkette DB → `.env` → Default auf. Das Client-Secret wird über den bestehenden `credential-cipher` (AES-256-GCM) verschlüsselt abgelegt und nur maskiert ausgeliefert. Einziger verbleibender Pflicht-`.env`-Wert pro Rechner ist der `CALENDAR_ENCRYPTION_KEY` (muss auf allen Rechnern identisch sein). Eine neue Admin-Seite „Kalender-Synchronisation" unter `/admin/calendar` pflegt die Werte; OAuth-Flow und Scheduler lesen die Konfiguration zur Laufzeit, sodass Sync an/aus und Intervall ohne Serverneustart wirken. Verifikation: shared-types-Build, Typecheck API + Web, 18 Testdateien / 164 Tests grün (inkl. neuer Suite und nachgezogener OAuth-/Journal-Tests). Der Architektur-Leitfaden §4 wurde nach Freigabe um das Muster „Server-Konfiguration (DB-gestützt)" ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | DTOs CalendarSyncConfigView / UpdateCalendarSyncConfigRequest + Intervall-Konstanten |
| `apps/api/src/services/calendar-config.service.ts` | neu | GLOBAL-Zeile in settings_values, effektive Config DB→env→Default, Secret ver-/entschlüsseln, maskierte View |
| `apps/api/src/routes/calendar-settings.ts` | neu | GET/PUT /calendar-settings mit config.auth-Override (settings:read / settings:admin) |
| `apps/api/src/services/calendar-scheduler.service.ts` | geändert | applyCalendarSchedulerState (an/aus, Intervall), Webhook aus effektiver Config |
| `apps/api/src/services/google/google-oauth.service.ts` | geändert | Client-Credentials/Redirect aus effektiver Config; buildGoogleAuthUrl(db, userId) |
| `apps/api/src/routes/calendar-connections.ts` | geändert | /config, auth-url, select, watch, delete nutzen effektive Config |
| `apps/api/src/app.ts` | geändert | Route registriert; Boot über applyCalendarSchedulerState statt env-Snapshot |
| `apps/api/.env.example` | geändert | Google-/Sync-Werte als optionaler .env-Fallback; ENCRYPTION_KEY als einzige Pflicht |
| `apps/web/src/api/calendarSettings.ts` | neu | Web-API get/update |
| `apps/web/src/hooks/useCalendarSyncSettings.ts` | neu | Query/Mutation-Hook |
| `apps/web/src/pages/admin/CalendarSyncSettingsPage.tsx` | neu | Admin-Seite mit maskiertem Secret-Feld, env-Fallback-Hinweis, Encryption-Key-Warnung |
| `apps/web/src/App.tsx` | geändert | Route /admin/calendar (adminAccess-gated) |
| `apps/web/src/components/layout/AdminSidebar.tsx` | geändert | Nav-Eintrag „Kalender-Sync" |
| `apps/web/src/queries/queryKeys.ts` / `invalidation.ts` | geändert | calendarSettings-Key + Invalidierung |
| `apps/web/src/pages/SettingsCalendarConnectionsPage.tsx` | geändert | Hinweistext verweist auf Admin-Seite statt nur .env |
| `tests/integration/api/calendar-config.test.ts` | neu | 14 Tests: Secret verschlüsselt+maskiert, DB→env→Default, 401/403, 409, Scheduler |
| `tests/integration/api/google-oauth.test.ts` / `calendar-journal.test.ts` | geändert | buildGoogleAuthUrl-Signatur (async + db) nachgezogen |
| `tests/fixtures/api/app.ts` | geändert | neue Route in der Test-App registriert |
| `docs/architektur-leitfaden.md` | geändert | §4 Unterabschnitt „Server-Konfiguration (DB-gestützt)" |

## Probleme und Abweichungen

Zwei bewusste, mit Rene abgestimmte Abweichungen vom Plan: (1) Das Secret-Handling wurde im dedizierten `calendar-config.service` gekapselt, statt den generischen Settings-Dienst um einen `secret`-Typ zu erweitern — gleiches Ergebnis, sauberere Schichtung; ein Cache wurde bewusst weggelassen (seltene Zugriffe). (2) Keine Web-Unit-Tests, da im Projekt keine entsprechende Infrastruktur existiert (keine `*.test.tsx`); die Web-Seite ist über den Typecheck und die serverseitigen Tests abgesichert. Beim Testlauf zeigte sich, dass HTTP-Routen zusätzlich in `tests/fixtures/api/app.ts` (buildTestApp) registriert werden müssen — nachgeholt.

## Offene Punkte / Folgeaufgaben

Optional: Component-/E2E-Test für die Admin-Seite, sobald eine Web-Test-Infrastruktur eingerichtet wird. `docs/architektur-leitfaden.md` §5 („Ist-Zustand") wirkt generell veraltet (beschreibt einen längst erledigten Migrationsplan) — separat pflegenswert, unabhängig von dieser Änderung.
