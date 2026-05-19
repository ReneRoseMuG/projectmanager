# Log: Cleanup und Drop Legacy-Spalten

**Datum:** 19.05.26  
**Schritt:** 9 — Cleanup und Drop Legacy-Spalten  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Es wurde keine Drop-Migration ausgeführt und keine Legacy-Spalte entfernt. Die Aufgabe verlangt ausdrücklich, dass die Junction-Modelle produktiv genutzt und erfolgreich verifiziert sind, bevor alte Comment- und Attachment-Owner-Spalten entfernt werden. Dieser Zustand ist noch nicht erreicht: Mehrere Testgruppen sind wegen alter PATCH-Payloads, direkter Legacy-Comment-Inserts und fehlender Dump-Table-Registry-Einträge rot. Deshalb wäre ein Drop der Legacy-Spalten aktuell nicht sicher.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-19-schritt-09-cleanup-drop-legacy-columns.md` | neu | Blocker-Log für Aufgabe 09 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 09 ergänzt |

## Probleme und Abweichungen

Der Schnellcheck per `rg` zeigt weiterhin Legacy-Felder im Zielbereich: `comments.task_id`, `comments.entity_type`, `comments.entity_id`, `attachments.project_id`, `attachments.task_id`, `attachments.feature_id`, `attachments.ticket_id` und der CHECK-Constraint `attachments_exactly_one_owner` stehen noch in `apps/api/src/db/schema.ts`. Außerdem geben die Shared DTOs für Comments und Attachments aus Kompatibilitätsgründen noch alte Owner-Felder zusätzlich zu `owners: [...]` aus.

Die Aufgabe wurde bewusst blockiert, weil ein Drop ohne grüne Verifikation Datenverlust oder nicht migrierte Altflüsse riskieren würde.

## Offene Punkte / Folgeaufgaben

Vor Aufgabe 09 müssen die roten Tests aus Aufgaben 03, 04, 06, 07 und 08 aufgearbeitet oder als bestätigte Altmodell-Abweichung ersetzt werden. Danach muss eine Datenverifikation bestätigen, dass alle alten Comment- und Attachment-Owner vollständig in Junction-Tabellen übertragen wurden. Erst anschließend darf eine separate Drop-Migration erzeugt und ausgeführt werden.
