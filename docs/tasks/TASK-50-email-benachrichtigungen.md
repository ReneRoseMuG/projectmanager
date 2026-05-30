# TASK-50 — E-Mail Benachrichtigungen für Termine

**Projekt:** Projekt Manager (PROJ-3)
**Meilenstein:** Benachrichtigungen für anstehende Termine (MS-14)
**Priorität:** Mittel
**Status:** Offen

---

## Ziel

Automatische E-Mail-Benachrichtigungen implementieren, die Nutzer vorab über anstehende Termine informieren. Der Vorlaufzeitraum soll am Event konfigurierbar sein (z. B. 15 Min., 1 Std., 1 Tag).

---

## Kontext

- API: Fastify, TypeScript, SQLite via Drizzle ORM
- Events sind in `apps/api/src/db/schema.ts` (Tabelle `events`) mit `startTime`/`endTime` definiert
- User-E-Mail-Adressen sind im System vorhanden (Tabelle `users`)
- Config-Datei: `apps/api/src/config.ts` — dort neue SMTP-Felder ergänzen
- Kein bestehendes Notification-System vorhanden

---

## Aufgaben für Codex

### 1. Schema erweitern (`apps/api/src/db/schema.ts`)

Neues Feld am `events`-Table:
```ts
reminderMinutes: integer('reminder_minutes').default(60)
```

Neue Tabelle `sentNotifications` zur Duplikat-Vermeidung:
```ts
export const sentNotifications = sqliteTable('sent_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'email'
  sentAt: text('sent_at').notNull(),
});
```

### 2. Config erweitern (`apps/api/src/config.ts`)

Neue Felder in `AppConfig`:
```ts
smtpEnabled: boolean;
smtpHost: string;
smtpPort: number;
smtpUser: string;
smtpPassword: string;
smtpFrom: string;
notificationsEnabled: boolean;
```

Aus `.env` lesen (analog zu `backupSftp*`-Feldern).

### 3. Notification-Service anlegen (`apps/api/src/services/notification.service.ts`)

```ts
// Prüft alle Events deren startTime in den nächsten reminderMinutes liegt
// und für die noch kein sentNotification-Eintrag existiert.
// Versendet E-Mail via nodemailer und legt sentNotification-Eintrag an.
export async function sendPendingEmailNotifications(db: DbClient, config: AppConfig): Promise<void>
```

Paket installieren: `nodemailer` + `@types/nodemailer`

### 4. Scheduler registrieren (`apps/api/src/index.ts` oder eigene Datei)

```ts
import cron from 'node-cron';
// Jede Minute prüfen
cron.schedule('* * * * *', () => {
  if (config.notificationsEnabled && config.smtpEnabled) {
    sendPendingEmailNotifications(db, config).catch(logger.error);
  }
});
```

Paket installieren: `node-cron` + `@types/node-cron`

### 5. Migration anlegen (`apps/api/src/db/migrate.ts`)

Neue Migration für `sent_notifications`-Tabelle und `reminder_minutes`-Spalte an `events`.

### 6. Shared Types erweitern (`packages/shared-types/`)

`Event`-Typ um `reminderMinutes: number` ergänzen.
`EventInput` und `EventUpdate` ebenfalls.

### 7. Events-Service anpassen (`apps/api/src/services/events.service.ts`)

`reminderMinutes` bei `createEvent` und `updateEvent` persistieren.

---

## Akzeptanzkriterien

- [ ] E-Mail wird genau einmal pro konfiguriertem Vorlauf versendet (kein Duplikat-Versand bei mehrfachen Scheduler-Läufen)
- [ ] SMTP-Fehler werden via `logger.error` geloggt und blockieren nicht den API-Prozess
- [ ] Bei `notificationsEnabled=false` oder `smtpEnabled=false` läuft kein Versand
- [ ] Unit-Test für `sendPendingEmailNotifications` mit gemocktem nodemailer
- [ ] Integration-Test prüft, dass nach Versand ein `sentNotifications`-Eintrag existiert

---

## Hinweise

- `sentNotifications` immer mit `onDelete: 'cascade'` auf `events` und `users` setzen
- SMTP-Passwort nie loggen
- Scheduler-Intervall als Env-Variable konfigurierbar machen (`NOTIFICATION_CRON`, default `* * * * *`)
