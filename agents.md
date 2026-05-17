# agents.md – Taskmanager

Codex ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht Codex die Umsetzung kontrolliert ab und dokumentiert den Blocker.

Diese Datei `agents.md` ist die maßgebliche Arbeitsanweisung im Repository. Verweise auf `AGENTS.md` sind als Verweis auf diese Datei zu verstehen.

---

## 0. Auftragsklassifikation (Pflicht vor jedem weiteren Schritt)

Vor jeder weiteren Aktion klassifiziert Codex den Auftrag in genau eine der folgenden Klassen:

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

Codex dokumentiert zu Beginn kurz:
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

**Schnellcheck vor jedem Task:**

| Situation | Dokument nötig? |
|---|---|
| Reine Frage, kein Code | Nein |
| Git-Operation ohne Codeänderung | Nein |
| Isolierter Fix in einer Datei | Nur direkt betroffene Abschnitte |
| Neuer Endpunkt / Schichtenänderung | Relevante API- und Schema-Abschnitte gezielt |
| Neues Feature über mehrere Schichten | `agents.md` + relevante `docs/`-Abschnitte gezielt |
| Unklare Zuordnung | Gezielt erweitern — nicht raten |

Codex dokumentiert kurz, welche Abschnitte gelesen wurden und warum diese Auswahl genügt.

---

## 2. Analyse vor der Umsetzung (Pflicht, aber klein starten)

Bevor Änderungen vorgenommen werden, startet Codex die Analyse **immer klein und auftragsnah**.

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

### 3.1 Branch-Nutzung (nur bei explizitem Nutzerwunsch)

Codex fragt nicht aktiv nach einem Branch. Ein Branch wird nur angelegt, wenn der Nutzer dies ausdrücklich verlangt oder das Kurzkommando `branch <name>` verwendet.

Delegiert der Nutzer die Namenswahl an Codex, wählt Codex selbst einen kurzen, auftragsbezogenen Namen. Git-Aktionen werden ausschließlich **seriell** ausgeführt.

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

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Weitet sich der Eingriff während der Analyse aus, muss Codex die Ausweitung vorab benennen.

### 3.4 Kurzkommandos

| Kommando | Wirkung |
|---|---|
| `branch <name>` | Branch von `main` anlegen, Remote-Tracking einrichten, sofort pushen |
| `plan` | Auftrag klassifizieren → Analyse → Plan ausgeben, ohne Branch-Rückfrage |
| `audit` | Vollen Audit gemäß Abschnitt 12 als reinen Report-Auftrag ausführen |
| `test` / `Test` | Alle verfügbaren Tests ausführen; bei möglicher State- oder Daten-Vermischung seriell ausführen; anschließend Anzahl der ausgeführten, grünen und roten Tests berichten |
| `log <kurztitel>` | Schritt-Log manuell auslösen (ergänzt automatisches Log) |
| `save` | Alle offenen Änderungen stagen, eine sinnvolle Commit-Message wählen, alles committen und auf den aktuellen Branch pushen |

---

## 4. Umsetzungsregeln

### 4.1 Serielle Ausführung (Pflicht)

Alle Kommandos — Git, Tests, Builds, Migrationen — werden ausschließlich **seriell** ausgeführt. Kein paralleles Starten mehrerer Prozesse.

### 4.2 Keine spekulativen Änderungen

Codex ändert nur, was im Auftrag oder im bestätigten Plan steht. Keine Refactorings, Umbenennungen, Strukturänderungen oder Verbesserungen „nebenbei", ohne dass der Auftrag dies verlangt.

### 4.3 Keine Regressions-Fixes während Tests

Schlägt ein Test fehl, dokumentiert Codex den Fehler. Eigenständige Fixes während eines laufenden Testlaufs sind unzulässig. Fixes erfolgen erst nach einem separaten Folgeauftrag.

### 4.4 Blocker-Verhalten

Bei Unklarheiten, Widersprüchen oder technischen Blockern bricht Codex die Umsetzung kontrolliert ab. Der Blocker wird konkret dokumentiert: was fehlt, warum die Umsetzung nicht sicher möglich ist, welche Informationen benötigt werden.

---

## 5. Schritt-Log (Pflicht nach jeder Teilaufgabe)

Nach jeder abgeschlossenen Teilaufgabe schreibt Codex **automatisch und ohne Rückfrage** einen Log-Eintrag. Das gilt für jeden nummerierten Implementierungsschritt aus dem Großauftrag sowie für jeden eigenständigen Änderungsauftrag der Klassen 4 und 5.

### 5.1 Dateiname und Ablageort

```
logs/YYYY-MM-DD-schritt-<N>-<kurztitel-kebab-case>.md
```

Beispiele:
- `logs/2026-05-17-schritt-02-schema-migration.md`
- `logs/2026-05-17-schritt-05-notizen-api.md`
- `logs/2026-05-18-fix-kanban-position.md`

Der Ordner `logs/` liegt im Repo-Root. Er wird beim ersten Log automatisch angelegt, falls er noch nicht existiert. `logs/` ist in `.gitignore` **nicht** eingetragen — Logs sind Teil des Repos.

### 5.2 Pflichtinhalt jedes Log-Eintrags

```markdown
# Log: <Kurztitel>

**Datum:** DD.MM.YY  
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

### 5.3 Wann gilt eine Teilaufgabe als abgeschlossen?

Eine Teilaufgabe gilt als abgeschlossen, wenn:
- der Code fehlerfrei kompiliert,
- der Schritt das beschriebene Ziel aus dem Plan/Großauftrag erfüllt,
- keine bekannten Blocker offen sind.

Kann eine Teilaufgabe nur teilweise umgesetzt werden, wird der Log mit Status `⚠️ Teilweise abgeschlossen` geschrieben und der Blocker konkret dokumentiert. Auch in diesem Fall wird der Log **sofort geschrieben** — nicht erst nach Lösung des Blockers.

### 5.4 Log-Index pflegen

Codex pflegt zusätzlich eine Datei `logs/README.md` als chronologische Übersicht:

```markdown
# Log-Übersicht Taskmanager

| Datum | Schritt | Kurztitel | Status |
|---|---|---|---|
| 17.05.26 | 2 | Schema & Migration | ✅ |
| 17.05.26 | 3 | Fastify-Backend Basis | ✅ |
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

### Drizzle ORM

- Keine rohen SQL-Strings außer für unvermeidbare SQLite-spezifische Ausdrücke
- Alle Schema-Änderungen gehen über neue Migrations-Dateien — kein `drizzle-kit push` in der regulären Arbeit
- `db/client.ts` als einziger Einstiegspunkt für die Drizzle-Instanz

### React / Frontend

- Keine `useEffect`-Ketten für Datenabruf — Datenabruf in custom Hooks
- Keine Business-Logik in Komponenten — Logik in Hooks oder `src/api/`
- Keine direkte `fetch`-Nutzung in Komponenten — immer über `src/api/`-Funktionen
- Kein `any` in Props-Definitionen

---

## 7. Projektstruktur (Referenz)

```
taskmanager/
├── agents.md              ← diese Datei
├── logs/                  ← Schritt-Logs (automatisch, Abschnitt 5)
│   └── README.md
├── docs/                  ← Architektur- und Implementierungsdokumentation
├── apps/
│   ├── api/               ← Fastify + Drizzle + SQLite
│   └── web/               ← Vite + React
└── packages/
    └── shared-types/      ← gemeinsame TypeScript-Interfaces
```

Der Großauftrag (`Codex_Grossauftrag_Taskmanager.md`) ist der fachliche Ausgangspunkt. Er beschreibt Schema, API-Endpunkte, Komponentenstruktur und die 17 Implementierungsschritte.

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

Eine Schemaänderung gilt erst als abgeschlossen, wenn die Migration erfolgreich gelaufen ist. Schlägt die Migration fehl, darf Codex den Schritt nicht als abgeschlossen melden.

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

Zulässige `error`-Werte: `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `INTERNAL_ERROR`.

---

## 10. Deployment & Start

### Startup-Befehle

```bash
npm run dev        # startet api + web parallel via concurrently
npm run dev -w apps/api   # nur Backend (Port 3001)
npm run dev -w apps/web   # nur Frontend (Port 5173)
```

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

### Testebenen

**Unit** — isolierte Logik, keine echte DB-Verbindung, keine Dateisystem-Zugriffe außer `os.tmpdir()`.

**Integration** — reale SQLite-Datei (In-Memory oder Temp-Datei), echte Fastify-App, Supertest für HTTP-Requests.

**E2E** — wird später ergänzt (Playwright), sobald das Frontend stabil ist.

### Bekannte Kommandos (wachsen mit dem Projekt)

```bash
npm run test              # alle Tests (root, delegiert an workspaces)
npm run test -w apps/api  # nur API-Tests
```

### Grundregeln

- Jeder Test muss einen beobachtbaren Effekt prüfen — keine reinen Sichtbarkeitsprüfungen
- Leere Tests, Platzhaltertests und Tests ohne fachliche Assertion sind unzulässig. `test.skip`, `it.skip`, `describe.skip` oder leere Testkörper dürfen nur verwendet werden, wenn der Nutzer dies ausdrücklich beauftragt oder ein konkreter Blocker im Log dokumentiert wird; sie zählen nie als implementierte Tests.
- Wenn ein Test noch nicht sicher implementierbar ist, wird kein leeres Testgerüst committed. Stattdessen wird die fehlende Testabdeckung als offener Punkt im Log dokumentiert.
- Keine Direktzugriffe auf die Produktions-SQLite-Datei in Tests
- Alle Tests mit DB-Bezug verwenden ausschließlich In-Memory-, Temp- oder `.test-runtime`-Datenbanken; Testläufe dürfen nie `apps/api/data/` verwenden.
- Alle Tests mit Dateisystembezug verwenden ausschließlich Temp- oder `.test-runtime`-Verzeichnisse; Testläufe dürfen nie `apps/api/uploads/`, `apps/api/content/` oder `apps/api/backups/` verwenden.
- Integrationstests verwenden eine eigene Temp-DB, die vor/nach dem Test angelegt und gelöscht wird
- Schlägt ein Test fehl, dokumentiert Codex den Fehler und nimmt keine eigenständigen Fixes vor

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

### Voller Testlauf umfasst (Platzhalter)

- `npm run test -w apps/api`
- _(E2E wird ergänzt)_

### Voller Audit umfasst (Platzhalter)

- `npm run lint`
- `npm run build`
- _(weitere Prüfungen werden ergänzt)_

Nach Ausführung muss Codex explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte und welche noch nicht verfügbar sind.

---

## 13. Abschluss-Workflow

Nach Fertigstellung eines Auftrags richtet sich der Abschluss nach der gewählten Auftragsklasse.

**Für Klasse 1 (reine Frage):** Antwort liefern, Abschlussprüfung aus 13.4.

**Für Klasse 2 (Report):** Report liefern, kein automatischer Log.

**Für Klasse 3 (Git-Operation):** Git-Ergebnis berichten, kein Log.

**Für Klasse 4 und 5 (Änderungsauftrag):**

### 13.1 Schritt-Log schreiben (automatisch, keine Rückfrage)

Codex schreibt den Log-Eintrag gemäß Abschnitt 5 **immer** — ohne Rückfrage, ohne Nutzerbestätigung. Das ist kein optionaler Schritt.

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

Codex prüft das Ergebnis gegen:
- den Aufgabentext inkl. Ziel und Akzeptanzkriterien,
- die Implementierungsvorgaben aus dem Großauftrag,
- die gewählte Auftragsklasse.

Codex nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt und der Schritt-Log geschrieben ist. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Blocker im Log sauber dokumentiert ist.

---

## Plan-Aktualisierung im Plan-Modus

Wenn nach der Formulierung eines Plans weitere Informationen, Korrekturen oder Ergänzungen gegeben werden, muss **immer ein vollständig neuer Plan** gepostet werden.

- Der neue Plan ersetzt den vorherigen vollständig.
- Kein komprimierter, diff-artiger oder gekürzter Plan.
- Der aktualisierte Plan muss alle Schritte enthalten — auch die unveränderten.

**Begründung:** Ein vollständiger Plan stellt sicher, dass der Arbeitsauftrag in sich geschlossen und ohne Rückgriff auf frühere Nachrichten ausführbar ist.
