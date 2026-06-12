# Bauplan: test-entwurfsleitplanken

## Zweck

Testentwurfs-Gate für das Repository. Wird angewendet bevor Tests entworfen, geschrieben, geändert oder bewertet werden — stellt sicher, dass Tests echtes Verhalten beweisen statt auf großzügige Mocks zu vertrauen. Ergänzt den `planungsleitplanken`-Skill; `agents.md` bleibt die verbindliche Quelle.

## Trigger

IMMER verwenden wenn der Agent Tests plant, schreibt, ändert, bewertet oder ausführt. Auslöser: „Testsuite", „Testabdeckung", „Integrationstest", „E2E", „Fixtures", „Testdaten", „Datenbankisolation", „Mock-Entscheidung", „Berechtigungstest", „Abnahmekriterien". Gilt auch bei indirekter Testberührung durch Code-Änderungen (→ `agents.md` §4.4).

## Verhältnis zu anderen Skills

- `planungsleitplanken` → übergeordnetes Planungs-Gate, läuft zuerst
- `test-entwurfsleitplanken` → spezialisiertes Gate für den Testentwurf, läuft zusätzlich
- `agents.md` §11 und §12 → verbindliche Teststrategie und Testkommandos

## Grundsatz

Ein Test muss eine fachliche oder technische Funktion beweisen. Aussagekraft und Sicherungscharakter haben Vorrang vor Bequemlichkeit und kurzer Implementierungszeit.

Ein Test ist nur tragfähig wenn er:
- einen echten Ausgangszustand aufbaut
- eine reale Aktion ausführt
- ein beobachtbares Ergebnis prüft
- relevante Negativ- oder Gegenbeispiele enthält
- keine produktiven Daten, Uploads, Inhalte oder Backups berührt
- seine Testebene ehrlich benennt

## Pflichtablauf vor dem Testentwurf

1. Testebene festlegen: Unit, Integration oder Browser/E2E
2. Zu beweisendes Verhalten in einem Satz: Ausgangszustand → Aktion → erwartetes Ergebnis
3. Echte Objekte und Daten bestimmen die für den Beweis nötig sind
4. Mock-Entscheidung treffen und begründen
5. Isolation festlegen: Temp-DB, In-Memory-DB, `tests/.runtime` oder Temp-Root
6. Positive Fälle, Negativfälle, Berechtigungsfälle, Konfliktfälle benennen
7. Prüfen ob der Test nur Sichtbarkeit oder Implementierungsdetails testet — falls ja, Testziel verschärfen oder verwerfen

## Mock-Regeln

### Unit-Tests
Mocks erlaubt für: externe Seiteneffekte (Netzwerk, Uhrzeit, Zufall, Dateizugriff), klar begrenzte Collaborators, Fehlerdoubles für seltene Fehlerpfade. Keine Wunschzustände vortäuschen die im echten System nicht entstehen können.

### Integrationstests
Keine Mocks. Echte Objekte, echte Daten, echte Services, Repositories, DB-Clients, Auth-Hooks und API-Antworten. Einzige Ausnahme: technisch nötiger Parameter ohne nachweislichen Einfluss auf die geprüfte Funktion — muss im Testkommentar explizit stehen. Ist ein Mock unvermeidlich → kein Integrationstest, Blocker dokumentieren.

### Browser/E2E-Tests
Echte Browserinteraktion, echte Routen, echte API-Antworten aus isolierter Testinstanz, echte Testdaten. Keine gestubbten UI-Hooks, API-Clients oder Berechtigungen.

## Daten- und Dateisystem-Isolation

**Datenbank:**
- Nie `apps/api/data/` oder produktive SQLite-Dateien
- Temp-DB, In-Memory-DB oder `tests/.runtime`
- Schema/Migrationen passend zum Produktivcode initialisieren
- Zuverlässiges Cleanup vor/nach dem Test
- Gegenbeispiele explizit anlegen — nicht nur positive Treffer prüfen

**Dateisystem:**
- Echtes Dateisystem, eindeutiger Temp-Root pro Test/Suite
- Nie `apps/api/uploads/`, `apps/api/content/`, `apps/api/backups/`
- Dateien, Verzeichnisse, Kollisionen und Löschpfade real prüfen
- Robustes Cleanup

## Aussagekräftige Assertions

**Gut:** HTTP-Status + Fehlerformat + persistierter DB-Zustand, erzeugte/geänderte/gelöschte Dateien im Temp-Root, Rollen-/Permission-Wirkung mit echten Usern und Sessions, Versionskonflikte mit echter aktueller und veralteter Version.

**Schwach (vermeiden):** nur Element vorhanden, nur Mock-Aufruf ausgelöst, Snapshot ohne fachliche Aussage, Filtertest nur mit positiven Treffern, Permission-Test mit gestubbtem `useAuth`, Integrationstest mit gemocktem Repository.

## Datengetriebene Tests

Mengen, Filter, Suchen, Sortierung, Berechtigungsgrenzen und Statuslogik brauchen immer Gegenbeispiele:
- Datensätze die enthalten sein müssen
- Datensätze die ausgeschlossen sein müssen
- Einen Randfall (leer, anderer Status, andere Rolle, anderer Owner)
- Assertion auf die komplette Ergebnismenge — nicht nur auf einzelne Elemente

## Auth, Rollen und Permissions

Geschützte Workflows mit echten Berechtigungsdaten testen. Mindestpflicht:
- Erlaubter Zugriff mit passender Permission
- Abgelehnter Zugriff ohne ausreichende Permission
- Bei Schreiboperationen: Reader- oder Custom-Role-Negativfall
- Bei UI-Flows: unzulässige Aktionen nicht angeboten oder serverseitig `FORBIDDEN`

Frontend-Gating ersetzt nie die API-Prüfung.

## Pflichtkommentar in Testdateien

```ts
/**
 * Test Scope:
 *
 * Test-Ebene:
 * - <Unit | Integration | Browser/E2E>
 *
 * Realitätsgrad:
 * - <echte App/DB/FS/API/User/Rollen oder begründete Abgrenzung>
 *
 * Mock-Entscheidung:
 * - <keine Mocks | Unit-Mocks: ... | Ausnahme ohne Einfluss: ...>
 *
 * Isolation:
 * - <Temp-DB/In-Memory-DB/tests/.runtime/Temp-Root>
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

## Plan-Checkliste

Jeder Testplan benennt konkret:
- Welches Verhalten bewiesen wird
- Welche Testebene verwendet wird
- Welche echten Objekte und Daten beteiligt sind
- Welche Mocks nicht verwendet werden dürfen
- Welche Negativ- und Randfälle nötig sind
- Wie DB- oder FS-Isolation hergestellt wird
- Welche Rollen- und Permission-Fälle betroffen sind
- Welches beobachtbare Ergebnis die Abnahme trägt

Wenn diese Punkte nicht beantwortbar sind: nicht raten — Blocker dokumentieren.

## Implementierungshinweise für den Skill-Bau

- Skill liegt unter `.claude/skills/test-entwurfsleitplanken/` (Claude-konform). Frühere OpenAI-Codex-Quelle am 2026-06-12 entfernt — Repo ist Claude-only.
- Trigger weit formulieren: greift auch bei indirekter Testberührung durch Code-Änderungen
- Inhalt ist bereits projektspezifisch — kaum Anpassungsbedarf beim Skill-Bau
