# Codex-Aufgabe: Repository Foundation und API-Kontrakte

## Aufgabenbeschreibung
Lege die Grundlage für den Repository-Layer und die strikte Optimistic-Locking-API. Ziel ist eine gemeinsame Basis, damit die nachfolgenden Service-Migrationen einheitlich `version`, `expectedVersion`, `createdBy`, `updatedBy` und 409-Konflikte behandeln.

Diese Aufgabe führt noch nicht alle Domain-Services vollständig auf Repositories um.

## Scope
Betroffen sind:
- `apps/api/src/repositories/`
- `apps/api/src/utils/errors.ts`
- `packages/shared-types/src/index.ts`
- zentrale Route-Schemas unter `apps/api/src/utils/`
- ausgewählte Tests für Fehlerformat und Version-Konflikte

Abhängigkeiten:
- Aufgabe 02 abgeschlossen, damit `version`, `created_by` und `updated_by` im Schema existieren.

Nicht im Scope:
- Vollständige Migration aller Services.
- Comment- und Attachment-Junction-Umbau, sofern nicht bereits erledigt.
- UI-Anpassungen für Konfliktauflösung.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `repositories/` | Verzeichnis fehlt oder ist unvollständig | `base.repository.ts` und Repository-Konventionen vorhanden |
| `utils/errors.ts` | App-Fehlerformat vorhanden | Version-Konflikte werden als 409 gemappt |
| Shared Types | Update-Typen enthalten kein `expectedVersion` | Update-Inputs haben versionierte Varianten |
| Route-Schemas | Update-Body-Schemas verlangen keine Version | Reusable `expectedVersion`-Schema verfügbar |
| Tests | Konfliktfälle nicht zentral abgesichert | 409-Format für Version-Konflikte getestet |

Dokumentiere außerdem:
- Welche Entity-Update-Typen angepasst werden müssen.
- Welche späteren Aufgaben konkrete Repositories anlegen oder erweitern.
- Welche Repositories in dieser Aufgabe nur als leere Zielkonvention dokumentiert werden.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

Keine Schema- oder Migrationsänderung in dieser Aufgabe.

Wenn `version` oder Audit-Felder fehlen, abbrechen und auf Aufgabe 02 verweisen.

---

## Schritt 3: Repository

- Lege `apps/api/src/repositories/base.repository.ts` an.
- Implementiere:
  - `VersionConflictError`
  - `assertVersion(current, expected)`
  - gemeinsame Typen oder Hilfsfunktionen für versionierte Updates, soweit lokal sinnvoll
- Lege nur dann konkrete Repository-Dateien an, wenn sie für Foundation-Tests zwingend benötigt werden.
- Definiere die Zielkonvention für konkrete Repositories:
  - `findById(db, id)`
  - `findAll(db)`
  - `create(db, data, userId?)`
  - `update(db, id, expectedVersion, data, userId?)`
  - `delete(db, id)`
- Repositories inkrementieren `version` bei jedem Update.
- Repositories setzen `updated_by` und `updated_at` bei jedem Update.
- Repositories setzen `version = 1`, `created_by` und `updated_by` bei Create.

---

## Schritt 4: Service

- Ergänze eine zentrale Hilfsfunktion oder ein klares Pattern, mit dem Services `VersionConflictError` in `conflict(...)` bzw. HTTP 409 übersetzen.
- Services fangen Version-Konflikte nicht als generische Fehler ab.
- Keine Business-Logik in Repositories verschieben.

---

## Schritt 5: Route

- Ergänze wiederverwendbare Request-Schema-Bausteine für `expectedVersion`.
- Definiere als verbindlichen API-Kontrakt:
  - Jede updatefähige Entity-Update-Route verlangt `expectedVersion`.
  - Bei fehlender `expectedVersion` liefert Fastify-Validierung 400.
  - Bei veralteter `expectedVersion` liefert die API 409 im bestehenden Fehlerformat.
- Passe Shared Types so an, dass Update-Inputs die Versionierung ausdrücken können.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

Ergänze Tests für:
- `assertVersion` akzeptiert gleiche Version.
- `assertVersion` wirft `VersionConflictError` bei abweichender Version.
- Version-Konflikt wird als `{ error: "CONFLICT", statusCode: 409 }` gemappt.
- Route-Schema lehnt Update ohne `expectedVersion` ab, falls eine kleine Test-Route oder bestehende Route in dieser Aufgabe angepasst wird.

Führe seriell aus:
- `npm run test -w apps/api`

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] `apps/api/src/repositories/base.repository.ts` existiert
- [ ] `VersionConflictError` existiert
- [ ] `assertVersion` ist getestet
- [ ] 409-Mapping für Version-Konflikte ist getestet
- [ ] Wiederverwendbares `expectedVersion`-Schema oder Pattern ist dokumentiert
- [ ] Shared Types enthalten eine klare Grundlage für versionierte Updates
- [ ] Keine vollständige Domain-Service-Migration wurde in diese Aufgabe hineingezogen
- [ ] API-Tests laufen grün oder Blocker sind dokumentiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Repository-Zielordner: `apps/api/src/repositories/`
- Fehlerformat: `apps/api/src/utils/errors.ts`
- Route-Schemas: `apps/api/src/utils/route-schemas.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- API-Tests: `apps/api/src/**/*.test.ts`, `apps/api/tests/integration/`
