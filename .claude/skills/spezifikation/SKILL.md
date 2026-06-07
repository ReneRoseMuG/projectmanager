---
name: spezifikation
description: >
  Feature- und Use-Case-Redaktion via Projekt-Manager-MCP.
  Verwenden wenn Features oder Use Cases geschrieben, überarbeitet, geprüft oder
  aus Anwendersicht aufbereitet werden sollen.
  Auslöser: "schreibe Feature", "überarbeite Use Case", "Feature aus Anwendersicht",
  "Use Cases für Feature X", "redaktionell aufbereiten", "Spec prüfen",
  "Feature-Beschreibung", "UC-Review", Spezifikation für FEAT-N oder UC-N.
---

# Spezifikationsredaktion — Projekt Manager

MCP ist die Datenquelle und das Speicherziel. Keine Specs ohne MCP-Zugriff bearbeiten.

## Auftragsart

| Art | MCP-Operationen |
|---|---|
| Feature schreiben/überarbeiten | `get_feature` → bearbeiten → `update_feature` |
| Use Case schreiben/überarbeiten | `get_use_case` → bearbeiten → MCP speichern |
| Audit / Review | `get_feature` + zugehörige UCs lesen — kein Speichern |

## Feature schreiben

**Pflichtabschnitte:**
1. Ziel — was erreicht der Anwender? (1 Satz)
2. Nutzen — konkreter Mehrwert, kein Tech-Jargon
3. Beschreibung — Fließtext + Aufzählungen gemischt
4. Regeln — nummeriert, konkret und testbar formuliert
5. Ausnahmen — explizit benannt, nicht im Text versteckt
6. Verwandte Features — via MCP laden wenn betroffen
7. Use Cases — Referenzliste

**Schreibregeln:**
- Anwendersprache — kein Datenbankdesign, keine Variablennamen, keine API-Details
- Regeln konkret: "Ein Termin kann nicht in der Vergangenheit liegen" — nicht "Datum wird validiert"
- Für fachkundige Anwender ohne Entwicklerhintergrund verständlich

## Use Case schreiben

**Pflichtabschnitte:**
1. Ziel — 1 Satz
2. Auslöser — was startet den UC?
3. Voraussetzungen — Bedingungen vor dem Start
4. Hauptablauf — nummerierte Schritte, Anwendersprache
5. Alternativabläufe — zulässige Abweichungen
6. Fehlerfälle — mit konkreter Systemreaktion im Wortlaut
7. Nachbedingungen — Zustand nach Abschluss

**Schreibregeln:**
- Abläufe aus Anwenderperspektive: "Der Anwender wählt..." nicht "Das System setzt..."
- Fehlerfälle vollständig — ohne sie sind UCs keine brauchbare Testbasis
- Kein Widerspruch zu Feature-Regeln

## Spec-Audit

Prüft ohne zu verändern:
- Alle Pflichtabschnitte vorhanden?
- Regeln testbar formuliert?
- UCs decken Feature-Regeln vollständig ab?
- Widersprüche zwischen Features und UCs?
- Verwandte Features korrekt verknüpft?

**Ergebnis:** Freigegeben | Freigegeben mit Hinweisen | Überarbeitung erforderlich
