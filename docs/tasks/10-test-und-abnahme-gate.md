# Codex-Aufgabe: Test- und Abnahme-Gate Architektur-Refactoring

## Aufgabenbeschreibung
Führe nach Abschluss der Architektur-Refactoring-Aufgaben ein vollständiges Test- und Abnahme-Gate durch. Ziel ist ein belastbarer Nachweis, dass Schema, Repository-Layer, Support-Junctions, Optimistic Locking, API-Kontrakte und Frontend-Flows zusammen funktionieren.

Diese Aufgabe ist ein Prüf- und Stabilisierungsschritt. Fehlgeschlagene Tests werden dokumentiert. Produktionscode-Fixes erfolgen nur, wenn sie als eigener Folgeauftrag bestätigt werden.

## Scope
Betroffen sind:
- alle geänderten API- und Web-Tests
- `apps/api/tests/integration/`
- `apps/web/e2e/`
- root-, API- und Web-Testkommandos
- Build- und Lint-Kommandos, sofern verfügbar
- Abschlussbericht und Schritt-Log

Abhängigkeiten:
- Aufgaben 02 bis 09 abgeschlossen oder explizit als blockiert dokumentiert.

Nicht im Scope:
- Neue Fachfeatures.
- Eigenständige Produktionscode-Fixes während des Testlaufs.
- Neue Migrationen, außer ein bestätigter Folgeauftrag verlangt sie.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann die Logs und Testdateien der vorherigen Aufgaben und erstelle eine Ist/Soll-Tabelle:

| Bereich | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Schema | Ergebnis der Migrationsaufgaben | Keine Leitfaden-Abweichungen |
| Repositories | Ergebnis der Service-Migrationen | Standard-CRUD über Repositories |
| Comments | Ergebnis Junction-Umbau | n:m und Cascade grün |
| Attachments | Ergebnis Junction-Umbau | n:m, Preview und Datei-Cleanup grün |
| API-Kontrakte | Ergebnis Versionierungsaufgaben | Updates verlangen `expectedVersion` |
| Tests | Verfügbare Testabdeckung | Integration und E2E decken Zielmodell ab |

Dokumentiere außerdem:
- Welche Aufgaben vollständig abgeschlossen sind.
- Welche Aufgaben blockiert oder teilweise abgeschlossen sind.
- Welche Tests neu oder geändert wurden.

**Beginne mit dem Testlauf erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

Prüfe:
- Lokale Migrationen laufen vollständig durch.
- Schema enthält keine verbotenen Comment- oder Attachment-Owner-Muster.
- Alle Entity-Tabellen haben Pflichtfelder.
- Junction-Tabellen haben keine Audit- oder Version-Felder.

Führe seriell aus:
- `npm run db:migrate -w apps/api`

---

## Schritt 3: Repository

Prüfe statisch:
- `apps/api/src/repositories/base.repository.ts` existiert.
- Alle im Leitfaden geforderten Entity-Repositories existieren oder eine dokumentierte Ausnahme liegt vor.
- Standard-CRUD für Fach- und Support-Objekte läuft nicht mehr direkt im Service.
- Verbleibende Drizzle-Zugriffe in Services sind als Junction-, Admin- oder Infrastruktur-Ausnahme dokumentiert.

---

## Schritt 4: Service

Prüfe:
- Kein Service nutzt `ensureEntityExists()` als FK-Ersatz.
- Kein Service nutzt manuelle Comment- oder Attachment-Cascade-Funktionen als FK-Ersatz.
- `VersionConflictError` wird als 409 weitergeleitet.
- Business-Logik liegt weiterhin in Services und nicht in Routes.

---

## Schritt 5: Route

Prüfe:
- Alle updatefähigen Routes verlangen `expectedVersion`.
- Fehlende `expectedVersion` liefert 400.
- Veraltete `expectedVersion` liefert 409.
- Bestehende URLs sind erhalten.
- Comment- und Attachment-Responses liefern `owners: [...]`.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

Führe alle Kommandos seriell aus. Ein fehlgeschlagenes Kommando unterbricht den Gesamtlauf nicht.

Pflichtkommandos:
- `npm run test -w apps/api`
- `npm run test -w apps/web`
- `npm run e2e -w apps/web`
- `npm run build`
- `npm run lint`

Berichte je Kommando:
- Status
- Anzahl grün
- Anzahl rot
- Anzahl übersprungen
- Anzahl blockiert
- Infrastrukturfehler getrennt von Testfehlern

Fehlergruppierung:
- Kann durch Test-Fixes gelöst werden
- Muss in Produktionscode gelöst werden

Produktionscode-Fehler werden nach Schweregrad gruppiert:
- Kritisch
- Hoch
- Mittel
- Niedrig

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Migrationen laufen erfolgreich
- [ ] Schema entspricht dem Architektur-Leitfaden
- [ ] Repository-Layer ist vollständig oder dokumentierte Ausnahmen liegen vor
- [ ] Keine verbotenen Owner-Muster bleiben bestehen
- [ ] Keine verbotenen manuellen Cascade-Ersatzfunktionen bleiben bestehen
- [ ] Alle updatefähigen Routes verlangen `expectedVersion`
- [ ] Version-Konflikte liefern 409
- [ ] Comment- und Attachment-DTOs nutzen `owners: [...]`
- [ ] Integration-Tests wurden seriell ausgeführt und berichtet
- [ ] Web-Tests wurden seriell ausgeführt und berichtet
- [ ] E2E-Tests wurden seriell ausgeführt und berichtet
- [ ] Build und Lint wurden seriell ausgeführt und berichtet
- [ ] Alle Fehler sind gruppiert und mit konkreten Folgeaufgaben benannt

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Aufgaben: `docs/tasks/`
- Logs: `logs/`
- Schema: `apps/api/src/db/schema.ts`
- Repositories: `apps/api/src/repositories/`
- Services: `apps/api/src/services/`
- Routes: `apps/api/src/routes/`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
