# Bauplan: planungsleitplanken

## Zweck

Planungs-Gate für das Projekt Manager Repository. Stellt sicher, dass vor jeder Planung Architekturentscheidungen, Rollen- und Permission-Regeln, Teststrategie, Branch-Hygiene, UI-Leitplanken und Abnahmekriterien geprüft werden. Ersetzt `agents.md` nicht — bei Widersprüchen gilt `agents.md`.

## Trigger

IMMER verwenden wenn der Agent einen Plan erstellt, überprüft, aktualisiert oder ausführt — egal ob direkt im Chat oder im Plan-Modus. Gilt für Feature-Planung, Fixes, Audits, Tests, Branch-Strategie, Migrationen, API/Web-Änderungen, Auth/Rollen-Entscheidungen, UI-Regeln, Architekturentscheidungen und Abnahmekriterien.

## Verhältnis zu agents.md

`agents.md` ist die maßgebliche Quelle. Dieser Skill ist ein Gate — er stellt sicher, dass die richtigen Abschnitte aus `agents.md`, Task-Dateien und Projekt-Referenzen konsultiert werden. Bei Widersprüchen zwischen Skill und `agents.md` gilt `agents.md`; Abweichungen werden im Chat benannt.

## Referenz-Dateien

Der Skill lädt Referenzen nur wenn sie relevant sind:

| Datei | Wann laden |
|---|---|
| `references/plan-checklist.md` | Immer — bei jedem Feature, Fix, Refactor, Audit, Test |
| `references/architecture.md` | Domänen-, Schichten-, Schema-, Repository- oder Service-Entscheidungen |
| `references/auth-roles.md` | API, Web-Workflow, Navigation, Admin, Permission oder geschützte Daten |
| `references/testing.md` | Testpläne, Fixtures, E2E, Test-Runtime, Abnahmenachweise |
| `references/git-workflow.md` | Branch, save, savetowork, merge, push, Cleanup |
| `references/ui-guidelines.md` | Frontend-Layout, Navigation, Komponenten, Menüs, Interaktionen |
| `docs/design-leitfaden.md` | Visuelle Gestaltung, Dashboards, Seiten, Formulare, Styling |
| `docs/architektur-leitfaden.md` | Tiefergehende Architekturarbeit |

## Planungs-Ablauf (Pflicht)

1. Auftrag gemäß `agents.md` klassifizieren (Klasse 1–5)
2. Aktuellen Branch und Working Tree prüfen wenn Änderungen möglich
3. Nur die benötigten Repo-Abschnitte lesen — erst bei Bedarf erweitern
4. Betroffene Domänen, Schichten, Dateien, API, Datenmodell, Frontend-State, Tests, Logs und Abnahmekriterien identifizieren
5. Explizit entscheiden ob Auth, Rollen, Permissions, Migrationen, Dumps, Fixtures und UI-Regeln betroffen sind
6. Annahmen und Blocker benennen statt still Architektur-, Produkt- oder Scope-Entscheidungen zu treffen
7. Plan proportional zur Auftragsklasse halten — Sicherheit, Tests und Datenmigration nie weglassen wenn relevant

## Plan-Pflichtfragen

Vor jedem Plan beantworten:

- Welche Domäne ist betroffen: Projektmanagement, Dokumentation, Tickets oder Querschnittsinfrastruktur?
- Ist es ein fachliches Objekt, bearbeitbares Support-Objekt, Admin-Konfiguration oder Infrastruktur?
- Welche API-Routen, Services, Repositories, Shared Types, Migrationen, Web-APIs, Hooks, Komponenten und Seiten sind betroffen?
- Erfordert die Änderung Auth, Rollen, Permissions, UI-Gating oder Admin-Verhalten?
- Berührt die Änderung UI-Visuals, Layout, Styling, Dashboards, Formulare oder Interaktionen?
- Ist eine DB-Migration, Dump-Registry-Aktualisierung, Truncate-Fixture oder Seed-Änderung nötig?
- Sind Query-Keys, Invalidierung, TanStack-Hooks oder E2E-Setup-Änderungen nötig?
- Was bleibt bewusst unverändert?
- Was kann kaputtgehen und wie wird das Risiko begrenzt?

## Plan-Ausgabeformat

Ausgabe auf Deutsch. Inhalt gemäß `agents.md` Abschnitt 3.2:

**Klasse 4 (kleiner Fix):** Was geplant ist — betroffene Dateien und Begründung — erwartetes Ergebnis und Risiken.

**Klasse 5 (mehrschichtig / neues Feature):** Was geplant ist — betroffene Funktionen, Komponenten, Dateien mit Begründung — Auswirkungen auf Workflows — Risiken und Schadenspotential — erwartetes Ergebnis mit Abnahmekriterien.

Keine vagen Aussagen wie „Tests hinzufügen" oder „UI aktualisieren" — Testtypen und zu beweisendes Verhalten konkret benennen.

## Hard-Stop-Bedingungen

Plan stoppen und Blocker dokumentieren wenn:

- Der Scope `agents.md` widerspricht
- Eine Architekturentscheidung nicht spezifiziert ist und keine sichere lokale Konvention existiert
- Der Plan stillschweigend unverwandte Nutzeränderungen entfernt oder überschreibt
- Eine benötigte Task-Datei oder Schema-Quelle fehlt und alle abhängigen Schritte sie brauchen

## Implementierungshinweise für den Skill-Bau

- Skill liegt unter `.claude/skills/planungsleitplanken/` (Claude-konform). Frühere OpenAI-Codex-Quelle am 2026-06-12 entfernt — Repo ist Claude-only.
- Trigger-Beschreibung weit formulieren: greift bei jeder Planung, nicht nur bei explizitem `/plan`-Kommando
