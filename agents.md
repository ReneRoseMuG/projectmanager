# agents.md – Projekt Manager

Der Agent ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht der Agent die Umsetzung kontrolliert ab und dokumentiert den Blocker.

Diese Datei `agents.md` ist die maßgebliche Arbeitsanweisung im Repository. Verweise auf `AGENTS.md` sind als Verweis auf diese Datei zu verstehen.

---

## 0. Auftragsklassifikation (Pflicht vor jedem weiteren Schritt)

Vor jeder weiteren Aktion klassifiziert der Agent den Auftrag in genau eine der folgenden Klassen:

1. **Reine Frage oder Leseauftrag**
2. **Reiner Analyse-, Audit- oder Test-Report**
3. **Git-Operation ohne Codeänderung**
4. **Kleiner lokaler Fix in bestehender Struktur**
5. **Mehrschichtige Änderung oder neues Feature**

Von dieser Klassifikation hängen Branch-Nutzung, Dokumentenlektüre, Analyseumfang und Planungstiefe ab.

### Folgen der Klassifikation

| Klasse | Branch-Nutzung | Dokumentenlektüre | Analyseumfang | Planung |
|---|---|---|---|---|
| 1. Reine Frage oder Leseauftrag | Nein | Nur wenn fachlich nötig | Minimal | Keine |
| 2. Analyse-, Audit- oder Test-Report | Nein | Nur relevante Abschnitte | Nur für Report nötige Bereiche | Nur kurzer Analyseplan |
| 3. Git-Operation ohne Codeänderung | Nein | Nein | Nur Git-Zustand prüfen | Keine |
| 4. Kleiner lokaler Fix | Nur bei explizitem Wunsch | Minimal und gezielt | Start klein und dateinah | Kleiner Plan |
| 5. Mehrschichtige Änderung oder neues Feature | Nur bei explizitem Wunsch | Gestuft und gezielt | Breiter, aber begründet | Voller Plan |

Der Agent dokumentiert zu Beginn kurz:
- welche Klasse gewählt wurde,
- warum diese Klasse passt,
- welche Startschritte daraus folgen.

---

## 1. Dokumentenstrategie — Kontext sparsam nutzen

Statt großer Dateien vollständig zu laden, gilt immer diese Eskalationsreihenfolge:

1. `agents.md` (diese Datei) ist immer bekannt
2. Nur die Abschnitte aus `docs/` laden, die der Auftrag direkt benötigt
3. Weitere Abschnitte nur dann laden, wenn die erste gezielte Lektüre nicht ausreicht
4. Vollständige Lektüre großer Dokumente nur bei ausdrücklicher Architekturarbeit

Bei UI-bezogenen Aktionen ist `docs/design-leitfaden.md` als verbindliche Design-Vorgabe gezielt zu berücksichtigen. Der Agent lädt auch hier nur die für den konkreten Auftrag relevanten Abschnitte.

**Schnellcheck vor jedem Task:**

| Situation | Dokument nötig? |
|---|---|
| Reine Frage, kein Code | Nein |
| Git-Operation ohne Codeänderung | Nein |
| Isolierter Fix in einer Datei | Nur direkt betroffene Abschnitte |
| Neuer Endpunkt / Schichtenänderung | Relevante API- und Schema-Abschnitte gezielt |
| Neues Feature über mehrere Schichten | `agents.md` + relevante `docs/`-Abschnitte gezielt |
| Unklare Zuordnung | Gezielt erweitern — nicht raten |

Der Agent dokumentiert kurz, welche Abschnitte gelesen wurden und warum diese Auswahl genügt.

---

## 2. Analyse vor der Umsetzung (Pflicht, aber klein starten)

Bevor Änderungen vorgenommen werden, startet der Agent die Analyse **immer klein und auftragsnah**.

Zuerst werden nur untersucht:
- direkt betroffene Dateien,
- naheliegende Einstiegspunkte,
- bestehende Muster im betroffenen Bereich,
- direkt benachbarte Funktionen, Komponenten, Routes oder Services.

Ziele der Analyse:
- Bestehende Strukturen und Muster auffinden
- Passende Einstiegspunkte identifizieren
- Redundante Implementierungen vermeiden
- Prüfen, ob vorhandene Strukturen nutzbar sind, bevor neue angelegt werden

Eine breitere Analyse ist nur zulässig, wenn die enge Analyse nachweislich nicht ausreicht. Dieser Grund muss kurz dokumentiert werden.

Neue Dateien, Routes, Services oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind.

---

## 3. Planung

### 3.0 Planungs-Skill (Pflicht)

Vor jeder Planerstellung im Chat oder im Plan-Modus nutzt der Agent den Repo-Skill `skills/projekt-manager-planungsleitplanken`.

Der Skill ist ein Planungs-Gate und ersetzt diese Datei nicht. `agents.md` bleibt die maßgebliche Quelle; bei Widersprüchen gilt `agents.md`. Der Skill stellt sicher, dass Architekturentscheidungen, Rollen-/Permission-Regeln, Teststrategie, Branch-Hygiene, UI-Leitplanken und Abnahmekriterien bei jeder Planung geprüft werden.

### 3.0.1 Testentwurfs-Skill (Pflicht bei Tests)

Sobald ein Auftrag Tests plant, ergänzt, ändert, bewertet oder ausführt, nutzt der Agent zusätzlich den Repo-Skill `skills/projekt-manager-test-entwurfsleitplanken`.

Das gilt insbesondere bei Begriffen wie „Testsuite“, „Testabdeckung“, „echte Daten“, „Integrationstest“, „E2E“, „Abnahme“, „Testfälle“ oder „Testlauf“.

Der Agent dokumentiert zu Beginn kurz:
- dass der Testentwurfs-Skill angewendet wird,
- welche Testebene betroffen ist,
- welches beobachtbare Verhalten bewiesen werden soll,
- welche echten Daten und welche Isolation verwendet werden.

### 3.1 Branch-Nutzung (nur bei explizitem Nutzerwunsch)

Der Agent fragt nicht aktiv nach einem Branch. Ein Branch wird nur angelegt, wenn der Nutzer dies ausdrücklich verlangt oder das Kurzkommando `branch <name>` verwendet.

Delegiert der Nutzer die Namenswahl an den Agenten, wählt der Agent selbst einen kurzen, auftragsbezogenen Namen. Git-Aktionen werden ausschließlich **seriell** ausgeführt.

### 3.2 Planformat

Pläne werden als klarer, lesbarer Fließtext im Chat präsentiert. Kein Code, keine Diffs, keine Codeblöcke, keine Datei.

**Für Auftragsklasse 4 (kleiner lokaler Fix)** genügt ein kompakter Plan mit drei Abschnitten:

**Was ich plane** — kurze Beschreibung des Eingriffs und Ansatzes.

**Betroffene Funktionen, Komponenten und Dateien** — kurze Einordnung und Begründung.

**Erwartetes Ergebnis** — beobachtbares Ergebnis aus Nutzersicht sowie kurz benannte Risiken.

**Für Auftragsklasse 5 (mehrschichtige Änderung oder neues Feature)** enthält jeder Plan diese fünf Abschnitte:

**Was ich plane** — geplanter Lösungsweg in zusammenhängenden Sätzen, inkl. Begründung und bewusst nicht gewählter Alternativen.

**Betroffene Funktionen, Komponenten und Dateien** — zu jeder Stelle: aktuelle Rolle im System, konkrete geplante Änderung und warum genau dort.

**Auswirkungen der Änderung** — welche Abläufe sich ändern, welche unberührt bleiben, welche angrenzenden Teile mittelbar betroffen sein könnten.

**Risiken und Schadenspotential** — Schadenspotential niedrig/mittel/hoch mit Begründung; was im ungünstigen Fall kaputtgehen könnte; wie das Risiko begrenzt wird.

**Erwartetes Ergebnis** — beobachtbares Ergebnis aus Nutzersicht; woran man erkennt, dass die Änderung gelungen ist.

### 3.3 Planinhalt

Der Plan muss ausreichend Kontext enthalten, damit der Nutzer die Tragweite der Änderung beurteilen kann. Für Auftragsklasse 5 muss der Plan immer erkennbar machen:

- welche Stellen geändert werden,
- was dort konkret geschieht und warum,
- welche unmittelbaren und mittelbaren Auswirkungen zu erwarten sind,
- welche Bereiche bewusst unverändert bleiben sollen,
- wie hoch das Schadenspotential ist.

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Weitet sich der Eingriff während der Analyse aus, muss der Agent die Ausweitung vorab benennen.

### 3.4 Kurzkommandos

| Kommando | Wirkung |
|---|---|
| `branch <name>` | Branch von `main` anlegen, Remote-Tracking einrichten, sofort pushen |
| `plan` | Auftrag klassifizieren → Analyse → Plan ausgeben, ohne Branch-Rückfrage |
| `audit` | Vollen Audit gemäß Abschnitt 12 als reinen Report-Auftrag ausführen |
| `test` / `Test` | Vollständigen Testlauf gemäß Abschnitt 12 seriell ausführen, inklusive Browser-/E2E-Tests; anschließend Testanzahlen und Fehlergruppierung berichten |
| `log <kurztitel>` | Schritt-Log manuell auslösen (ergänzt automatisches Log) |
| `save` | Alle offenen Änderungen stagen, eine sinnvolle Commit-Message wählen, alles committen und auf den aktuellen Branch pushen |
| `savetowork` | Alle offenen Änderungen auf dem aktuellen Branch sichern, den aktuellen Branch in `work` mergen, prüfen, dass `work` alle Änderungen enthält, `work` pushen und den Arbeitsbranch nach ausdrücklicher Bestätigung löschen |

#### `savetowork` Sicherheitsablauf

`savetowork` ist eine Git-Operation ohne Codeänderung. Der Agent führt die Schritte ausschließlich seriell aus:

1. Aktuellen Branch und Working Tree prüfen.
2. Falls offene Änderungen vorhanden sind: alle Änderungen stagen, sinnvoll committen und den aktuellen Branch pushen.
3. `work` von `origin/main` abzweigen, falls `work` noch nicht existiert; andernfalls auf `work` wechseln und `origin/work` aktualisieren.
4. Den zuvor aktuellen Arbeitsbranch in `work` mergen.
5. Absichern, dass die Änderungen wirklich in `work` liegen, mindestens durch `git status`, Branch-/Upstream-Prüfung und Vergleich der relevanten Commit-Spitzen.
6. `work` pushen.
7. Vor dem Löschen des Arbeitsbranches ausdrücklich beim Nutzer bestätigen lassen, welcher lokale und welcher Remote-Branch gelöscht werden sollen.
8. Erst nach Bestätigung den Arbeitsbranch lokal und remote löschen.

---

## 4. Umsetzungsregeln

### 4.1 Serielle Ausführung (Pflicht)

Alle Kommandos — Git, Tests, Builds, Migrationen — werden ausschließlich **seriell** ausgeführt. Kein paralleles Starten mehrerer Prozesse.

### 4.2 Keine spekulativen Änderungen

Der Agent ändert nur, was im Auftrag oder im bestätigten Plan steht. Keine Refactorings, Umbenennungen, Strukturänderungen oder Verbesserungen „nebenbei", ohne dass der Auftrag dies verlangt.

### 4.3 Keine Regressions-Fixes während Tests

Schlägt ein Test fehl, dokumentiert der Agent den Fehler. Eigenständige Fixes während eines laufenden Testlaufs sind unzulässig. Fixes erfolgen erst nach einem separaten Folgeauftrag.

### 4.4 Test-Nachführung bei Codeänderungen (Pflicht, unabhängig von Auftragsklasse)

Bei jeder Codeänderung wird vor dem Commit geprüft, welche bestehenden Tests die geänderten Stellen abdecken. Veraltete Tests — durch geänderte Labels, Props oder API-Signaturen — werden als Teil der Änderung aktualisiert. Assertions bleiben gleich spezifisch oder werden spezifischer. Abschwächen ist keine Option.

### 4.5 Blocker-Verhalten — Weitermachen ist Pflicht

Ein Blocker in einer Teilaufgabe unterbricht den Auftrag **nicht**. Der Agent dokumentiert den Blocker im Schritt-Log und setzt die Umsetzung mit dem nächsten Schritt fort.

**Abbruch des gesamten Auftrags ist nur zulässig, wenn es faktisch unmöglich ist weiterzuarbeiten** — zum Beispiel wenn eine Datei fehlt, die für alle folgenden Schritte zwingend benötigt wird, oder wenn ein Kompilierfehler jeden weiteren Schritt blockiert.

In jedem anderen Fall gilt: Blocker dokumentieren, Schritt als `⚠️ Teilweise abgeschlossen` loggen, nächsten Schritt beginnen. Der Nutzer entscheidet nach Abschluss des Auftrags, wie mit offenen Blockern umgegangen wird.

Ein Blocker wird dokumentiert mit: was genau fehlt, welcher Schritt betroffen ist, welche Schritte davon abhängen, und ob die abhängigen Schritte trotzdem teilweise ausführbar sind.

---

## 5. Schritt-Log (Pflicht nach jeder Teilaufgabe)

Nach jeder abgeschlossenen Teilaufgabe schreibt der Agent **automatisch und ohne Rückfrage** einen Log-Eintrag. Das gilt für jeden nummerierten Implementierungsschritt aus dem Großauftrag sowie für jeden eigenständigen Änderungsauftrag der Klassen 4 und 5.

Jeder Log-Eintrag wird in eine **neue** Datei geschrieben. Bestehende einzelne Log-Dateien unter `logs/` dürfen nicht nachträglich ergänzt, korrigiert oder überschrieben werden. Nachträge, Korrekturen und Anschlussberichte erhalten immer eine eigene neue Log-Datei mit aktuellem Zeitstempel. Die einzige reguläre Änderung an einer bestehenden Datei im Log-Bereich ist die Aktualisierung des Index `logs/README.md`.

### 5.1 Dateiname und Ablageort

```
logs/YYYY-MM-DD-HH-mm-ss-schritt-<N>-<kurztitel-kebab-case>.md
logs/YYYY-MM-DD-HH-mm-ss-<typ-kebab-case>-<kurztitel-kebab-case>.md
```

`HH-mm-ss` ist die lokale Zeit im 24-Stunden-Format und wird mit Bindestrichen geschrieben, damit Dateinamen Windows-kompatibel bleiben.

Beispiele:
- `logs/2026-05-17-09-14-33-schritt-02-schema-migration.md`
- `logs/2026-05-17-10-02-08-schritt-05-notizen-api.md`
- `logs/2026-05-18-16-30-12-fix-kanban-position.md`

Der Ordner `logs/` liegt im Repo-Root. Er wird beim ersten Log automatisch angelegt, falls er noch nicht existiert. `logs/` ist in `.gitignore` **nicht** eingetragen — Logs sind Teil des Repos.

### 5.2 Pflichtinhalt jedes Log-Eintrags

```markdown
# Log: <Kurztitel>

**Datum:** DD.MM.YY  
**Uhrzeit:** HH:mm:ss  
**Schritt:** <N> — <Schrittbezeichnung aus Großauftrag> (oder: Fix / Feature)  
**Status:** ✅ Abgeschlossen | ⚠️ Teilweise abgeschlossen | 🔴 Blockiert

## Was wurde umgesetzt

<Kurze Beschreibung in 3–8 Sätzen: was implementiert wurde, welcher Ansatz gewählt wurde und warum.>

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/notes.ts` | neu | Notizen-Endpunkte |
| `apps/api/src/db/schema.ts` | geändert | notes + Join-Tabellen ergänzt |

## Probleme und Abweichungen

<Falls keine: „Keine." — sonst konkret benennen: was war unerwartet, was weicht vom Plan ab, was wurde bewusst anders gelöst.>

## Offene Punkte / Folgeaufgaben

<Falls keine: „Keine." — sonst konkret auflisten.>
```

Bei Teständerungen nennt der Schritt-Log zusätzlich, welche Testleitplanken angewendet wurden und welche Testebenen abgedeckt sind.

### 5.3 Wann gilt eine Teilaufgabe als abgeschlossen?

Eine Teilaufgabe gilt als abgeschlossen, wenn:
- der Code fehlerfrei kompiliert,
- der Schritt das beschriebene Ziel aus dem Plan/Großauftrag erfüllt,
- keine bekannten Blocker offen sind.

Kann eine Teilaufgabe nur teilweise umgesetzt werden, wird der Log mit Status `⚠️ Teilweise abgeschlossen` geschrieben und der Blocker konkret dokumentiert. Auch in diesem Fall wird der Log **sofort geschrieben** — nicht erst nach Lösung des Blockers.

### 5.4 Log-Index pflegen

Der Agent pflegt zusätzlich eine Datei `logs/README.md` als chronologische Übersicht:

```markdown
# Log-Übersicht Projekt Manager

| Datum | Uhrzeit | Schritt | Kurztitel | Status |
|---|---|---|---|---|
| 17.05.26 | 09:14:33 | 2 | Schema & Migration | ✅ |
| 17.05.26 | 10:02:08 | 3 | Fastify-Backend Basis | ✅ |
```

Der neueste Eintrag steht **oben**. Der Index wird nach jedem neuen Log sofort aktualisiert.

---

## 6. Coding Standards

### Sprache

- Code, Variablen, Funktionen, Kommentare im Code: **Englisch**
- Log-Dateien, Plantext, Fehlermeldungen an den Nutzer: **Deutsch**
- Commit-Messages: Englisch, Imperativ, max. 72 Zeichen Betreff

### Zeichenkodierung

- Alle Quelltexte und Doku-Dateien: **UTF-8**
- Deutsche Umlaute und `ß` als echte Zeichen schreiben (`ä`, `ö`, `ü`, `ß`). Umschreibungen wie `ae`, `oe`, `ue` sind unzulässig.

### Datumsformate

- **Menschenlesbar** (UI, Logs, Kommentare, Dokumentation): `dd.MM.yy`
- **Maschinenlesbar** (DB, API-Payloads, Dateinamen, SQL): `ISO 8601` (`yyyy-MM-dd` bzw. `yyyy-MM-ddTHH:mm:ss`)
- Keine anderen Formate. Abweichungen gelten als Fehler.

### TypeScript

- Kein `any` ohne ausdrückliche Begründung im Kommentar
- Alle öffentlichen Funktionen und API-Handler sind typisiert
- Shared Types aus `packages/shared-types` — keine doppelten Type-Definitionen in `api` und `web`
- Keine `// @ts-ignore` ohne Kommentar

### Fastify-Backend

- Jede Route in einem eigenen Plugin-File unter `src/routes/`
- Einheitliches Fehlerformat aus Abschnitt 9
- Keine Business-Logik in Route-Handlern — Logik in separaten Service-Funktionen
- Alle Endpunkte haben ein Fastify-Schema (Request-Validierung)

### Authentifizierung und Rollen (verbindlich)

Benutzer, Rollen und Berechtigungen sind Querschnittsinfrastruktur und müssen bei jeder neuen API-, Web- oder Domänenänderung mitgeplant werden.

- Neue API-Routen sind grundsätzlich authentifizierungspflichtig. Öffentliche Ausnahmen müssen im Plan ausdrücklich benannt und begründet werden.
- Aktuell öffentliche Ausnahmen sind nur `/health`, `/api/health` und `/api/auth/*`, sofern keine spätere Aufgabendatei etwas anderes festlegt.
- Die API ist die verbindliche Sicherheitsgrenze. Frontend-Gating verbessert nur die Bedienbarkeit und ersetzt nie Backend-Berechtigungsprüfungen.
- Jede neue Route erhält eine konkrete Berechtigungsentscheidung: `read` für lesende Endpunkte, `write` für erstellende oder ändernde Endpunkte, `delete` für Löschoperationen oder eine ausdrücklich benannte Admin-Berechtigung.
- Admin-Routen verwenden domänenspezifische Admin-Rechte, zum Beispiel `users:admin` und `roles:admin`; neue Admin-Bereiche bekommen eigene klar benannte Admin-Permissions.
- Neue fachliche Domänen oder größere Support-Objekte müssen im Permission-Katalog berücksichtigt werden, wenn sie per API gelesen, geändert oder administriert werden.
- Services dürfen nicht davon ausgehen, dass ein Frontend eine Aktion bereits verborgen hat. Verbotene Zugriffe liefern `FORBIDDEN`, fehlende oder ungültige Sessions liefern `UNAUTHORIZED`.
- Tests für neue geschützte Workflows müssen mindestens den erfolgreichen Zugriff mit berechtigtem User und den abgelehnten Zugriff ohne ausreichende Berechtigung abdecken. Bei Schreiboperationen wird zusätzlich ein Reader- oder Custom-Role-Negativfall geprüft.

### Drizzle ORM

- Keine rohen SQL-Strings außer für unvermeidbare SQLite-spezifische Ausdrücke
- Alle Schema-Änderungen gehen über neue Migrations-Dateien — kein `drizzle-kit push` in der regulären Arbeit
- `db/client.ts` als einziger Einstiegspunkt für die Drizzle-Instanz

### Repository- und Service-Schicht

- Neue fachliche Entitäten und bearbeitbare Support-Objekte erhalten eine Repository-Datei unter `apps/api/src/repositories/`, sofern sie CRUD, Versionierung oder wiederverwendbare Persistenzlogik haben.
- Repository-Funktionen kapseln einfache DB-Zugriffe, CRUD-Operationen und Version-Checks. Services orchestrieren Business-Regeln, Relationen, Dateioperationen und domänenübergreifende Abläufe.
- Update-Operationen für versionierte Objekte verlangen strikt `expectedVersion`; fehlende Werte sind `BAD_REQUEST`, Versionskonflikte sind `CONFLICT`.
- Route-Handler rufen Services auf und enthalten keine eigene Persistenz- oder Businesslogik.
- Neue öffentliche DTOs geben `version` zurück, sobald das Objekt versioniert ist.

### Versionierung und Audit

- Neue fachliche Entitäten erhalten grundsätzlich `version`, `createdBy`, `updatedBy`, `createdAt` und `updatedAt`.
- Neue bearbeitbare Support-Objekte erhalten ebenfalls `version`, `createdBy`, `updatedBy`, `createdAt` und `updatedAt`, sofern sie per API geändert werden können.
- Infrastruktur- oder Admin-Tabellen ohne fachlichen Bearbeitungsworkflow dürfen davon abweichen, wenn der Plan die Abweichung ausdrücklich benennt.
- Jede Update-Route eines versionierten Objekts muss `expectedVersion` im Fastify-Schema erzwingen und einen Integrationstest für den erfolgreichen Update-Fall mit aktueller Version enthalten.

### React / Frontend

- Keine `useEffect`-Ketten für Datenabruf — Datenabruf in custom Hooks
- Keine Business-Logik in Komponenten — Logik in Hooks oder `src/api/`
- Keine direkte `fetch`-Nutzung in Komponenten — immer über `src/api/`-Funktionen
- Kein `any` in Props-Definitionen
- Neue Navigationseinträge, Aktionsbuttons und Seiten mit geschützten API-Aufrufen berücksichtigen die aktuelle Rolle und die Permissions aus `useAuth`. Versteckte UI ist nur Komfort; die zugehörige API-Berechtigung bleibt Pflicht.

### TanStack Query (verbindlich)

Server-State wird ausschließlich über TanStack Query verwaltet. Kein `useState` + `useEffect` für Datenabruf.

- **API-Client:** `ky` — importiert als `api` aus `src/api/client.ts`. URLs ohne führenden Slash: `api.get("projects/1/tickets").json<Ticket[]>()`. Kein eigener Wrapper.
- **Query-Keys:** zentral in `src/queries/queryKeys.ts`. Jede Domäne hat einen eigenen Block mit `root`, `list`, `detail` und ggf. domänenspezifischen Schlüsseln. Neue Domänen müssen dort eingetragen werden.
- **Invalidierung:** zentral in `src/queries/invalidation.ts` als benannte async-Funktionen (z. B. `invalidateTicketScope`). Nach jeder Mutation wird der zuständige Scope invalidiert — nie manuell `queryClient.invalidateQueries` in Hooks aufrufen. `invalidateSeedData` muss alle Domänen-Roots erfassen.
- **Hooks:** Zwei Ebenen pro Domäne:
  - `use<Domäne>(projectId?)` — Liste + Mutations (create, update, position, delete)
  - `use<Domäne>Detail(id)` — Einzelelement + alle Detail-Mutations (tags, comments, relations, sub-items)
- **Owner-basierte Querschnitts-Hooks:** `useNotes(owner)` und `useAttachments(owner)` sind generisch und decken alle dafür freigegebenen Domänen ab. Owner sind Discriminated Unions; beim Hinzufügen neuer Träger müssen `QueryOwnerType`, `NoteOwnerType`, `AttachmentOwner`, `NoteOwner` und die zuständigen API-Funktionen konsistent erweitert werden.
- **Fehlerbehandlung:** `toQueryError(query.error)` aus `src/queries/queryErrors.ts` — nie rohe `error`-Objekte an Komponenten weitergeben.

---

## 7. Projektstruktur (Referenz)

```
taskmanager/
├── agents.md                          ← diese Datei
├── logs/                              ← Schritt-Logs (automatisch, Abschnitt 5)
│   └── README.md
├── tests/                             ← zentrale Testhierarchie
│   ├── unit/                          ← Unit-Tests nach App (`api/`, `web/`)
│   ├── integration/                   ← Integrationstests nach App (`api/`, `web/`)
│   ├── browser/                       ← Browser-/E2E-Tests nach App (`web/`)
│   ├── fixtures/                      ← Test-Fixtures und Test-Helper
│   ├── setup/                         ← Test-Setups
│   └── .runtime/                      ← generierte Testlaufdaten (ignoriert)
├── skills/                            ← versionierte Skills für dieses Repo
│   └── projekt-manager-planungsleitplanken/
├── docs/
│   ├── tasks/                         ← Aufgabendateien (Abschnitt 7.1)
│   └── ...                            ← Architektur- und Implementierungsdokumentation
├── codex-auftrag-ticket-system.md     ← Großauftrag (Legacy-Ablage, neue Aufträge → docs/tasks/)
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── db/schema.ts           ← zentrales Drizzle-Schema (alle Tabellen)
│   │       ├── repositories/          ← CRUD, Version-Checks und Persistenzzugriffe
│   │       ├── routes/                ← Fastify-Routes (eine Datei pro Domäne)
│   │       ├── services/              ← Business-Logik (eine Datei pro Domäne)
│   │       └── db/migrations/        ← versionierte SQL-Migrationen
│   └── web/
│       └── src/
│           ├── api/                   ← ky-Fetch-Funktionen (eine Datei pro Domäne)
│           ├── hooks/                 ← TanStack Query Hooks
│           ├── queries/               ← queryKeys, invalidation, queryClient, queryErrors
│           ├── components/            ← UI-Komponenten (Ordner pro Domäne)
│           └── pages/                 ← Seitenkomponenten
└── packages/
    └── shared-types/                  ← gemeinsame TypeScript-Interfaces
```

### 7.1 Aufgabendateien (verbindlich)

Alle Aufgabendateien werden unter `docs/tasks/` abgelegt. Dateiname: `codex-auftrag-<thema-kebab-case>.md`.

Die Vorlage liegt unter `docs/task-template.md`. Neue Aufgabendateien folgen dem Format des Skill `mugplan-codex-auftrag` (Abschnitte: Ziel, Kontext, Aufgabe, Regeln & Einschränkungen, Randfälle & Fehlerpfade, Seiteneffekte, Testhinweise, Abnahmekriterien, Implementierungsreihenfolge).

Aufgabendateien im Repo-Root sind nicht zulässig. Bestehende Dateien im Root gelten als Legacy und werden bei Gelegenheit nach `docs/tasks/` verschoben.

### 7.2 Testregime in Aufgabendateien (verbindlich)

Jede Aufgabendatei enthält einen Abschnitt **Testhinweise** mit:

- Dem verwendeten Test-Framework und Hilfsmitteln
- Konkreten Testfällen pro neuer oder geänderter Komponente (nummeriert)
- Dem Pflicht-Kommentar-Format für neue Testdateien (Test Scope, Abgedeckte Regeln, Fehlerfälle, Ziel)
- Abnahmekriterium: alle aufgeführten Tests müssen vor Abnahme grün sein

`test.skip`, `it.skip` und leere Testkörper sind ohne dokumentierten Blocker im Schritt-Log unzulässig und zählen nicht als implementierte Tests.

---

## 8. Migrationsstrategie (verbindlich)

- Jede strukturelle Änderung am DB-Schema erfordert eine neue versionierte Migrationsdatei unter `apps/api/src/db/migrations/`
- Eine Änderung nur in `schema.ts` ohne neue Migration ist unzulässig
- `drizzle-kit push` ist für reguläre Arbeit nicht zulässig
- Commits bei Schemaänderungen müssen immer `schema.ts`, neue Migrationsdatei und `migrations/meta/*` gemeinsam enthalten
- Bereits versionierte Migrationsdateien dürfen nicht umgeschrieben werden — Korrekturen über neue Folge-Migrationen

### Pflichtablauf bei DB-Änderungen

1. Schemaänderung in `schema.ts` vornehmen
2. `drizzle-kit generate` ausführen — neue Migrationsdatei entsteht
3. `drizzle-kit migrate` ausführen — Migration auf lokaler Dev-DB anwenden
4. Prüfen, ob DB-Schema zum Code passt
5. Erst jetzt Tests oder weitere Implementierung

Eine Schemaänderung gilt erst als abgeschlossen, wenn die Migration erfolgreich gelaufen ist. Schlägt die Migration fehl, darf der Agent den Schritt nicht als abgeschlossen melden.

---

## 9. Einheitliches Fehlerformat (API)

Alle Fastify-Endpunkte liefern Fehler in diesem Format:

```json
{
  "error": "NOT_FOUND",
  "message": "Task with id 42 not found",
  "statusCode": 404
}
```

Zulässige `error`-Werte: `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`.

---

## 10. Deployment & Start

### Startup-Befehle

```bash
npm run dev        # startet api + web parallel via concurrently
npm run dev -w apps/api   # nur Backend (Port 3001)
npm run dev -w apps/web   # nur Frontend (Port 5173)
```

### Dev-Server-Nutzung durch den Agenten

Der Agent startet keinen Web-Dev-Server als Abschluss-Service, nur damit der Nutzer Änderungen testen kann. Für eigene Prüfungen darf der Agent einen Dev-Server starten, wenn dies fachlich nötig ist; jeder dadurch gestartete Prozess muss vor der Abschlussantwort wieder beendet werden. In der Abschlussantwort wird kein laufender localhost-Server angeboten oder gemeldet, außer der Nutzer fragt ausdrücklich danach.

### Umgebungsvariablen

- Backend: `.env` in `apps/api/` (wird nicht ins Repo eingecheckt, `.env.example` liegt vor)
- Pflichtfelder: `DATABASE_PATH`, `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`

### Attachment-Uploads

- Dateien liegen in `apps/api/uploads/` (im `.gitignore`)
- Maximale Dateigröße: **25 MB**
- Dateinamen: UUID + originale Extension

---

## 11. Teststrategie

> ⚠️ Die Testinfrastruktur wird im Verlauf des Projekts aufgebaut. Dieser Abschnitt wächst mit. Noch nicht vorhandene Kommandos sind als Platzhalter markiert.

### Testentwurfs-Gate

Vor jeder Test-Erstellung, Test-Änderung oder Testabdeckungsbewertung muss der Agent `skills/projekt-manager-test-entwurfsleitplanken` anwenden und kurz im Chat oder im Schritt-Log benennen.

Für Testpläne und Teständerungen dokumentiert der Agent mindestens:
- Testebene: Unit, Integration oder Browser/E2E
- zu beweisendes Verhalten: Ausgangszustand, Aktion und beobachtbares Ergebnis
- echte Daten und Isolation: Temp-DB, In-Memory-DB, `tests/.runtime` oder Temp-Root
- Mock-Entscheidung und relevante Negativ-, Berechtigungs- oder Konfliktfälle

### Testebenen

**Unit** — isolierte Logik, keine echte DB-Verbindung, keine Dateisystem-Zugriffe außer `os.tmpdir()`.

**Integration** — reale SQLite-Datei (In-Memory oder Temp-Datei), echte Fastify-App, Supertest für HTTP-Requests.

**E2E** — Playwright-Browsertests unter `tests/browser/web/`.

### Bekannte Kommandos (wachsen mit dem Projekt)

```bash
npm run test              # alle Tests (root, delegiert an workspaces)
npm run test -w apps/api  # nur API-Tests
npm run test -w apps/web  # nur Web-Unit-/Integrationstests
npm run e2e -w apps/web   # Web-Browser-/E2E-Tests
```

### Grundregeln

- Jeder Test muss einen beobachtbaren Effekt prüfen — keine reinen Sichtbarkeitsprüfungen
- Leere Tests, Platzhaltertests und Tests ohne fachliche Assertion sind unzulässig. `test.skip`, `it.skip`, `describe.skip` oder leere Testkörper dürfen nur verwendet werden, wenn der Nutzer dies ausdrücklich beauftragt oder ein konkreter Blocker im Log dokumentiert wird; sie zählen nie als implementierte Tests.
- Wenn ein Test noch nicht sicher implementierbar ist, wird kein leeres Testgerüst committed. Stattdessen wird die fehlende Testabdeckung als offener Punkt im Log dokumentiert.
- Neue oder geänderte geschützte Workflows müssen Rollen- und Berechtigungstests enthalten. Mindestens ein positiver Fall mit passender Permission und ein negativer Fall ohne passende Permission sind Pflicht; bei UI-Flows wird zusätzlich geprüft, dass unzulässige Aktionen nicht angeboten oder mit Forbidden behandelt werden.
- Keine Direktzugriffe auf die Produktions-SQLite-Datei in Tests
- Alle Tests mit DB-Bezug verwenden ausschließlich In-Memory-, Temp- oder `tests/.runtime`-Datenbanken; Testläufe dürfen nie `apps/api/data/` verwenden.
- Alle Tests mit Dateisystembezug verwenden ausschließlich Temp- oder `tests/.runtime`-Verzeichnisse; Testläufe dürfen nie `apps/api/uploads/`, `apps/api/content/` oder `apps/api/backups/` verwenden.
- Integrationstests verwenden eine eigene Temp-DB, die vor/nach dem Test angelegt und gelöscht wird
- Integrationstests für Update-Endpunkte versionierter Objekte verwenden die aktuelle `version` aus Create- oder GET-Antworten und senden `expectedVersion` explizit mit.
- Neue Anwendungstabellen müssen in Test-Fixtures, `truncateAll` und Dump-Roundtrip-Tests berücksichtigt werden, sobald sie Teil des produktiven DB-Schemas sind.
- Schlägt ein Test fehl, dokumentiert der Agent den Fehler und nimmt keine eigenständigen Fixes vor

### Test-Dokumentation in Testdateien

Jede neue Testdatei enthält einen Pflicht-Kommentar:

```ts
/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - <Regel 1>
 *
 * Fehlerfälle:
 * - <Fehlerfall 1>
 *
 * Ziel:
 * <Kurzbeschreibung der Absicherung>
 */
```

---

## 12. Voller Testlauf und voller Audit

> ⚠️ Die vollständigen Kommandos werden ergänzt, sobald die Testinfrastruktur steht.

### Voller Testlauf umfasst

- `npm run test -w apps/api`
- `npm run test -w apps/web`
- `npm run e2e -w apps/web`

Alle Testkommandos werden seriell ausgeführt. Ein fehlgeschlagenes Kommando unterbricht den Gesamtlauf nicht; alle weiteren Testkommandos werden trotzdem ausgeführt.

Nach dem Testlauf berichtet der Agent:
- welche Kommandos ausgeführt wurden,
- pro Kommando: Status, Anzahl grün, rot, übersprungen und blockiert,
- gesamt: Anzahl ausgeführt, grün, rot, übersprungen und blockiert,
- Infrastrukturfehler getrennt von Testfehlern, zum Beispiel Serverstart, fehlende native Bindings oder belegte Ports.

Blockierte Browser-Tests zählen nicht als rote Testfälle, wenn der Runner keine Tests ausführt. Sie werden als `blockiert` mit konkreter Ursache berichtet.

Fehler werden zusätzlich in zwei Gruppen eingeordnet:

**Kann durch Test-Fixes gelöst werden**

Beispiele: veraltete Selektoren, falsche Testannahmen, Timing-/Waiting-Probleme, Mock-/Fixture-Probleme oder E2E-Flows, die noch auf eine alte UI-Struktur zeigen.

**Muss in Produktionscode gelöst werden**

Diese Gruppe wird nach Schweregrad absteigend berichtet:
- **Kritisch:** Datenverlust, falsche API-Schreiboperationen, Sicherheits- oder Runtime-Isolation verletzt
- **Hoch:** Hauptworkflow kaputt, Create/Edit/Delete nicht möglich, Navigation blockiert
- **Mittel:** falsche Anzeige, fehlende Invalidierung, fehlerhafte Relation-, Counter- oder Toast-Logik
- **Niedrig:** UX-, Text-, A11y- oder Layout-Abweichungen ohne Funktionsverlust

### Voller Audit umfasst (Platzhalter)

- `npm run lint`
- `npm run build`
- _(weitere Prüfungen werden ergänzt)_

Nach Ausführung muss der Agent explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte und welche noch nicht verfügbar sind.

---

## 13. Abschluss-Workflow

Nach Fertigstellung eines Auftrags richtet sich der Abschluss nach der gewählten Auftragsklasse.

**Für Klasse 1 (reine Frage):** Antwort liefern, Abschlussprüfung aus 13.4.

**Für Klasse 2 (Report):** Report liefern, kein automatischer Log.

**Für Klasse 3 (Git-Operation):** Git-Ergebnis berichten, kein Log.

**Für Klasse 4 und 5 (Änderungsauftrag):**

### 13.1 Schritt-Log schreiben (automatisch, keine Rückfrage)

Der Agent schreibt den Log-Eintrag gemäß Abschnitt 5 **immer** — ohne Rückfrage, ohne Nutzerbestätigung. Das ist kein optionaler Schritt.

### 13.2 Testlauf

> „Soll ich einen Testlauf ausführen?"

- Bei **ja**: alle verfügbaren Testkommandos aus Abschnitt 12 seriell ausführen und Ergebnis berichten.
- Ein fehlgeschlagenes Kommando unterbricht den Lauf nicht — alle weiteren werden trotzdem ausgeführt.
- Bei **nein**: kein Testlauf.

### 13.3 Dokumentation aktualisieren

> „Soll ich `docs/` auf Aktualität prüfen und bei Bedarf aktualisieren?"

- Bei **ja**: nur direkt betroffene Abschnitte gezielt aktualisieren — keine vollständigen Neuschriften.
- Bei **nein**: keine Änderung.

### 13.4 Abschlussprüfung (immer, ohne Rückfrage)

Der Agent prüft das Ergebnis gegen:
- den Aufgabentext inkl. Ziel und Akzeptanzkriterien,
- die Implementierungsvorgaben aus dem Großauftrag,
- die gewählte Auftragsklasse.

Der Agent nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt und der Schritt-Log geschrieben ist. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Blocker im Log sauber dokumentiert ist.

---

## 14. Domänenarchitektur (Referenz)

Die App ist in drei fachliche Domänen gegliedert. Neue Features und Änderungen müssen sich in dieses Modell einordnen.

### Domäne 1 — Projektmanagement

Entitäten: `projects`, `milestones`, `tasks` (inkl. Subtasks via `parentId`), `backlogItems`

- Milestones gehören immer einem Projekt (`projectId NOT NULL`) und sind eine Projekt-Subdomäne
- Tasks sind owner-unabhängige fachliche Objekte und werden über `projectTasks`, `milestoneTasks`, `featureTasks` oder `useCaseTasks` an Träger gebunden
- Subtasks sind Tasks mit gesetztem `parentId`
- Backlog ist ein **Ideenspeicher** — BacklogItems werden nicht zu Tasks oder Tickets konvertiert
- Navigation: `/projects`, `/projects/:id`, `/milestones/:id`

### Domäne 2 — Dokumentation

Entitäten: `features`, `useCases`, `wikiPages`, `featureRelations`

- Use Cases gehören immer einem Feature (`featureId NOT NULL`)
- Features können projekt- und milestoneübergreifend referenziert werden (`projectFeatures`, `milestoneFeatures`, `featureTasks`, `useCaseTasks`)
- Wiki-Seiten sind hierarchisch via `parentId` (restrict on delete), optional einem Projekt zugeordnet
- Navigation: `/features`, `/features/:id`, `/wiki`, `/wiki/:id`

### Domäne 3 — Tickets & Bug-Tracking

Entitäten: `tickets`, `ticketRelations`, `ticketTags`, `ticketNotes`, `projectTickets`, `milestoneTickets`, `taskTickets`, `featureTickets`, `useCaseTickets`

- Tickets sind owner-unabhängige fachliche Objekte und können über Join-Tabellen mehreren Trägern zugeordnet werden
- Sub-Tickets via `parentId` (cascade delete); Sub-Tickets werden nicht direkt an Owner verknüpft
- Ticket-Typen: `bug | improvement | question | task`
- Ticket-Status: `open → in_progress → in_review → resolved → closed`
- `resolvedAt` wird automatisch gesetzt beim Übergang in `resolved` oder `closed`
- Relationen: `blocks | related | duplicate` (keine Self-Relationen)
- Navigation: `/tickets` (projektübergreifend mit Filter)

### Querschnittsinfrastruktur

Folgende Infrastruktur wird von mehreren Domänen gemeinsam genutzt:

| Infrastruktur | Träger-Entitäten | Implementierung |
|---|---|---|
| **Tags** | projects, milestones, tasks, tickets | Join-Tabellen (`projectTags`, `milestoneTags`, `taskTags`, `ticketTags`), `setXxxTags`-Service-Funktionen |
| **Notes** | projects, milestones, tasks, tickets | Join-Tabellen (`projectNotes`, `milestoneNotes`, `taskNotes`, `ticketNotes`), `useNotes(owner)` Hook |
| **Attachments** | projects, milestones, tasks, features, tickets | `attachments` plus Owner-Join-Tabellen (`projectAttachments`, `milestoneAttachments`, `taskAttachments`, `featureAttachments`, `ticketAttachments`), DTO `owners: [...]`, `useAttachments(owner)` Hook |
| **Comments** | tasks, features, projects, milestones, useCases, backlogItems, wikiPages, tickets | `comments` plus Owner-Join-Tabellen (`projectComments`, `milestoneComments`, `taskComments`, `featureComments`, `useCaseComments`, `backlogItemComments`, `wikiPageComments`, `ticketComments`), DTO `owners: [...]` |
| **Calendar** | projects, milestones, tasks | `events`-Tabelle plus `projectEvents`/`milestoneEvents`/`taskEvents`-Join-Tabellen |
| **Auth & Rollen** | alle API- und Web-Workflows | Session-Auth, Rollen, Permissions, Permission-Katalog, API-Guards und UI-Gating |

**Beim Hinzufügen einer neuen Attachment-fähigen Entität:**
1. Neue Owner-Join-Tabelle anlegen — direkte Owner-Spalten in `attachments` sind im Zielschema nicht zulässig.
2. `AttachmentOwner`, `QueryOwnerType`, Query-Keys, Invalidierung und API-Funktionen ergänzen.
3. Attachment-DTOs weiterhin mit `owners: [...]` ausgeben.
4. Dump-Registry, Test-DB-Truncation und Roundtrip-Seed aktualisieren.

**Beim Hinzufügen einer neuen Note-fähigen Entität:**
1. Neue Note-Join-Tabelle oder vorhandenes Note-Owner-Modell erweitern.
2. `NoteOwnerType`, `NoteOwner`, Query-Keys, Invalidierung und API-Funktionen ergänzen.
3. Dump-Registry, Test-DB-Truncation und Roundtrip-Seed aktualisieren.

**Beim Hinzufügen einer neuen comment-fähigen Entität:**
1. Neue Owner-Join-Tabelle anlegen — direkte Owner-Spalten oder polymorphe `entityType`/`entityId`-Spalten in `comments` sind nicht zulässig.
2. `CommentOwner` und `CommentEntityType` in `packages/shared-types` ergänzen, falls ein separater Type-Export betroffen ist.
3. Comment-DTOs weiterhin mit `owners: [...]` ausgeben.
4. Dump-Registry, Test-DB-Truncation und Roundtrip-Seed aktualisieren.

**Beim Hinzufügen einer neuen tag-fähigen Entität:**
1. Neue Tag-Join-Tabelle anlegen.
2. `setXxxTags`-Service-Funktion und passende API-Route ergänzen.
3. Query-Invalidierung und betroffene Detail-Hooks erweitern.
4. Dump-Registry, Test-DB-Truncation und Roundtrip-Seed aktualisieren.

### Pflichtcheckliste für neue Domänen und Support-Objekte

Vor der Umsetzung einer neuen Entität muss im Plan ausdrücklich eingeordnet werden:

- Gehört die Entität zu Projektmanagement, Dokumentation, Tickets oder ist eine neue Domäne nötig?
- Ist sie ein fachliches Objekt, ein bearbeitbares Support-Objekt oder reine Infrastruktur/Admin-Konfiguration?
- Ist sie versioniert, owner-fähig, suchbar, tag-, note-, comment- oder attachment-fähig?
- Welche Rollen- und Permission-Regeln gelten für Lesen, Schreiben, Löschen und Administration?
- Welche Parent-Child- und Owner-Beziehungen gelten im Zielzustand?
- Welche Löschregel gilt pro Beziehung: cascade, restrict, set null oder nur Join entfernen?

Für neue fachliche Domänen gilt als Mindestumfang:

1. `schema.ts` plus neue Migration und Migrationstestlauf.
2. Shared Types in `packages/shared-types`.
3. Repository unter `apps/api/src/repositories/` für CRUD und Version-Checks.
4. Service unter `apps/api/src/services/` für Business-Regeln und Relationen.
5. Route unter `apps/api/src/routes/` mit Fastify-Schema und einheitlichem Fehlerformat.
6. Permission-Katalog, API-Guards und Auth-Testfälle für die neuen Routen.
7. Update-Routen mit strikt erforderlichem `expectedVersion`.
8. API-Integrationstests inklusive erfolgreichem Update mit aktueller Version und mindestens einem fachlichen Fehlerfall.
9. Web-API-Funktionen unter `apps/web/src/api/`.
10. Query-Keys, Invalidierung und Hooks gemäß TanStack-Regeln.
11. UI-Labels und Tone-Maps in `src/utils/domainLabels.ts`.
12. Global Search nur dann erweitern, wenn die Entität fachlich suchbar sein soll.
13. Dump-Registry, Test-DB-Truncation und Dump-Roundtrip-Seed für jede neue Anwendungstabelle.

### Dump- und Backup-Registry

Jede neue Anwendungstabelle muss in `apps/api/src/services/dump.service.ts` in `DUMP_TABLES` eingetragen werden. Die Reihenfolge muss Foreign Keys respektieren: Eltern-Tabellen stehen vor abhängigen Tabellen, damit der Restore in Einfüge-Reihenfolge funktioniert und das Löschen in umgekehrter Reihenfolge sicher ist.

Zusätzlich müssen aktualisiert werden:

1. `tests/fixtures/api/db.ts` — `truncateAll` um die Tabelle ergänzen.
2. `tests/integration/api/dumps-local.test.ts` — Tabellenvertrag unverändert lassen und Roundtrip-Seed um repräsentative Daten ergänzen, wenn die Tabelle fachliche Daten hält.
3. Bei strukturellen Dump-Formatänderungen bewusst entscheiden, ob `DUMP_FORMAT_VERSION` erhöht werden muss. Neue Tabellen allein erhöhen die Formatversion nicht automatisch, weil die Schema-Revision bereits geprüft wird.

Der Tabellenvertrag im Dump-Test darf nicht abgeschwächt werden. Wenn er rot wird, fehlt in der Regel eine Registry-, Truncation- oder Seed-Ergänzung.

**Beim Hinzufügen einer neuen suchbaren Entität:**

Die globale Suche ist zentral in `apps/web/src/hooks/useGlobalSearchData.ts` implementiert (eingeführt durch `logs/2026-05-17-feature-global-query-sync.md`). Neue Entitäten, die in der globalen Suche erscheinen sollen, müssen dort in drei Stellen registriert werden:
1. `GlobalSearchData`-Interface um das neue Feld erweitern (z. B. `tickets: Ticket[]`)
2. In `loadGlobalSearchData` die Fetch-Funktion ergänzen (pro Projekt oder global, je nach Entität)
3. Fallback-Objekt im Hook-Return um das Feld mit leerem Array ergänzen

Zusätzlich muss `apps/web/src/components/search/GlobalSearch.tsx` den neuen Entitätstyp als Ergebnisgruppe rendern.

---

## 15. UI-Komponentenarchitektur (verbindlich)

Alle neuen Domain-Views und -Formulare werden **ausschließlich auf vorhandenen UI-Basiskomponenten** aufgebaut. Keine eigenen Card-Strukturen, keine eigenen Formular-Primitives, keine hardcodierten deutschen Strings in Komponenten.

### 15.1 Basiskomponenten — Übersicht

| Komponente | Pfad | Verwendungszweck |
|---|---|---|
| `ListBoardView<T>` | `components/ui/ListBoardView.tsx` | Generische Liste/Board-Oberfläche mit Suche, Filter, View-Toggle, Add-Button |
| `ItemCard` | `components/ui/ItemCard.tsx` | Karte für Board-/Grid-Layout; Slots: `header`, `body`, `footer`, optionaler `accentColor`-Streifen |
| `ItemRow` | `components/ui/ItemRow.tsx` | Zeile für Listen-Layout; Slots: `statusIndicator`, `title`, `description`, `pills`, `meta`, `actions` |
| `FormModal` | `components/ui/FormModal.tsx` | Formular-Modal mit Gradient-Header, Scroll-Body, festem Footer; Props: `title`, `subtitle`, `icon`, `breadcrumb`, `onSubmit`, `saving` |
| `Section` | `components/ui/Section.tsx` | Inhalts-Panel innerhalb von Formularen und Detail-Ansichten; optionaler `title` mit Divider |
| `FormField` | `components/ui/FormField.tsx` | Wrapper für Label + Control + Hint/Error |
| `RadioList` | `components/ui/RadioList.tsx` | Auswahl-Liste für Status- und Typ-Felder in Formularen |
| `Pill` | `components/ui/Pill.tsx` | Kompaktes Status-Label; Tones: `fern \| tangerine \| violet \| crimson \| steel \| mustard` |
| `Badge` | `components/ui/Badge.tsx` | Sekundär-Label; gleiche Tones wie Pill |
| `DetailModal` | `components/ui/DetailModal.tsx` | Vollständige Detail-Ansicht einer Entität |
| `RelationPanel` | `components/ui/RelationPanel.tsx` | Generisches Panel für Relationen zwischen Entitäten |
| `CommentThread` | `components/ui/CommentThread.tsx` | Kommentar-Thread-Darstellung (domänenübergreifend) |
| `EmptyState` | `components/ui/EmptyState.tsx` | Leere Listen-Zustände |

### 15.2 Domänen-Views als dünne Adapter

Jeder Domain-View (`<Domäne>ListBoardView.tsx`) ist ein **dünner Adapter** über `ListBoardView<T>`. Der Adapter:
- Hält UI-State (`mode`, `search`, `filter`)
- Rendert `renderCard` via eine Domain-Card-Komponente (aufgebaut auf `ItemCard`)
- Rendert `renderRow` via `ItemRow`-Komposition
- Übergibt `statusColumns` für Board-Ansichten mit Status-Swim-Lanes
- Öffnet das `<DomainForm />`-Modal bei `onAdd`

```
<DomäneListBoardView>
  └── <ListBoardView<Domäne>>
        ├── renderCard={item => <DomäneCard ... />}   ← aufgebaut auf ItemCard
        └── renderRow={item => <ItemRow ... />}
```

### 15.3 Card-Komposition

Domain-Cards bauen ausschließlich auf `ItemCard` auf — kein eigenes `<article>`-Markup:

```tsx
// Richtig
export function TicketCard({ ticket, onOpen, onEdit, onDelete }: TicketCardProps) {
  return (
    <ItemCard
      accentColor={severityAccentColor(ticket.severity)}
      onOpen={onOpen}
      onEdit={onEdit}
      onDelete={onDelete}
      header={<><h3 className="...">{ticket.title}</h3><Pill tone={ticketStatusTones[ticket.status]}>{ticketStatusLabels[ticket.status]}</Pill></>}
      body={ticket.description ? <p className="text-sm text-slate-500">{ticket.description}</p> : undefined}
      footer={<div className="flex gap-2">...</div>}
    />
  );
}
```

### 15.4 Formular-Komposition

Domain-Formulare bauen ausschließlich auf `FormModal` + `Section` + `FormField` + `RadioList` auf:

```tsx
export function TicketForm({ open, ticket, onSubmit, onClose }: TicketFormProps) {
  return (
    <FormModal open={open} title="Ticket" icon={<Bug size={20} />} onSubmit={handleSubmit} saving={saving} onClose={onClose}>
      <Section title="Allgemein">
        <FormField label="Titel" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </FormField>
        <FormField label="Typ">
          <RadioList items={ticketTypeItems} value={type} onChange={setType} />
        </FormField>
      </Section>
      <Section title="Details">
        <FormField label="Schweregrad">
          <RadioList items={ticketSeverityItems} value={severity} onChange={setSeverity} />
        </FormField>
      </Section>
    </FormModal>
  );
}
```

### 15.5 domainLabels.ts — Single Source of Truth für Labels

**Alle** deutschen UI-Labels und Tone-Zuweisungen für Status, Typ, Schweregrad, Priorität etc. gehören in `src/utils/domainLabels.ts` — **nicht** als lokale Konstanten in Komponenten oder Formularen.

Vorhandene Exports (Stand Codebase):
- `projectStatusLabels` / `projectStatusTones` (`PillTone`)
- `featureStatusLabels` / `featureStatusTones` (`PillTone`)
- `taskStatusLabels` / `taskStatusTones` (`PillTone`)
- `backlogStatusLabels` / `backlogStatusTones` (`PillTone`)
- `priorityLabels` / `priorityPillTones` / `priorityBadgeTones` (`PillTone` und `BadgeTone`)

Neue Domänen müssen ihre Label- und Tone-Maps hier ergänzen, bevor Komponenten geschrieben werden. Beispiel Tickets:

```ts
export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Offen", in_progress: "In Arbeit", in_review: "Im Review", resolved: "Gelöst", closed: "Geschlossen"
};
export const ticketStatusTones: Record<TicketStatus, PillTone> = {
  open: "steel", in_progress: "tangerine", in_review: "violet", resolved: "fern", closed: "fern"
};
export const ticketTypeLabels: Record<TicketType, string> = {
  bug: "Bug", improvement: "Verbesserung", question: "Frage", task: "Aufgabe"
};
export const ticketTypeTones: Record<TicketType, BadgeTone> = {
  bug: "crimson", improvement: "fern", question: "mustard", task: "steel"
};
export const ticketSeverityLabels: Record<TicketSeverity, string> = {
  low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch"
};
export const ticketSeverityTones: Record<TicketSeverity, PillTone> = {
  low: "steel", medium: "mustard", high: "tangerine", critical: "crimson"
};
```

> **Hinweis:** Ältere Komponenten (z. B. `TaskForm.tsx`) definieren Status-/Prioritäts-Arrays noch lokal. Bei Überarbeitungen sollen diese Arrays durch Importe aus `domainLabels.ts` ersetzt werden.

### 15.6 Styling-Prinzipien

- Tailwind-Utility-Klassen — ausschließlich vorhandene Design-Tokens aus der App (`bg-shell`, `border-line`, `text-ink`, `shadow-panel`, `rounded-xl`, `rounded-2xl` usw.)
- Keine neuen Farb- oder Shadow-Klassen ohne Abstimmung
- Kein Inline-CSS außer für `accentColor`-Streifen (RGB-Wert aus Entitätsdaten)
- Icons aus `lucide-react` — konsistente Größen: `size={16}` für Buttons, `size={20}` für Modal-Icons, `size={17}` für Primär-Aktionen

### 15.7 Abnahme-Checkliste für neue UI-Komponenten

Vor dem Commit einer neuen Domain-View oder eines Formulars prüfen:

- [ ] Kein eigenes Card-Markup — ausschließlich `ItemCard` oder `ItemRow`
- [ ] Kein eigenes Modal/Formular-Markup — ausschließlich `FormModal` + `Section` + `FormField`
- [ ] Alle deutschen Labels aus `domainLabels.ts` importiert — keine Inline-Strings für Status/Typ/Schweregrad
- [ ] `Pill`/`Badge`-Tones aus `domainLabels.ts`-Maps bezogen
- [ ] Domain-View ist ein dünner Adapter über `ListBoardView<T>` — kein eigenes Such-/Filter-/Toggle-Markup
- [ ] Keine neuen Tailwind-Klassen, die es in der App noch nicht gibt
- [ ] Kein `any` in Props

### 15.8 Browser-Tab-Konvention für Views und Detailformulare

Hauptansichten der Sidebar (`/projects`, `/tickets`, `/features`, `/wiki`, `/calendar`) erhalten einen `ExternalLink`-Icon-Button, der die Route per `window.open(path, "_blank")` in einem neuen Browser-Tab öffnet. Der Button verhindert die normale Link-Navigation mit `preventDefault()` und `stopPropagation()`.

Detailformulare erhalten ein optionales Prop `onOpenInTab?: () => void`. Dieses Prop wird nur im Edit-Modus mit gültiger Entity-ID gesetzt. Create-Modi setzen das Prop nicht, damit keine URL ohne ID geöffnet werden kann. Die neue Tab-URL ist immer die saubere Entity-Route ohne `returnTo`; danach navigiert der aktuelle Tab zur bestehenden Rücksprungroute.

---

## 16. Journal-Architektur (verbindlich)

Das Journal ist die verbindliche Anwender-Chronik für Änderungen an fachlichen Domänenobjekten und bearbeitbaren Support-Objekten. Jede spätere Erweiterung, die neue Objekte erstellt, ändert, löscht, verknüpft oder trennt, muss das Journal im Plan und in der Umsetzung ausdrücklich berücksichtigen.

### 16.1 Anwendernutzen vor Technik

Journal-Einträge müssen aus Sicht des Anwenders aussagekräftig sein. Generische Meldungen wie „Termin wurde geändert“ sind unzulässig. Richtig ist eine konkrete Aussage mit Objekt, Feld und Wertänderung, zum Beispiel: „Termin "Planung" hat ein neues Enddatum: 31.05.26 → 15.06.26.“

Für Updates gilt:
- geänderte Felder mit fachlichen Labels protokollieren,
- alte und neue Werte menschenlesbar formatieren,
- Datumswerte als `dd.MM.yy` oder `dd.MM.yy HH:mm` anzeigen,
- Status, Prioritäten und Typen mit deutschen Labels ausgeben,
- große Inhalte nicht vollständig speichern, sondern als sinnvolle Zusammenfassung, zum Beispiel Zeichenanzahl oder kurzer Auszug.

### 16.2 Backend-Einbindung

Neue journalisierte Objekte werden in `packages/shared-types/src/index.ts` in `JOURNAL_OBJECT_TYPES` ergänzt. Neue Operationen oder Kontextarten dürfen nur ergänzt werden, wenn die bestehende Semantik `create`, `update`, `delete`, `link`, `unlink` beziehungsweise `self`, `owner`, `parent`, `related` nicht ausreicht.

Mutierende Services nutzen `recordJournalEntry` aus `apps/api/src/services/journal.service.ts`. Route-Handler übergeben den Akteur mit `createJournalActor(request.currentUser)`. Route-Handler enthalten keine eigene Journal-Logik.

Für jedes journalisierte Objekt gilt:
- `objectType`, `objectId` und `objectLabel` müssen das tatsächlich betroffene Objekt bezeichnen,
- `contexts` müssen mindestens das Objekt selbst indirekt über `recordJournalEntry` und bei Unterobjekten den fachlichen Träger als `owner`, `parent` oder `related` enthalten,
- Update-Operationen verwenden `buildJournalChanges` oder eine gleichwertige strukturierte Änderungsliste,
- Create/Delete/Link/Unlink verwenden sprechende Summary-Builder oder fachlich gleichwertige eigene Zusammenfassungen,
- Journal-Schreibvorgang und fachliche DB-Mutation sollen in derselben Transaktion liegen, sofern keine Dateioperation diesen Ablauf technisch verhindert.

### 16.3 Frontend-Einbindung

Das globale Journal bleibt über `/journal` erreichbar und wird in der Sidebar nur angezeigt, wenn `useAuth` beziehungsweise `useHasPermission("journal", "read")` Leserecht bestätigt. Neue geschützte Journal-Views dürfen nicht nur auf Frontend-Gating vertrauen; die API-Permission `journal:read` bleibt maßgeblich.

Neue Detailseiten oder Detailformulare für journalisierte Objekte erhalten ein objektbezogenes Journal:
- API-Zugriff ausschließlich über `apps/web/src/api/journal.ts`,
- Server-State ausschließlich über `useJournalEntries` oder `useObjectJournalEntries`,
- Query-Keys ausschließlich über `queryKeys.journal`,
- Anzeige über `JournalPanel` oder eine bewusst begründete Erweiterung davon,
- Journal-Tabs oder -Abschnitte nur im Edit-/Detailmodus mit gültiger Objekt-ID anzeigen.

### 16.4 Tests für spätere Erweiterungen

Jede neue journalisierte Domäne oder jedes neue Support-Objekt benötigt Tests auf drei Ebenen:
- Unit-Test für Formatierung oder Summary-Builder, wenn neue Feldformatierung, Objektlabels oder Sonderwerte eingeführt werden,
- API-Integrationstest, der mindestens Create oder Update ausführt und anschließend globales sowie objektbezogenes Journal prüft,
- Rollen-/Berechtigungstest für `journal:read`, sofern neue Routen oder Views betroffen sind,
- Web- oder Browser-Test, wenn eine neue Detailansicht ein Objekt-Journal anzeigt.

Akzeptanzkriterium: Ein Test muss mindestens eine fachliche Aussage prüfen, nicht nur die Existenz eines Journal-Eintrags.

---

## Plan-Aktualisierung im Plan-Modus

Wenn nach der Formulierung eines Plans weitere Informationen, Korrekturen oder Ergänzungen gegeben werden, muss **immer ein vollständig neuer Plan** gepostet werden.

- Der neue Plan ersetzt den vorherigen vollständig.
- Kein komprimierter, diff-artiger oder gekürzter Plan.
- Der aktualisierte Plan muss alle Schritte enthalten — auch die unveränderten.

**Begründung:** Ein vollständiger Plan stellt sicher, dass der Arbeitsauftrag in sich geschlossen und ohne Rückgriff auf frühere Nachrichten ausführbar ist.

