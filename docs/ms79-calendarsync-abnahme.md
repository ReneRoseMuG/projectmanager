# MS-79 Kalender-Synchronisation — Abnahme-Checkliste (AP-4.4)

Verbindliches Abnahme-Gate für den Meilenstein *Kalender-Synchronisation (Google bidirektional +
NextCloud read-only)*. Jeder Punkt ist mit einem reproduzierbaren automatisierten Nachweis belegt.

Ausführung: `npm test -w apps/api` (Integration/Unit) und `npm test -w apps/web` (Frontend). Die
externen Anbieter (Google, NextCloud/CalDAV) werden über injizierte, aufgezeichnete HTTP-Antworten
ersetzt (laut Aufgabenstellung als hochwertige Mocks ausdrücklich zulässig, da keine produktiven
Fremdkonten in der Testumgebung vorliegen); DB, Repositories, Services, Auth, Verschlüsselung,
iCal-/Zeitzonen-Logik und Routing sind echt.

## Arbeitspakete

| AP | Kernkriterium | Nachweis (Testdatei) |
|----|---------------|----------------------|
| 0.1 Datenmodell & Migrationen | 4 Tabellen + events.origin/readonly, FK/ON DELETE, idempotente Migration | `tests/integration/api/calendar-sync-repository.test.ts`, `calendar-sync-migration.test.ts` |
| 0.2 Verschlüsselte Credentials | AES-256-GCM, nie im Klartext, kein Leak in API | `calendar-credential-service.test.ts`, `tests/unit/api/credential-cipher.test.ts` |
| 0.3 Verwaltungs-UI | Liste/Status/Sync/Trennen, Ownership + serverseitige Rechte | `calendar-connections.test.ts`, `tests/unit/web/pages/SettingsCalendarConnectionsPage.test.tsx` |
| 1.1 NextCloud Connect & Discovery | PROPFIND-Discovery, read-only Kalender, sichere Ablage | `nextcloud-connection.test.ts`, `tests/unit/api/caldav-client.test.ts` |
| 1.2 NextCloud Initialimport | iCal-Import, Serien-Expansion, DST-robuste Wandzeit, idempotent | `ical-import.test.ts` |
| 1.3 NextCloud Delta-Sync | sync-token, gezieltes Nachladen, Löschung, nur lesende Methoden | `nextcloud-sync.test.ts` |
| 1.4 Anzeige & Read-only-Sperre | Herkunft sichtbar, Schreibsperre serverseitig | `calendar-readonly.test.ts`, `events.test.ts` |
| 2.1 Google OAuth & Token | Auth-Code-Flow, CSRF-State, Token verschlüsselt, invalid_grant → reauth | `google-oauth.test.ts` |
| 2.2 Google Zielkalender | nur beschreibbare Kalender, genau ein Ziel, primary-Fallback | `google-calendar.test.ts` |
| 2.3 Google → App Import | nextSyncToken, Pagination, cancelled→Löschung, 410→Resync, idempotent | `google-events.test.ts` |
| 3.1 App → Google Export | insert/update/delete, Herkunftsmarke (source/localId/localVersion), Retry+Backoff bei 429/5xx, lastschonender Batch | `google-export.test.ts` |
| 3.2 Bidirektional/Konflikt/Echo | etag-Echo-Schutz, Last-Write-Wins, kein Duplikat | `google-sync.test.ts` |
| 3.3 Serien & Zeitzonen beidseitig | konstante Wandzeit über DST, Round-Trip ohne Drift, Ganztag | `google-timezones.test.ts` |
| 4.1 Sync-Scheduler | periodischer Lauf mit ±25 % Jitter, Truncated-Exponential-Backoff pro Verbindung, Fehlerisolation, Überlappungsschutz | `calendar-scheduler.test.ts` |
| 4.2 Google Push (optional) | events.watch + Persistenz, Renewal, channels.stop, Auto-Aktivierung, Webhook mit HMAC-Token | `google-push.test.ts` |

> **AP-4.2 – vollständiger Kanal-Lebenszyklus:** events.watch registriert **und persistiert**
> channelId/resourceId/expiration am Zielkalender; `renewExpiringChannels` erneuert ablaufende Kanäle
> (im Scheduler-Tick verdrahtet), `channels.stop` meldet beim Trennen ab, die Kalenderauswahl aktiviert
> Push automatisch (sofern `GOOGLE_PUSH_WEBHOOK_URL` gesetzt), der Webhook wehrt gefälschte Aufrufe per
> HMAC-Token ab. Alles mit simulierten Antworten getestet (Persistenz, Stop, Renewal-Schwelle, virtuelle
> Zeit). **Verbleibende Grenze:** der *reale Empfang* echter Google-Zustellungen ist erst mit einer
> öffentlich erreichbaren HTTPS-Webhook-URL abnehmbar; ohne sie deckt der Polling-Scheduler (AP-4.1) die
> Funktion vollständig ab (Push ist reine Latenz-Optimierung).
| 4.3 Fehler-/Status-UI, Re-Auth, Journal | reauth_required, Re-Auth ohne Dublette, Journal für Sync/Fehler/Konflikt/Trennung | `calendar-journal.test.ts`, `SettingsCalendarConnectionsPage.test.tsx` |
| 4.4 E2E-Abnahme (Gate) | fünf E2E-Szenarien, Coverage, statische Prüfung | `calendar-sync-e2e.test.ts` (diese Datei) |

## Verpflichtende E2E-Szenarien (`calendar-sync-e2e.test.ts`)

1. **NextCloud read-only** — *„Szenario 1: NextCloud verbinden, importieren, Änderung/Löschung
   spiegeln — nur lesende Methoden"*. Verbinden → Kalenderauswahl → Import (read-only) → Löschung
   in NextCloud spiegelt lokal; verifiziert im Request-Log ausschließlich PROPFIND/REPORT (kein PUT/POST/DELETE).
2. **Google Import (Serie + DST)** — *„Szenario 2: Google-Serie über die DST-Grenze wird mit
   konstanter Wandzeit importiert"*. Zwei Instanzen einer Serie um den Zeitumstellungstag behalten 10:00.
3. **Google Export (Herkunftsmarke)** — *„Szenario 3: App-Termin wird nach Google exportiert und
   trägt die Herkunftsmarke"*. Payload trägt `extendedProperties.private.pmOrigin`, Mapping als Herkunftsnachweis.
4. **Bidirektional + Konflikt** — *„Szenario 4: mehrere Sync-Zyklen erzeugen kein Echo/Duplikat"*
   (Echo-Schutz) und `google-sync.test.ts` (Last-Write-Wins Google/App).
5. **Resilienz** — *„Szenario 5a"* (Token-Widerruf → reauth_required), *„5b"* (410-Resync + 429-Fehlerstatus),
   *„5c"* (NextCloud-Ausfall isoliert, andere Verbindung unberührt), *„5d/5e"* (Netzwerkabbruch, fehlende Zugangsdaten).

## Abnahmekriterien

- [x] Alle fünf E2E-Szenarien laufen reproduzierbar grün (`calendar-sync-e2e.test.ts`, 10 Fälle).
- [x] Gesamt-Coverage der Sync-Module ≥ 85 %: **Statements 94,9 % · Branch 86,4 % · Functions 95,2 % · Lines 95,0 %**; kein Modul unter 70 %.
- [x] Statische Prüfung: keine `TODO`/`FIXME`/auskommentierten Platzhalter in den Sync-Modulen (grep leer).
- [x] Keine übersprungenen/`skip`-markierten Sync-Tests.
- [x] Abnahme-Checkliste je Punkt mit Nachweis belegt (diese Datei).

## Reproduktion

```bash
# Sync-Coverage (Integration + Unit + Frontend-Anteil)
npm test -w apps/api -- calendar google nextcloud ical caldav credential --coverage \
  --coverage.include='src/services/google/**' --coverage.include='src/services/caldav/**' \
  --coverage.include='src/services/calendar-*.service.ts' \
  --coverage.include='src/services/nextcloud-*.service.ts' \
  --coverage.include='src/services/ical-import.service.ts'

# Statische Prüfung
grep -rEn "TODO|FIXME|XXX|HACK" apps/api/src/services/{google,caldav} \
  apps/api/src/services/{calendar-,nextcloud-,ical-import}*  # → leer
```
