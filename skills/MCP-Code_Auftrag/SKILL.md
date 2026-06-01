---
name: MCP-Code_Auftrag
description: Use when Codex receives or should process implementation, fix, audit, test, or documentation work orders passed through the Projekt Manager MCP from the PM app. The skill loads the referenced Projekt Manager parent such as PROJ-1 or MS-34 with recursive child context, asks whether to execute directly or create a plan, and after execution offers to write a user-readable log back to the parent before setting the parent status to pending.
---

# MCP-Code Auftrag

Nutze diesen Skill, wenn ein Arbeitsauftrag aus der Projekt-Manager-App über den Projekt-Manager-MCP übergeben wird oder wenn die Nutzeranfrage ausdrücklich einen Projekt-Manager-Parent wie `PROJ-1` oder `MS-34` als Auftragsquelle nennt.

## Grundregel

Arbeite immer vom angegebenen Parent aus. Lade den Parent und alle relevanten anhängenden Objekte über den Projekt-Manager-MCP, bevor du einen Auftrag ableitest, planst oder ausführst.

Bevorzuge `get_reference_context`, weil dieses Tool den Parent inklusive rekursiver Kinder, Notes, Attachments, Comments und Relationen lädt. Nutze ergänzende MCP-Lesetools nur, wenn `get_reference_context` nicht ausreicht oder für den konkreten Parent-Typ nötig ist.

## Referenzen

Erkenne diese Parent-Referenzen case-insensitive:

| Referenz | Parent |
|---|---|
| `PROJ-<id>` | Projekt |
| `MS-<id>` | Meilenstein |

Erkenne weitere Objekt-Referenzen nur als Kontext oder Arbeitsgegenstand:

| Referenz | Objekt |
|---|---|
| `TASK-<id>` | Aufgabe |
| `TKT-<id>` | Ticket |
| `FEAT-<id>` | Feature |
| `UC-<id>` | Use Case |

Reine Zahlen ohne eindeutigen Objekttyp sind mehrdeutig. Frage in diesem Fall kurz nach dem Typ.

## Kontext laden

1. Extrahiere die Parent-Referenz aus der Nutzeranfrage oder aus dem übergebenen MCP-Kontext.
2. Lade den Parent mit `get_reference_context`.
3. Stelle sicher, dass Aufgaben, Tickets, Notizen, Attachments, Comments, Relationen und rekursive Kinder berücksichtigt sind.
4. Wenn das MCP-Ergebnis Warnungen oder fehlende optionale Daten meldet, nenne sie knapp.
5. Wenn ein erforderliches MCP-Lesetool fehlt oder der Parent nicht geladen werden kann, brich kontrolliert ab und dokumentiere den Blocker.

## Auftrag ableiten

Leite den tatsächlichen Arbeitsauftrag aus dem Parent-Kontext ab. Berücksichtige dabei besonders:

- Titel, Beschreibung, Status und Abnahmekriterien des Parents.
- Anhängende Aufgaben, Tickets und fachliche Notizen.
- Attachments mit Textvorschau oder Dateibeschreibung.
- Offene Comments und Relationshinweise.
- Reihenfolge, Abhängigkeiten und erkennbare Blocker.

Erfinde keine fehlenden Anforderungen. Wenn der Kontext widersprüchlich oder nicht eindeutig umsetzbar ist, frage kurz nach oder benenne den Blocker.

## Pflichtfrage vor der Umsetzung

Nachdem der Parent-Kontext geladen und der Auftrag abgeleitet wurde, frage den Nutzer ausdrücklich:

`Soll ich den Auftrag direkt ableiten und ausführen, oder soll ich zuerst einen Plan erstellen?`

Führe keine Code-, Datei-, Git-, Status- oder Schreibaktion aus, bevor der Nutzer diese Frage beantwortet hat. Wenn der Nutzer einen Plan wünscht, erstelle nur den Plan und warte auf Freigabe, sofern die geltenden Projektregeln das verlangen.

## Ausführung

Halte dich während der Ausführung an die Regeln des Zielprojekts, insbesondere vorhandene `agents.md`-, Test-, Log-, Git- und Sicherheitsvorgaben. Nutze die geladenen MCP-Daten als Auftragskontext, aber ändere nur, was durch den Auftrag oder einen freigegebenen Plan gedeckt ist.

Wenn Teilaufgaben blockiert sind, dokumentiere den Blocker und arbeite mit unabhängigen nächsten Schritten weiter, soweit das Zielprojekt dies erlaubt.

## Log nach der Ausführung

Nach der bestätigten Ausführung frage den Nutzer:

`Soll ich ein kurzes Log als Kommentar am Parent hinterlegen?`

Das Parent-Log ist für den Nutzer geschrieben. Es soll gut lesbar sein und keine technischen Dateilisten enthalten. Es beschreibt:

- was erledigt wurde,
- welche wichtigen Entscheidungen oder Einschränkungen relevant sind,
- welche Prüfungen oder Tests durchgeführt wurden,
- welche offenen Punkte oder Blocker bleiben,
- welches Ergebnis der Nutzer jetzt erwarten kann.

Nutze ein Kommentar-Tool, wenn der Projekt-Manager-MCP eines anbietet. Wenn kein Kommentar-Tool verfügbar ist, nutze ein passendes Notiz-Tool wie `add_notes_to_parent` und kennzeichne den Eintrag als Log. Wenn weder Kommentar- noch Notiz-Tool verfügbar ist, nenne dies als Blocker und gib den Logtext im Chat aus.

## Parent-Status abschließen

Zum Abschluss muss der Parent-Status auf `pending` beziehungsweise `wartend` gesetzt werden.

Nutze dafür das passende Projekt-Manager-MCP-Schreibtool. Wenn kein Status-Update-Tool verfügbar ist, melde diesen Schritt als Blocker und nenne ausdrücklich, dass der Parent-Status nicht geändert werden konnte.

Statusänderungen erfolgen erst nach der eigentlichen Ausführung und nach der optionalen Log-Frage, damit der Parent nicht vorzeitig als wartend markiert wird.

## Antwortverhalten

- Antworte nutzerorientiert und knapp.
- Gib große Kontextbäume nicht roh aus, sondern fasse sie nach Relevanz zusammen.
- Nenne Attachments mit Dateiname, Typ, Größe und vorhandener Textvorschau, wenn sie für den Auftrag relevant sind.
- Trenne klar zwischen geladenem MCP-Kontext, abgeleitetem Auftrag, Nutzerentscheidung, Umsetzung, Log und Statusabschluss.
