---
name: planungsleitplanken
description: >
  Planungs-Gate für das Projekt Manager Repository. IMMER vor jeder Planung verwenden —
  egal ob Feature, Fix, Audit, Test, Branch, Migration, API, Web, Auth, Rollen, UI
  oder Architekturentscheidung. Auslöser: "plan", "plane", "wie gehen wir vor",
  jede Ankündigung einer Umsetzung oder Änderung in diesem Repository.
---

# Planungsleitplanken — Projekt Manager

`agents.md` bleibt die verbindliche Quelle. Bei Widersprüchen gilt `agents.md`; Abweichungen kurz benennen.

## Pflichtablauf

1. Auftrag gemäß `agents.md` §0 klassifizieren (Klasse 1–5)
2. Aktuellen Branch und Working Tree prüfen wenn Änderungen möglich
3. Bei Code-Bezug zuerst Graphify (`graphify query/path/explain`), dann nur benötigte Repo-Abschnitte lesen — erst bei Bedarf erweitern
4. Betroffene Domänen, Schichten, Dateien, API, Datenmodell, Frontend-State, Tests, Logs und Abnahmekriterien identifizieren
5. Explizit entscheiden ob Auth, Rollen, Permissions, Migrationen, Dumps, Fixtures und UI-Regeln betroffen sind
6. Annahmen und Blocker benennen — keine stillen Architektur-, Produkt- oder Scope-Entscheidungen
7. Plan proportional zur Auftragsklasse — Sicherheit, Tests, Datenmigration nie weglassen wenn relevant

## Pflichtfragen vor jedem Plan

- Welche Domäne: Projektmanagement, Dokumentation, Tickets oder Querschnittsinfrastruktur?
- Fachliches Objekt, Support-Objekt, Admin-Konfiguration oder Infrastruktur?
- Welche Routen, Services, Repositories, Shared Types, Migrationen, Web-APIs, Hooks, Komponenten, Seiten?
- Auth, Rollen, Permissions, UI-Gating oder Admin-Verhalten betroffen?
- UI-Visuals, Layout, Styling, Dashboards, Formulare oder Interaktionen betroffen → `docs/design-leitfaden.md` laden
- DB-Migration, Dump-Registry, Truncate-Fixture oder Seed-Änderung nötig?
- Query-Keys, Invalidierung, TanStack-Hooks oder E2E-Setup betroffen?
- Was bleibt bewusst unverändert?
- Was kann kaputtgehen — wie wird das Risiko begrenzt?

## Architektur-Referenz

Tiefergehende Architekturarbeit: `docs/architektur-leitfaden.md` (Datenmodell & Schichten). UI/Design: `docs/design-leitfaden.md`.

**Schichten:**
- Shared Types → `packages/shared-types`
- API-Routen → `apps/api/src/routes` (Validierung + Service-Aufruf, keine Business-Logik)
- Repositories → `apps/api/src/repositories` (CRUD, Versionierung, wiederverwendbare Persistenz)
- Services → `apps/api/src/services` (Business-Regeln, Relationen, Dateien, domänenübergreifend)
- Web-API → `apps/web/src/api`
- Server-State → TanStack Query Hooks, zentrale Query-Keys und Invalidierung

**DB und Migration:**
- Strukturelle Schemaänderung → `schema.ts` + neue Migration + Metadaten + erfolgreicher lokaler Migrationslauf
- Versionierte Objekte → `version`, `expectedVersion` bei Update, Konfliktbehandlung, Tests mit aktueller Version
- Neue Tabellen → Dump-Registry, Test-Truncation, Dump-Roundtrip-Seed

**Frontend-State:**
- `ky` über `src/api/client.ts`
- Zentrale Query-Keys in `src/queries/queryKeys.ts`
- Zentrale Invalidierung in `src/queries/invalidation.ts`
- Kein Server-State via `useEffect`-Ketten

## Auth und Rollen — Referenz

- Neue API-Routen sind standardmäßig authentifizierungspflichtig
- Öffentliche Ausnahmen müssen im Plan benannt und begründet werden (`/health`, `/api/health`, `/api/auth/*`)
- Die API ist die Sicherheitsgrenze — Frontend-Gating ist nur UX-Unterstützung

**Permission-Mapping:**
- Lesende Endpunkte → `read`
- Erstellende/ändernde Endpunkte → `write`
- Löschoperationen → `delete`
- Admin-Endpunkte → domänenspezifische Admin-Permissions (`users:admin`, `roles:admin`)
- Neue Domänen → Permission-Katalog ergänzen

**Pflicht-Prüfungen:**
- Welche Rollen sehen den Navigations-Eintrag?
- Welche Rollen dürfen welche Route aufrufen?
- Welche Buttons/Aktionen sind versteckt, deaktiviert oder forbidden?
- 401- und 403-Pfade vorhanden?

**Pflicht-Tests:**
- Erlaubter Zugriff mit autorisiertem User
- Abgelehnter Zugriff ohne Session
- Abgelehnter Zugriff ohne Permission
- Reader-Negativfall bei Schreib-/Löschworkflows

## Test-Referenz

- Tests beweisen beobachtbares Verhalten — keine leeren Tests, keine Skips ohne dokumentierten Blocker
- Nur Temp- oder `.runtime`-Daten — nie produktive SQLite, Uploads, Content oder Backups

**Pflicht-Abdeckung nach Änderungstyp:**
- API-Route → Auth-Guard, Validierung, Erfolgspfad, relevante Fehlerpfade (400/401/403/404/409), Service-Effekt
- Versioniertes Update → Erfolg mit aktueller `version` + `expectedVersion`; Konflikttest mit veralteter Version
- Schema/Migration → Tabellen-/Spalten-/Index-/FK-Erwartungen + Dump/Truncate-Integration
- Admin-Workflow → geschützte Route, Admin-Erfolg, Non-Admin-Forbidden, Sonderfälle
- Frontend-State → Query-Key, Hook-Verhalten, Mutations-Invalidierung, Fehleranzeige
- E2E → repräsentativer Browser-Flow bei Navigation, Auth oder kritischen Formularen

**Testkommandos (seriell):**
```bash
npm run test -w apps/api
npm run test -w apps/web
npm run e2e -w apps/web
```

## Git-Workflow — Referenz

- Git-Kommandos immer seriell
- `main` nicht anfassen außer bei explizitem Nutzerwunsch
- `git status --short --branch` vor Branch- oder Save-Operationen
- Uncommittete Nutzeränderungen bewahren und benennen

**Kurzkommandos:**
- `branch <name>` → von `main` abzweigen, Remote-Tracking einrichten, sofort pushen
- `save` → alle Änderungen stagen, sinnvoll committen, Branch pushen
- `savetowork` → save, in `work` mergen, Änderungen verifizieren, `work` pushen, Branch-Löschung erst nach expliziter Bestätigung

## UI-Referenz

- `docs/design-leitfaden.md` ist die verbindliche visuelle Design-Quelle für `apps/web`
- Nur relevante Abschnitte laden — nicht vollständig lesen außer bei Architekturarbeit
- Bestehende Komponent- und Layout-Patterns vor neuen bevorzugen
- Neue Navigationseinträge, Buttons und Seiten berücksichtigen Rollen und Permissions aus `useAuth`

## Plan-Checkliste

Vor jedem Plan benennen:
- [ ] Auftragsklasse (1–5)
- [ ] Branch-Strategie (nur bei explizitem Wunsch)
- [ ] Gelesene Dokumente und warum sie ausreichen
- [ ] Betroffene Domäne und Schichten
- [ ] Auth/Rollen/Permissions betroffen?
- [ ] DB-Migration nötig?
- [ ] UI/Design-Leitfaden relevant?
- [ ] Was bleibt unverändert?
- [ ] Risiken und Schadenspotential

## Abnahmekriterien

**Definition of Done:**
- Geplanter Scope implementiert oder Blocker dokumentiert
- Keine unverwandten Refactorings oder Scope-Erweiterungen
- Migrationen, Seed, Fixtures, Dumps und Shared Types enthalten wenn betroffen
- Auth, Rollen und Permission-Effekte implementiert und getestet
- Frontend-State, Invalidierung und Navigation konsistent
- Tests hinzugefügt oder fehlende Abdeckung als Blocker dokumentiert
- Schritt-Log für Klassen 4 und 5

**Plan gilt als akzeptabel wenn erkennbar ist:**
- Was sich ändert
- Warum jede betroffene Schicht angefasst wird
- Welche Workflows betroffen oder bewusst unberührt sind
- Welche Risiken am stärksten wiegen
- Wie die Änderung verifiziert wird

**Abschlussbericht auf Deutsch:**
- Ergebnis, geänderte Dateien/Bereiche, ausgeführte Tests, offene Risiken und Blocker

## Hard-Stop-Bedingungen

Abbrechen und Blocker dokumentieren wenn:
- Scope widerspricht `agents.md`
- Architekturentscheidung nicht spezifiziert und keine sichere lokale Konvention vorhanden
- Plan würde stille unverwandte Nutzeränderungen entfernen oder überschreiben
- Benötigte Task-Datei oder Schema-Quelle fehlt und alle abhängigen Schritte brauchen sie

Bauplan: `docs/skill-documentation/planungsleitplanken.md`
Quelle (Ebene 1): Skill Library `core/planung.md` + `core/graphify-protocol.md` — dort zuerst ändern, dann hier nachziehen.
