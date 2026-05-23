# Codex-Auftrag: Echtzeit-Synchronisation via Event Bus + SSE

## Ziel

Implementiere einen applikationsinternen Event Bus in der Fastify API sowie einen SSE-Endpunkt, über den das React-Frontend Datenänderungen in Echtzeit empfängt. Alle geöffneten Browser-Tabs sollen sich automatisch aktualisieren, sobald ein Schreibvorgang in der API stattfindet — unabhängig davon, ob die Änderung durch einen Nutzer in einem anderen Tab oder durch einen externen API-Aufrufer ausgelöst wurde.

---

## Kontext

Das Frontend verwendet React Query (`@tanstack/react-query`). Die Invalidierungslogik ist bereits vollständig ausgearbeitet und in `apps/web/src/queries/invalidation.ts` nach Domänen strukturiert (z. B. `invalidateTaskScope`, `invalidateMilestoneScope`, `invalidateComments` usw.). Diese Funktionen werden bisher ausschließlich als `onSuccess`-Callbacks in Mutations aufgerufen — also nur dann, wenn der schreibende Tab selbst die Mutation ausgelöst hat.

Das Problem: Andere Tabs oder externe Aufrufer (z. B. API-Direktzugriffe) lösen keine Invalidierung aus. Der Cache in fremden Tabs veraltet stillschweigend.

Die Datenbank ist **SQLite** (via `better-sqlite3`). Ein datenbanknativer Push-Mechanismus (wie PostgreSQL LISTEN/NOTIFY) steht nicht zur Verfügung.

---

## Aufgabe

### 1. Analysiere die bestehende Architektur

Verschaffe dir vor der Implementierung ein vollständiges Bild:

- Wie sind Services und Repositories strukturiert? Wo finden Schreibvorgänge statt?
- Wie ist `buildApp` in `app.ts` aufgebaut, und wie werden Plugins und Dekoratoren registriert?
- Welche Domänen-Scopes existieren in `invalidation.ts`, und welche `queryKeys` sind ihnen zugeordnet?
- Gibt es bereits einen Mechanismus für applikationsinterne Kommunikation (EventEmitter, Plugin, Singleton)?
- Prüfe, ob `@fastify/websocket` oder ein ähnliches Plugin bereits als Abhängigkeit vorhanden ist.

### 2. Entwirf den Event Bus

Wähle eine Implementierungsform, die zur bestehenden Fastify-Architektur passt. Berücksichtige dabei:

- Der Event Bus muss zwischen Service-Layer und SSE-Endpunkt erreichbar sein.
- Er soll typisierte Events tragen, die Domäne und ggf. betroffene IDs transportieren.
- Er darf den Testaufbau nicht erschweren — prüfe, wie andere Singletons oder Seiteneffekte in Tests behandelt werden.

### 3. Instrumentiere Schreibvorgänge

Identifiziere, auf welcher Ebene (Service oder Repository) Events am sinnvollsten ausgelöst werden. Instrumentiere die relevanten Schreiboperationen so, dass ein Event gefeuert wird, nachdem ein Datenbankschreibvorgang erfolgreich abgeschlossen wurde.

Beginne mit einem repräsentativen Subset von Domänen (z. B. Tasks, Milestones, Comments), um das Muster zu etablieren. Die vollständige Abdeckung aller Domänen kann iterativ erfolgen.

### 4. Implementiere den SSE-Endpunkt

Erstelle eine neue Route `/api/events/stream` (oder einen passenden Pfad gemäß bestehender Konvention), die eine SSE-Verbindung hält und eingehende Bus-Events an alle verbundenen Clients weiterleitet.

Beachte dabei:
- Authentifizierung: Der Endpunkt muss dem globalen Auth-Guard unterliegen.
- Verbindungsmanagement: Clients, die die Verbindung trennen, müssen sauber aus der Subscriber-Liste entfernt werden.
- Kompatibilität mit dem Fastify-Request-Lifecycle (kein vorzeitiges Schließen der Antwort).

### 5. Implementiere den Frontend-Hook

Erstelle einen React-Hook (z. B. `useRealtimeSync`), der:

- eine SSE-Verbindung zu `/api/events/stream` aufbaut,
- eingehende Events auf die passenden `invalidate*`-Funktionen aus `invalidation.ts` abbildet,
- die Verbindung bei Komponentenunmount sauber schließt,
- Reconnect-Verhalten bei Verbindungsunterbrechung behandelt — beim Reconnect ist eine pauschale Cache-Invalidierung auszulösen, da während des Verbindungsabrisses Events verloren gegangen sein können.

Binde den Hook an einer geeigneten Stelle im App-Layout ein, sodass er für die gesamte Laufzeit der Anwendung aktiv ist.

### 6. Entferne obsolete Refresh-Buttons

Suche in den Standalone-Routes nach manuellen Refresh-Buttons, die ausschließlich dazu dienen, veraltete Daten neu zu laden. Mit dem SSE-Mechanismus sind diese redundant. Entferne sie nach erfolgreicher Verifikation der Echtzeit-Synchronisation.

---

## Rahmenbedingungen

- **Kein Polling im Frontend.** Der Mechanismus muss push-basiert sein.
- **Keine neuen Laufzeitabhängigkeiten** einführen, sofern der EventEmitter aus der Node.js-Standardbibliothek ausreicht.
- **Typsicherheit** über die Event-Definitionen hinweg sicherstellen (API → Frontend).
- **Tests:** Bestehende Tests dürfen nicht brechen. Falls der Event Bus Seiteneffekte in Tests erzeugt, muss er injectable oder mockbar sein.
- Die bestehende Invalidierungslogik in `invalidation.ts` bleibt unverändert — der Hook nutzt sie, schreibt sie nicht um.

---

## Erwartetes Ergebnis

Nach Abschluss der Implementierung gelten folgende Abnahmekriterien:

- Ein Schreibvorgang in Tab A führt dazu, dass Tab B seinen Cache automatisch invalidiert und die betroffenen Daten neu lädt — ohne manuellen Reload.
- Ein Schreibvorgang durch einen externen API-Aufruf ist in allen geöffneten Tabs innerhalb weniger Sekunden sichtbar.
- Nach einem Verbindungsabriss und Reconnect zeigen alle Tabs den aktuellen Datenstand.
- Manuelle Refresh-Buttons in Standalone-Routes sind entfernt. Ihr Fehlen fällt nicht auf, weil die Daten sich von selbst aktualisieren.
