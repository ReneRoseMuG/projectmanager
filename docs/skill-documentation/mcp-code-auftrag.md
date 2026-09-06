# Bauplan: mcp-code-auftrag

> **Herkunft seit 2026-09-06:** Der Skill selbst liegt nicht mehr unter `.claude/skills/`, sondern kommt aus dem Plugin
> `pm-workflow-skills@skill-library` (Repo `ReneRoseMuG/Skill-Library`, Ordner `plugins/pm-workflow-skills/`).
> Dieser Bauplan bleibt als projektbezogene Entwurfs- und Begründungsquelle bestehen — Änderungen am Skillverhalten
> zuerst in der Skill Library vornehmen.

## Zweck

Orchestrierungs-Skill für Arbeitsaufträge die aus der Projekt Manager App über den MCP-Server übergeben werden. Lädt den Parent-Kontext vollständig, leitet den Auftrag ab, fragt vor der Ausführung nach Plan oder Direktausführung, schreibt danach einen nutzerlesbaren Log zurück und setzt den Parent-Status auf „Wartend".

## Trigger

Wenn ein Arbeitsauftrag aus der PM-App über den MCP übergeben wird oder die Nutzeranfrage ausdrücklich eine Parent-Referenz wie `PROJ-1` oder `MS-34` als Auftragsquelle nennt. Auslöser: „bearbeite PROJ-3", „setze MS-12 um", „führe den Auftrag aus TASK-5 aus".

## Verhältnis zu anderen Skills

Dieser Skill ist der Einstiegspunkt für MCP-basierte Aufträge. Er orchestriert — die inhaltliche Arbeit folgt den Regeln der übrigen Skills und `agents.md`:

| Phase | Gilt |
|---|---|
| Planung | `planungsleitplanken` + `agents.md` §3 |
| Tests | `test-entwurfsleitplanken` + `agents.md` §11 |
| Code-Änderung | `code-discipline` + `agents.md` §4 |
| Log + Status | Dieser Skill |

## Referenz-Format

| Referenz | Bedeutung | Rolle |
|---|---|---|
| `PROJ-<id>` | Projekt | Parent — Auftragsquelle |
| `MS-<id>` | Meilenstein | Parent — Auftragsquelle |
| `TASK-<id>` | Aufgabe | Arbeitsgegenstand oder Kind-Kontext |
| `TKT-<id>` | Ticket | Arbeitsgegenstand oder Kind-Kontext |
| `FEAT-<id>` | Feature | Arbeitsgegenstand oder Kind-Kontext |
| `UC-<id>` | Use Case | Arbeitsgegenstand oder Kind-Kontext |

Reine Zahlen ohne Typ sind mehrdeutig → kurz nachfragen. Referenzen werden case-insensitiv erkannt.

## Schritt 1 — Kontext laden

1. Parent-Referenz aus der Nutzeranfrage oder dem MCP-Kontext extrahieren
2. Parent laden mit `get_reference_context` — lädt Parent inkl. rekursiver Kinder, Notes, Attachments, Comments und Relationen
3. Ergänzende MCP-Lesetools nur wenn `get_reference_context` nicht ausreicht
4. MCP-Warnungen oder fehlende optionale Daten knapp melden
5. Bei nicht ladbarem Parent: kontrolliert abbrechen und Blocker dokumentieren

Großen Kontextbaum nicht roh ausgeben — nach Relevanz zusammenfassen. Attachments mit Dateiname, Typ, Größe und Textvorschau nennen wenn auftragsbezogen.

## Schritt 2 — Auftrag ableiten

Aus dem geladenen Kontext den tatsächlichen Arbeitsauftrag ableiten:

- Titel, Beschreibung, Status und Abnahmekriterien des Parents
- Anhängende Aufgaben, Tickets und fachliche Notizen
- Attachments mit Textvorschau oder Dateibeschreibung
- Offene Comments und Relationshinweise
- Reihenfolge, Abhängigkeiten und erkennbare Blocker

Keine fehlenden Anforderungen erfinden. Bei widersprüchlichem oder uneindeutigem Kontext: kurz nachfragen oder Blocker benennen.

## Schritt 3 — Pflichtfrage vor der Umsetzung

Nachdem Kontext geladen und Auftrag abgeleitet wurde, den Nutzer ausdrücklich fragen:

> „Soll ich den Auftrag direkt ausführen, oder soll ich zuerst einen Plan erstellen?"

Keine Code-, Datei-, Git-, Status- oder Schreibaktion vor der Antwort. Bei Planwunsch: Plan erstellen und auf Freigabe warten.

## Schritt 4 — Ausführung

Regeln des Zielprojekts einhalten: `agents.md`, Teststrategie, Log-Pflicht, Git-Vorgaben, Sicherheitsregeln. MCP-Daten als Auftragskontext nutzen — nur ändern was durch Auftrag oder freigegebenen Plan gedeckt ist.

Blockierte Teilaufgaben dokumentieren und mit unabhängigen Schritten weitermachen.

## Schritt 5 — Log nach der Ausführung

Nach bestätigter Ausführung fragen:

> „Soll ich ein kurzes Log als Kommentar am Parent hinterlegen?"

Der Log ist für den Nutzer geschrieben — gut lesbar, keine technischen Dateilisten. Inhalt:

- Was erledigt wurde
- Wichtige Entscheidungen oder Einschränkungen
- Durchgeführte Prüfungen oder Tests
- Offene Punkte oder verbleibende Blocker
- Welches Ergebnis der Nutzer jetzt erwarten kann

**Tool-Priorität:** `add_comment_to_parent` → wenn nicht verfügbar: `add_note_to_parent` mit Kennzeichnung als Log → wenn beides fehlt: Blocker melden und Log im Chat ausgeben.

## Schritt 6 — Parent-Status abschließen

Parent-Status auf `pending` setzen — erst nach Ausführung und optionaler Log-Frage, nie vorzeitig.

Kein Status-Update-Tool verfügbar → als Blocker melden und explizit nennen dass der Status nicht geändert werden konnte.

## Antwortverhalten

- Nutzerorientiert und knapp
- Klar trennen zwischen: geladenem Kontext → abgeleitetem Auftrag → Nutzerentscheidung → Umsetzung → Log → Statusabschluss
- Kein roher Kontextbaum — nach Relevanz zusammenfassen

## Implementierungshinweise für den Skill-Bau

- Skill liegt seit 2026-09-06 im Plugin `pm-workflow-skills@skill-library` (vorher `.claude/skills/mcp-code-auftrag/`). Frühere OpenAI-Codex-Quelle am 2026-06-12 entfernt — Repo ist Claude-only.
- Referenz-Format ist projektspezifisch und muss bei Übernahme in andere Projekte angepasst werden
- Die Pflichtfrage (Schritt 3) ist bewusst hartcodiert — nicht weglassen, auch wenn Nutzer ungeduldig wirkt
- Dieser Skill ist der einzige der aktiv nach Plan oder Direktausführung fragt — alle anderen setzen einen bereits getroffenen Entscheid voraus
