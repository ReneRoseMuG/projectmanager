# TASK-51 — Browser Push Benachrichtigungen für Termine

**Projekt:** Projekt Manager (PROJ-3)
**Meilenstein:** Benachrichtigungen für anstehende Termine (MS-14)
**Priorität:** Mittel
**Status:** Offen

---

## Ziel

Native Browser Push Notifications (Web Push API) für anstehende Termine implementieren — ohne externe Dienste, ohne Kosten. Der Nutzer erlaubt die Benachrichtigung einmalig im Browser und erhält danach Desktop-Hinweise auch wenn der Tab im Hintergrund ist.

---

## Kontext

- API: Fastify, TypeScript, SQLite via Drizzle ORM
- Frontend: React/Vite unter `apps/web/`
- Events mit `startTime` und `reminderMinutes` (wird in TASK-50 ergänzt — dieses Feature setzt TASK-50 voraus oder implementiert `reminderMinutes` parallel)
- Kein bestehendes Notification-System vorhanden
- VAPID-Keys müssen einmalig generiert und in Config/`.env` gespeichert werden

---

## Aufgaben für Codex

### 1. VAPID-Keys generieren

Einmalig per Script (`scripts/generate-vapid-keys.ts`):
```ts
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=', keys.publicKey);
console.log('VAPID_PRIVATE_KEY=', keys.privateKey);
```

Ausgabe in `.env` eintragen. Paket installieren: `web-push` + `@types/web-push`

### 2. Schema erweitern (`apps/api/src/db/schema.ts`)

Neue Tabelle `pushSubscriptions`:
```ts
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: text('created_at').notNull(),
});
```

### 3. Config erweitern (`apps/api/src/config.ts`)

Neue Felder in `AppConfig`:
```ts
vapidPublicKey: string;
vapidPrivateKey: string;
vapidSubject: string; // z. B. 'mailto:admin@local'
webPushEnabled: boolean;
```

### 4. API-Endpunkte anlegen (`apps/api/src/routes/push.ts`)

```
POST   /api/push/subscribe    — Subscription speichern (Body: { endpoint, keys: { p256dh, auth } })
DELETE /api/push/subscribe    — Subscription anhand endpoint löschen
GET    /api/push/vapid-key    — Öffentlichen VAPID-Key an Frontend ausliefern
```

Route in `apps/api/src/app.ts` registrieren.

### 5. Push-Service anlegen (`apps/api/src/services/push-notification.service.ts`)

```ts
// Analog zu notification.service.ts (TASK-50):
// Prüft Events mit bevorstehendem startTime, sucht alle pushSubscriptions der zugeordneten Nutzer,
// versendet Web-Push-Nachricht und legt sentNotification-Eintrag an (channel: 'push').
export async function sendPendingPushNotifications(db: DbClient, config: AppConfig): Promise<void>
```

Payload-Format:
```json
{
  "title": "Termin in 60 Minuten",
  "body": "<Event-Titel>",
  "url": "/events/<id>"
}
```

### 6. Scheduler erweitern (`apps/api/src/index.ts`)

Den bestehenden Cron-Job (TASK-50) um Push-Versand ergänzen:
```ts
cron.schedule(config.notificationCron, () => {
  sendPendingPushNotifications(db, config).catch(logger.error);
});
```

### 7. Service Worker (`apps/web/public/sw.js`)

```js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### 8. Frontend-Integration (`apps/web/src/`)

Neuer Hook `usePushNotifications.ts`:
1. VAPID Public Key via `GET /api/push/vapid-key` laden
2. `navigator.serviceWorker.register('/sw.js')`
3. `Notification.requestPermission()` einholen
4. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` aufrufen
5. Subscription via `POST /api/push/subscribe` ans Backend senden

UI-Komponente (z. B. in Einstellungen): Toggle „Desktop-Benachrichtigungen aktivieren"

---

## Akzeptanzkriterien

- [ ] Push-Benachrichtigung erscheint als Desktop-Notification auch wenn der App-Tab im Hintergrund ist
- [ ] Klick auf die Notification öffnet den betreffenden Termin in der App
- [ ] Abmelden (Subscription löschen) funktioniert sauber — kein weiterer Versand
- [ ] Abgelaufene/ungültige Subscriptions (HTTP 410 von Browser) werden automatisch aus DB gelöscht
- [ ] Unit-Test für `sendPendingPushNotifications` mit gemocktem `web-push`
- [ ] `webPushEnabled=false` deaktiviert den gesamten Push-Pfad

---

## Abhängigkeiten

- TASK-50 (E-Mail Benachrichtigungen): `reminderMinutes`-Feld und `sentNotifications`-Tabelle werden geteilt
- Service Worker liegt unter `apps/web/public/` und wird von Vite unverändert ausgeliefert (kein Build-Step nötig)

---

## Hinweise

- VAPID Private Key nie loggen und nicht im Frontend ausliefern
- `p256dh` und `auth` aus der Subscription sind nutzerspezifische Geheimnisse — nur serverseitig verwenden
- Bei Push-Versand Fehler `410 Gone` abfangen → Subscription aus DB löschen
