# Bauplan: feature-editorial

> **Herkunft seit 2026-09-06:** Der Skill selbst liegt nicht mehr unter `.claude/skills/`, sondern kommt aus dem Plugin
> `pm-workflow-skills@skill-library` (Repo `ReneRoseMuG/Skill-Library`, Ordner `plugins/pm-workflow-skills/`).
> Dieser Bauplan bleibt als projektbezogene Entwurfs- und Begründungsquelle bestehen — Änderungen am Skillverhalten
> zuerst in der Skill Library vornehmen.

## Zweck

Redaktionelle Aufbereitung eines Features aus Anwendersicht. Erstellt eine strukturierte, fachlich verständliche Feature-Beschreibung mit festgelegter Gliederung, optional mit Use Cases. Zielgruppe ist ein Fachverantwortlicher oder Product Owner — kein technischer Jargon, keine Implementierungsdetails.

## Trigger

IMMER verwenden wenn der Nutzer formuliert: „Feature überarbeiten", „redaktionell aufbereiten", „aus Anwendersicht beschreiben", „dokumentieren", „schreib eine Beschreibung für…", „erstelle Use Cases für…", „bereite Feature X auf" — egal ob eine Feature-ID (z. B. FEAT-35) oder ein Feature-Name genannt wird.

## Referenzen

- `agents.md` Abschnitt 14 (Domäne 2 — Dokumentation): Features und Use Cases
- Skill `projekt-manager` (Plugin `pm-workflow-skills`): HTML-Konvertierungsregeln und MCP-Tools
- `docs/design-leitfaden.md`: bei visuellen Aspekten eines Features

## Projektkontext

Features gehören zu **Domäne 2 — Dokumentation** dieses Projekts:
- Features können projekt- und milestoneübergreifend referenziert werden
- Use Cases gehören immer einem Feature (`featureId NOT NULL`)
- Features können Tasks und Tickets tragen

## Schritt 1 — Quelle klären

- **Feature-ID angegeben** (z. B. `FEAT-35`) → Feature via MCP laden: `get_feature`
- **Name oder Beschreibung im Chat** → als Ausgangsmaterial verwenden
- **Unklar** → kurz nachfragen

Zusätzlich: relevante Teile der Codebase lesen um Fachregeln, betroffene Domänen-Objekte und Querverbindungen eigenständig zu ermitteln.

## Schritt 2 — Inhalt erarbeiten

Vor dem Schreiben sammeln:

1. **Zweck & Nutzen** — Was kann der Anwender damit tun? Welches Problem löst es?
2. **Fachregeln** — Pflichtfelder, Rollenbeschränkungen, Statusübergänge, Validierungen
3. **Betroffene Objekte** — Fachliche Namen, keine Tabellennamen oder Feldnamen
4. **Verwandte Features** — Abhängigkeiten und Querverbindungen zu anderen Features

## Schritt 3 — Dokument schreiben

Feste Gliederung. Der H2-Titel des ersten Abschnitts wird durch eine inhaltlich treffende Überschrift ersetzt (nicht „Fachlicher Teil", sondern z. B. „Aufgabenverwaltung im Projekt"):

```
## [Treffende Überschrift für den Fachbereich]

### Ziel / Zweck
1–3 Sätze: Was kann der Anwender damit tun? Welchen Mehrwert bringt es?

### Fachliche Beschreibung
Aus Anwendersicht: Was passiert bei typischen Aktionen? Welche Zustände gibt es?

### Regeln & Randbedingungen
Aufzählung der geltenden Fachregeln — jede Regel als eigenständiger Punkt.
Beispiele: Pflichtfelder, Rollenbeschränkungen, Statusübergänge, Validierungen.


## Architektur & Kontext

### Betroffene Objekte
Fachliche Entitäten mit kurzer Rollenbeschreibung — keine SQL-Tabellennamen.
Mermaid-Diagramm optional wenn mehr als 2 Objekte mit nicht-trivialen Beziehungen.

### Verwandte Features & Abhängigkeiten
Querverweise mit kurzer Erklärung der Verbindung.
```

## Schritt 4 (optional) — Use Cases

Wenn der Nutzer Use Cases möchte:

```
### UC-[Nummer]: [Titel]

**Akteur:** [z. B. "Projektleiter", "Administrator"]
**Ziel:** [Was möchte der Akteur erreichen?]

**Vorbedingungen:**
- [Was muss vorher erfüllt sein?]

**Ablauf:**
1. [Schritt 1]
2. [Schritt 2]

**Alternativen / Sonderfälle:**
- [Was passiert bei abweichendem Verlauf?]

**Ergebnis:**
[Was hat sich nach erfolgreicher Ausführung verändert?]
```

## Schritt 5 — Ausgabe

Features und Use Cases werden im Projekt Manager gepflegt. Der MCP-Server ist immer das Ausgabeziel, wenn eine ID bekannt ist.

**Textfelder sind HTML** — Konvertierung gemäß Skill `projekt-manager` (Plugin `pm-workflow-skills`):

| Markdown | HTML |
|---|---|
| `## Überschrift` | `<h2>Überschrift</h2>` |
| `### Unterüberschrift` | `<h3>Unterüberschrift</h3>` |
| `**fett**` | `<strong>fett</strong>` |
| `- Listenpunkt` | `<ul><li>Listenpunkt</li></ul>` |
| Absatz | `<p>Absatz</p>` |
| Mermaid | `<pre class="mermaid">...</pre>` |

### Mit Feature-ID

1. Feature-Beschreibung → `update_feature` via MCP
2. Use Cases (falls vorhanden) → je einen UC via `create_use_case` anlegen und mit Feature verknüpfen; Status immer `open`
3. Kurze Rückmeldung: was wurde übertragen

### Ohne Feature-ID

Den Nutzer fragen: soll ein neues Feature im Projekt Manager angelegt werden (`create_feature`), oder wird die Beschreibung zunächst nur zur Durchsicht im Chat ausgegeben?

- **Neues Feature anlegen** → `create_feature` via MCP, danach Use Cases wie oben
- **Nur Durchsicht** → Markdown im Chat, kein MCP-Aufruf; Nutzer kann danach mit ID erneut beauftragen

## Stilhinweise

- Aktiv schreiben: „Der Anwender kann…", „Das System erlaubt…"
- Kein technischer Jargon, keine Anglizismen wo vermeidbar
- Fachregeln als klare Einzelaussagen — keine Schachtelsätze
- Mermaid nur wenn es echten Mehrwert bringt

## Implementierungshinweise für den Skill-Bau

- MCP-Tools: `get_feature`, `update_feature`, `create_use_case`, `list_use_cases`
- Trigger-Beschreibung muss Feature-ID-Format dieses Projekts nennen (FEAT-N)
- Skill folgt Auftragsklasse 2 (Report/Dokument) wenn keine ID — keine Codeänderungen
- Skill folgt Auftragsklasse 3 (Git-Operation ohne Codeänderung) wenn MCP-Schreibzugriff
