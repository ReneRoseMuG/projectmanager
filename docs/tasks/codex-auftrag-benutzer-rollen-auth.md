# Codex-Auftrag: Benutzer, Rollen & Authentifizierung

## Vorbereitung — Feature-Branch anlegen

Bevor du mit der Implementierung beginnst, erzeuge einen Feature-Branch von `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/benutzer-rollen-auth
```

Alle Commits erfolgen auf diesem Branch. Kein direkter Push auf `main`.

---

## Ziel

Die App erhält einen Login-Screen mit Session-Handling, ein erweiterbares Rollen- und Rechtesystem sowie einen Admin-Bereich zur Benutzerverwaltung. Am Ende existiert ein einziger funktionierender Admin-Account, über den alle weiteren Benutzer angelegt werden können.

---

## Kontext

**Stack:**
- API: Fastify 4 + Drizzle ORM + better-sqlite3 (SQLite)
- Frontend: React 18 + React Router v6 + Vite
- Kein Auth-Framework bisher vorhanden

**Bestehendes Schema (users-Tabelle, `src/db/schema.ts`):**
```ts
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),          // bisher einziger Namens-Spalte
  email: text("email").notNull().unique(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});
```

Die `users`-Tabelle wird in vielen anderen Tabellen als `createdBy` / `updatedBy` referenziert. Das Schema darf nicht brechen.

Es existiert außerdem eine `app_settings`-Tabelle (`key` / `value`) — sie eignet sich, um den „erstmaligen Setup-Status" zu speichern.

---

## Aufgabe (schrittweise)

### Schritt 1 — Schema erweitern (Migration)

Erweitere die `users`-Tabelle um folgende Spalten via Drizzle-Migration:

| Spalte | Typ | Constraint |
|---|---|---|
| `first_name` | TEXT | NOT NULL DEFAULT '' |
| `last_name` | TEXT | NOT NULL DEFAULT '' |
| `full_name` | TEXT GENERATED | `last_name || ', ' || first_name` (STORED) |
| `address` | TEXT | nullable |
| `phone` | TEXT | nullable |
| `password_hash` | TEXT | nullable (null = Passwort noch nicht gesetzt) |
| `role_id` | INTEGER | FK → roles.id, NOT NULL (nach Seed) |
| `is_active` | INTEGER (boolean) | NOT NULL DEFAULT 1 |

Die bestehende `name`-Spalte bleibt zunächst erhalten (Abwärtskompatibilität), wird aber nicht mehr befüllt.

---

### Schritt 2 — Rollen-Tabelle + Rechte-System

Lege eine `roles`-Tabelle und eine `permissions`-Tabelle an:

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,       -- z.B. 'admin', 'editor', 'reader'
  label TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,  -- 1 = nicht löschbar
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,   -- z.B. 'users', 'projects', 'tickets'
  action TEXT NOT NULL,     -- z.B. 'read', 'write', 'delete', 'admin'
  UNIQUE(role_id, resource, action)
);
```

**Seed-Daten** (in einer eigenen Seed-Datei, die beim Start einmalig geprüft wird):

| key | label | is_system |
|---|---|---|
| admin | Administrator | 1 |
| editor | Editor | 1 |
| reader | Leser | 1 |

Initiale Berechtigungen für die drei Rollen:
- `admin`: alle Ressourcen, alle Aktionen (Wildcard möglich: `resource='*', action='*'`)
- `editor`: alle Ressourcen read + write, kein delete, kein admin
- `reader`: alle Ressourcen nur read

Das Rechtesystem ist bewusst offen gestaltet — neue Rollen können per Admin-UI angelegt und mit beliebigen feingranularen Rechten versehen werden.

---

### Schritt 3 — Default-Admin-Account (Seed)

Beim Anwendungsstart prüft die API, ob ein Eintrag `app_settings.key = 'admin_setup_done'` existiert.

Falls **nicht**:
1. Lege einen Admin-User an mit Werten aus der Umgebung (`.env`):
   - `first_name`: `process.env.ADMIN_FIRST_NAME` (Default: `'Admin'`)
   - `last_name`: `process.env.ADMIN_LAST_NAME` (Default: `'System'`)
   - `email`: `process.env.ADMIN_EMAIL` (Default: `'admin@local'`)
   - `password_hash`: Falls `ADMIN_INITIAL_PASSWORD` gesetzt → sofort mit bcrypt hashen und speichern; sonst NULL
   - `role_id`: ID der admin-Rolle
   - `is_active`: 1
2. Setze `app_settings.key = 'admin_setup_done'`:
   - `'true'` wenn `ADMIN_INITIAL_PASSWORD` gesetzt war (kein First-Login-Flow nötig)
   - `'false'` wenn kein Passwort gesetzt wurde (→ First-Login-Flow greift)

Falls `admin_setup_done = 'false'`: Login mit der konfigurierten Admin-E-Mail ist ohne Passwort möglich, leitet aber sofort zur „Passwort vergeben"-Seite weiter.

Nach dem ersten Passwortsatz: `admin_setup_done = 'true'`.

**Erforderliche ENV-Variablen** (in `.env.example` dokumentieren):
```
ADMIN_EMAIL=admin@local
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=System
ADMIN_INITIAL_PASSWORD=        # optional: wenn gesetzt, kein First-Login-Flow
SESSION_SECRET=change-me-in-production
```

---

### Schritt 4 — Session-Handling (API)

Verwende **signierte HTTP-only Cookies** (kein JWT im LocalStorage).

Implementierung:
1. Installiere `@fastify/cookie` und `@fastify/session` (oder `@fastify/jwt` mit Cookie-Transport — wähle das Einfachere für den vorhandenen Stack).
2. Session-Secret aus `process.env.SESSION_SECRET` (Fallback im Dev: hardcodierter Dev-String, Warnung im Log).
3. Session enthält: `userId`, `roleKey`, `email`.

**API-Endpunkte:**

| Method | Path | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | email + password → setzt Session-Cookie |
| POST | `/api/auth/logout` | löscht Session-Cookie |
| GET | `/api/auth/me` | gibt aktuellen User zurück (oder 401) |
| POST | `/api/auth/set-password` | nur für first-login: setzt Passwort ohne altes Passwort |

**Passwort-Hashing:** `bcrypt` mit Faktor 12 (`bcryptjs` als reine JS-Implementierung, kein native-Addon-Risiko).

**Auth-Guard:** Erstelle einen Fastify-Hook `preHandler: requireAuth`, der die Session prüft und bei fehlendem Login mit 401 antwortet. Alle bestehenden Routen bekommen diesen Hook — außer `/api/auth/*` und `/api/health`.

---

### Schritt 5 — Login-Screen (Frontend)

Erstelle `src/pages/LoginPage.tsx`:
- Felder: E-Mail, Passwort
- POST zu `/api/auth/login`
- Bei Erfolg: weiterleiten zu `/` (oder zur ursprünglich aufgerufenen Route)
- Bei Fehler: Fehlermeldung anzeigen

**Route Guard in `App.tsx`:**
- Rufe beim Start `/api/auth/me` ab.
- Solange kein eingeloggter User: rendere nur `<LoginPage />` (alle anderen Routen geblockt).
- Nach Login: normales Routing wie bisher.
- `<ForbiddenPage />` bleibt für Rechte-Fehler erhalten.

**First-Login-Flow:**
- Nach Login, wenn `app_settings.admin_setup_done = 'false'`: weiterleiten zu `/setup-password`.
- Erstelle `src/pages/SetupPasswordPage.tsx`: Formular mit neuem Passwort + Bestätigung.
- Nach Absenden: `POST /api/auth/set-password`, dann Weiterleitung zu `/`.

---

### Schritt 6 — Admin-Bereich (Benutzerverwaltung)

Erstelle `src/pages/admin/UsersPage.tsx` und `src/pages/admin/UserDetailPage.tsx`.

**Routen:**
```
/admin/users          → Benutzerliste
/admin/users/new      → Neuen Benutzer anlegen
/admin/users/:id      → Benutzer bearbeiten
```

**Benutzerliste:** Tabelle mit Vorname, Nachname, E-Mail, Rolle, Status (aktiv/inaktiv).

**Benutzerformular (Anlegen & Bearbeiten):**
- Vorname, Nachname (→ `full_name` wird serverseitig generiert)
- Adresse, Telefon, E-Mail
- Rolle (Dropdown aus `roles`-Tabelle)
- Passwort + Bestätigung (beim Anlegen Pflicht, beim Bearbeiten optional — leer lassen = nicht ändern)
- Aktiv/Inaktiv-Toggle

**API-Endpunkte (nur für Admin):**

| Method | Path | Beschreibung |
|---|---|---|
| GET | `/api/admin/users` | Liste aller Benutzer |
| GET | `/api/admin/users/:id` | Einzelner Benutzer |
| POST | `/api/admin/users` | Benutzer anlegen |
| PUT | `/api/admin/users/:id` | Benutzer bearbeiten (inkl. Passwort) |
| DELETE | `/api/admin/users/:id` | Benutzer löschen (nicht sich selbst) |
| GET | `/api/admin/roles` | Alle Rollen (für Dropdown) |

**Admin-Guard:** Alle `/api/admin/*`-Routen bekommen zusätzlich einen `requireRole('admin')`-Hook.

**Navigation:** Füge in der Sidebar einen Eintrag „Benutzerverwaltung" ein, der nur für Admins sichtbar ist.

---

## Regeln & Einschränkungen

1. Die bestehende `users`-Tabelle darf nicht gelöscht werden — nur erweitern.
2. Alle bestehenden `createdBy`/`updatedBy`-Referenzen bleiben unberührt.
3. Ein Admin darf sich selbst nicht löschen.
4. Passwörter werden **niemals** im Klartext gespeichert — immer bcrypt.
5. Die `full_name`-Spalte ist eine GENERATED COLUMN (SQLite STORED) — sie darf nicht manuell befüllt werden.
6. Das Rechte-System muss für neue Rollen offen sein — kein Hardcoding von Rollennamen in der Business-Logik außer im Auth-Guard für den Admin-Bereich.
7. Inaktive Benutzer (`is_active = 0`) können sich nicht einloggen.
8. Session-Secret darf nicht in den Code committed werden — nur über ENV.

---

## Randfälle & Fehlerpfade

- **Login mit falschem Passwort:** 401, generische Fehlermeldung (kein Hinweis, ob User existiert).
- **Login mit inaktivem Account:** 403 mit Hinweis „Account deaktiviert".
- **First-Login-Umgehung:** Alle Routen außer `/setup-password` und `/api/auth/*` bleiben gesperrt, solange `admin_setup_done = 'false'`.
- **Passwort-Änderung im Admin:** Leeres Passwortfeld = keine Änderung. Wenn befüllt, Validierung: min. 8 Zeichen.
- **Letzter Admin:** Beim Löschen oder Deaktivieren prüfen, ob mindestens ein weiterer aktiver Admin existiert. Falls nicht: Aktion verweigern mit sprechender Fehlermeldung.
- **Session abgelaufen:** Frontend erkennt 401 auf `/api/auth/me` und leitet zu `/login` weiter.
- **Seed-Idempotenz:** Der Seed läuft bei jedem Start — er darf keine Duplikate erzeugen (`INSERT OR IGNORE`).

---

## Seiteneffekte

- **Alle bestehenden API-Routen** erhalten den `requireAuth`-Hook. Das ist eine breite Änderung — sorgfältig testen, dass kein Endpunkt versehentlich offen bleibt.
- **`createdBy` / `updatedBy`** in allen Tabellen: Die Werte können künftig aus der Session befüllt werden. Das ist optional für diesen Auftrag — Codex soll aber die Stellen kommentieren (`// TODO: set from session`).
- **`App.tsx`** wird um den Auth-Guard erweitert — bestehende Routen bleiben erhalten, werden nur hinter den Guard gelegt.
- **Sidebar** erhält einen bedingten Navigationspunkt für den Admin-Bereich.

---

## Testhinweise

Nach der Implementierung sollten folgende Szenarien manuell durchgespielt werden:

1. **Erststart:** App starten, `admin@local` ohne Passwort einloggen → Weiterleitung zu `/setup-password` → Passwort setzen → Login funktioniert.
2. **Normaler Login:** Mit gesetztem Passwort einloggen → Startseite erscheint.
3. **Falsches Passwort:** Login schlägt mit Fehlermeldung fehl, kein Stack-Trace im Frontend.
4. **Admin-Bereich:** Neuen Benutzer mit Rolle „Editor" anlegen → mit diesem User einloggen → Admin-Bereich ist nicht sichtbar.
5. **Inaktiver User:** User deaktivieren → Login schlägt mit 403 fehl.
6. **Logout:** Session wird gelöscht, nächster Request landet auf Login-Screen.
7. **Direktaufruf einer Route ohne Session:** Browser-Tab mit `/projects` öffnen → Redirect zu `/login`, nach Login zurück zu `/projects`.

---

## Codebase-Zusammenfassung (Ist-Zustand)

**API (`apps/api/src/`):**
- `app.ts` — Fastify-Instanz, Plugin-Registrierung
- `db/schema.ts` — Drizzle-Schema (SQLite), enthält `users`, `appSettings` und alle Domain-Tabellen
- `routes/` — eine Datei pro Domain (projects.ts, tasks.ts, tickets.ts etc.)
- `repositories/` — Datenbankzugriff pro Domain
- `services/` — Business-Logik
- `plugins/` — Fastify-Plugins

**Frontend (`apps/web/src/`):**
- `App.tsx` — React-Router-Konfiguration, alle Routen definiert, kein Auth-Guard vorhanden
- `pages/` — Eine Datei pro Seite (ProjectsPage, TicketsPage etc.)
- `pages/ForbiddenPage.tsx` — existiert bereits
- `components/layout/Sidebar.tsx` — Navigation

**Noch nicht vorhanden (zu erstellen):**
- `LoginPage.tsx`
- `SetupPasswordPage.tsx`
- `pages/admin/UsersPage.tsx`
- `pages/admin/UserDetailPage.tsx`
- `routes/auth.ts` (API)
- `routes/admin/users.ts` (API)
- Auth-Hook / Middleware
- Session-Plugin
- `db/migrations/XXXX_users_auth_roles.sql`
- `db/seed.ts`
