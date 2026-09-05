---
name: test-entwurfsleitplanken
description: >
  Testentwurfs-Gate für das Projekt Manager Repository. IMMER verwenden wenn Tests
  geplant, geschrieben, geändert, bewertet oder ausgeführt werden. Auslöser:
  Testsuite, Testabdeckung, Integrationstest, E2E, Fixtures, Testdaten,
  Datenbankisolation, Mock-Entscheidung, Berechtigungstest, Abnahmekriterien.
  Gilt auch bei Code-Änderungen die bestehende Tests berühren (agents.md §4.4).
---

# Test-Entwurfsleitplanken — Projekt Manager

`agents.md` bleibt die verbindliche Quelle. Bei Widersprüchen gilt `agents.md`.

## Grundsatz

Ein Test muss eine fachliche oder technische Funktion beweisen. Aussagekraft und Sicherungscharakter haben Vorrang vor Bequemlichkeit und kurzer Implementierungszeit.

Ein Test ist nur tragfähig wenn er:
- einen echten Ausgangszustand aufbaut
- eine reale Aktion ausführt
- ein beobachtbares Ergebnis prüft
- relevante Negativ- oder Gegenbeispiele enthält
- keine produktiven Daten, Uploads, Inhalte oder Backups berührt
- seine Testebene ehrlich benennt

## Schutzregeln

- In einer Code-Test-Fix-Session keinen Produktivcode ändern, der nicht ausdrücklich beauftragt ist.
- Keine vollständigen oder breiten Testläufe ohne ausdrückliche Beauftragung — standardmäßig nur die direkt betroffenen Tests (vgl. `agents.md §13.2`).

## Pflichtablauf vor dem Testentwurf

Bei Code-Bezug zuerst Graphify anwenden (`graphify query` für den geänderten Bereich, `graphify path` zur Persistenz/zum Service), dann:

1. Testebene festlegen: Unit, Integration oder Browser/E2E
2. Zu beweisendes Verhalten in einem Satz: Ausgangszustand → Aktion → erwartetes Ergebnis
3. Echte Objekte und Daten bestimmen die für den Beweis nötig sind
4. Mock-Entscheidung treffen und begründen
5. Isolation festlegen: Temp-DB, In-Memory-DB, `tests/.runtime` oder Temp-Root
6. Positive Fälle, Negativfälle, Berechtigungsfälle und Konfliktfälle benennen
7. Prüfen ob der Test nur Sichtbarkeit oder Implementierungsdetails testet — falls ja, Testziel verschärfen oder verwerfen

## Mock-Regeln

### Unit-Tests
Mocks erlaubt für: externe Seiteneffekte (Netzwerk, Uhrzeit, Zufall, Dateizugriff), klar begrenzte Collaborators, Fehlerdoubles für seltene Fehlerpfade. Keine Wunschzustände vortäuschen die im echten System nicht entstehen können.

### Integrationstests
Keine Mocks. Echte Objekte, echte Daten, echte Services, Repositories, DB-Clients, Auth-Hooks und API-Antworten.

Einzige Ausnahme: technisch nötiger Parameter ohne nachweislichen Einfluss auf die geprüfte Funktion — muss im Testkommentar explizit stehen.

Ist ein Mock unvermeidlich → kein Integrationstest schreiben, Blocker dokumentieren und echte Testinfrastruktur herstellen.

### Browser/E2E-Tests
Echte Browserinteraktion, echte Routen, echte API-Antworten aus isolierter Testinstanz, echte Testdaten. Keine gestubbten UI-Hooks, API-Clients oder Berechtigungen.

## Echte Daten und Isolation

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
- Robustes Cleanup in `afterEach`/`afterAll`

## Aussagekräftige Assertions

**Gut:** HTTP-Status + Fehlerformat + persistierter DB-Zustand, erzeugte/geänderte/gelöschte Dateien im Temp-Root, Rollen-/Permission-Wirkung mit echten Usern und Sessions, Versionskonflikte mit echter aktueller und veralteter Version.

**Schwach (vermeiden):**
- Nur Element vorhanden oder Button sichtbar
- Nur Mock-Aufruf ausgelöst
- Snapshot ohne fachliche Aussage
- Filtertest nur mit positiven Treffern
- Permission-Test mit gestubbtem `useAuth`
- Integrationstest mit gemocktem Repository oder Service
- Testdaten die einen fachlich unmöglichen Zustand herstellen

## Datengetriebene Tests

Mengen, Filter, Suchen, Sortierung, Berechtigungsgrenzen und Statuslogik brauchen immer Gegenbeispiele:
- Datensätze die enthalten sein müssen
- Datensätze die ausgeschlossen sein müssen
- Einen Randfall (leer, anderer Status, andere Rolle, anderer Owner, anderer Zeitraum)
- Assertion auf die komplette Ergebnismenge — nicht nur auf einzelne Elemente

## Auth, Rollen und Permissions

Mindestpflicht für geschützte Workflows:
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

## Plan-Checkliste für Tests

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

Bauplan: `docs/skill-documentation/test-entwurfsleitplanken.md`
Quelle (Ebene 1): Skill Library `dev-testing/testing/01-test-skill.md` + `dev-testing/core/graphify-protocol.md` — dort zuerst ändern, dann hier nachziehen.
