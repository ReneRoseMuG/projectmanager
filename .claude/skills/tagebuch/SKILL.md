---
name: tagebuch
description: >
  Erzeugt und pflegt das Projekt-Tagebuch pro Projekt aus der jüngsten Aktivität —
  manuell ausgelöst. Liest das Aktivitäts-Delta über report_activity, führt jedes
  Ereignis deterministisch auf sein Projekt zurück und schreibt je Projekt eine
  fortlaufende Erzählung versioniert zurück. Auslöser: "aktualisiere das Tagebuch",
  "schreibe das Projekt-Tagebuch fort", "Tagebuch für PROJ-x", "Tagebuch aktualisieren".
---

# Tagebuch

## Zweck

Pflegt pro Projekt **genau einen** fortlaufenden, lesbaren Erzähltext über die jüngsten
Vorgänge eines Projekts — aus Kommentaren, Meilensteinen, Aufgaben, Tickets und Notizen.
Reine **Erzählschicht über dem Journal** (FT(16)/MS-70): Die App generiert die Texte nicht
selbst; dieser Skill nutzt Claude als Textgenerator und schreibt über die MCP-Tools zurück.
Das Dashboard-Widget „Tagebuch" zeigt das Ergebnis nur an.

## Auslöser

„aktualisiere das Tagebuch", „schreibe das Projekt-Tagebuch fort", „Tagebuch für PROJ-x",
„Tagebuch aktualisieren". Optional auf ein Projekt eingrenzbar (PROJ-x) oder global über alle Projekte.

## Voraussetzung

App-Infrastruktur aus MS-70 muss laufen. Benötigte MCP-Tools: `report_activity`,
`get_project_diary`, `create_diary_entry`, `update_diary_entry` sowie
`resolve_reference` / `get_reference_context` für die Projekt-Auflösung.
Ist die API nicht erreichbar (`fetch failed`), kontrolliert abbrechen und als Blocker melden —
nichts erfinden.

## Ablauf

### 1. Delta lesen
- `report_activity` aufrufen. `from` = höchstes `coveredUntil` des/der betroffenen Projekte
  (vorab per `get_project_diary` ermittelt); existiert noch kein Tagebuch, ein bewusst gewähltes
  Zeitfenster wählen. `limit` ≤ 100.
- **Paginierung ohne Cursor:** `report_activity` nimmt nur `from`/`to`/`limit` (kein Cursor-Input).
  Ist die Ausgabe-`count` gleich dem `limit` (Fenster evtl. voll) oder `nextCursor` gesetzt, das
  Zeitfenster über `from`/`to` weiter aufspannen und erneut lesen, bis keine neuen Ereignisse kommen.
- **Ausgabeform:** `{ generatedAt, from, to, count, nextCursor, groups[] }`; jede Gruppe
  `{ context: { type, id, label }, entryCount, entries[] }`, jedes Ereignis
  `{ id, operation, objectType, objectId, objectLabel, summary, actorName, createdAt }`.

### 2. Pro Projekt gruppieren (deterministisch, kein LLM)
- Jede Gruppe trägt ihren `context` — das unmittelbare Parent (Priorität parent → owner → self).
- Projekt bestimmen:
  - `context.type === "project"` → `projectId = context.id`.
  - sonst (milestone / task / ticket / feature / useCase / …) das zugehörige Projekt über
    `resolve_reference` bzw. `get_reference_context` der Gruppen-Referenz auflösen
    (die `parentContexts` nennen das Projekt). Auflösungen cachen, um MCP-Aufrufe zu sparen.
- Ereignisse **ohne** auflösbares Projekt überspringen (Randfall: kein Projektbezug → kein Tagebuch).
- Je `projectId` alle Ereignisse nach `createdAt` ordnen — **absteigend, neueste zuerst** (umgekehrt chronologisch). Projekte nie vermischen.

### 3. Pro betroffenem Projekt erzählen
- `get_project_diary(projectId)` laden → bestehende Erzählung, `version`, `coveredUntil`.
- Das Tagebuch ist **umgekehrt chronologisch** aufgebaut: datierte Abschnitte, der **neueste oben**.
  Jeder Abschnitt beginnt mit einer kurzen Datums-Überschrift (`dd.MM.yy`), darunter zusammenhängender
  Fließtext (keine lose Stichpunktliste), neutral und sachlich.
- Claude bekommt **nur** „bestehende Erzählung + neue Ereignisse dieses Projekts". Aufgabe:
  für die neuen Vorgänge die datierten Abschnitte bilden und **oben voranstellen** (jüngstes Datum
  zuoberst). Betrifft ein neues Ereignis etwas bereits in einem älteren Abschnitt Beschriebenes, die
  **vorhandene Stelle anpassen** statt eine widersprüchliche Wiederholung anzufügen — der ältere
  Abschnitt bleibt an seiner Position. Ergebnis als **HTML**.
- **Bestandsumstellung:** Liegt noch ein alter, nach unten gewachsener Fließtext vor, den neuen
  Abschnitt schlicht **oben** anfügen; Alttext nicht erzwungenermaßen umbauen — er wird nur dort in
  datierte Abschnitte überführt, wo er ohnehin angepasst wird.

### 4. Versioniert zurückschreiben
- Kein Eintrag vorhanden → `create_diary_entry(projectId, title, content, coveredUntil, sourceCount)`.
- Eintrag vorhanden → `update_diary_entry(id, content, coveredUntil, sourceCount)` (das Tool lädt die
  aktuelle `version` selbst und sendet `expectedVersion`).
- `coveredUntil` = jüngster verarbeiteter `createdAt`. `sourceCount` = bisheriger Stand + neu eingearbeitete Ereignisse.
- Bei `409 CONFLICT` (zwischenzeitliche Änderung): Eintrag neu laden und Schritt 3–4 wiederholen.

## Budget

Nur das Delta und die betroffenen Passagen gehen an Claude — die Kosten skalieren mit der neuen
Aktivität, nicht mit der Größe des Archivs.

## Regeln

- Keine hartcodierten Projektnamen, IDs oder Pfade; generisch gegen den MCP arbeiten.
- Inhalte als HTML; menschenlesbare Daten `dd.MM.yy`, maschinenlesbare ISO 8601.
- Tagebuch-Schreibvorgänge erzeugen selbst **kein** Journal-Ereignis (das Backend stellt das sicher) —
  keine Rückkopplung in die eigene Quelle.
- Nur lesen und erzählend verdichten; keine fachlichen Daten ändern.
- Pro Projekt genau ein lebender Eintrag.
- Tagebuch **umgekehrt chronologisch**: datierte Abschnitte (`dd.MM.yy`), neuester oben.

## Abschluss

Kurz im Chat berichten: welche Projekte aktualisiert wurden, wie viele Ereignisse eingearbeitet
wurden und auf welchen `coveredUntil`-Stand jedes Projekt jetzt steht. Kein Schritt-Log nötig
(kein Repo-Code, reiner MCP-Schreibvorgang).

Quelle: `docs/tasks/codex-auftrag-tagebuch-feature.md` (Schritt 9 „Skill — separat") sowie der
Skill-Entwurf als Notiz an MS-70.
