---
name: dokumentation
description: >
  Anwenderdokumentation und Wiki-Artikel via Projekt-Manager-MCP.
  Verwenden wenn Wiki-Artikel geschrieben, aktualisiert oder veröffentlicht werden sollen,
  oder wenn Anwenderdoku für Features und Use Cases erstellt wird.
  Auslöser: "schreibe Wiki", "Wiki-Artikel", "dokumentiere für Anwender",
  "Anwenderdokumentation", "Wiki aktualisieren", "Doku für Feature X",
  "veröffentliche im Wiki", Wiki-Artikel für FEAT-N oder UC-N.
---

# Anwenderdokumentation — Projekt Manager

Quellen via MCP. Keine Doku ohne Quellen-Verifikation veröffentlichen.

## Quellenpriorität

1. Freigegebene Spezifikationen und Akzeptanzkriterien
2. Features via MCP (`get_feature`)
3. Use Cases via MCP (`get_use_case`)
4. Quellcode als letzte verfügbare Quelle

## Schritt 1 — Quellen laden

```
get_feature(<Feature-ID>)
get_use_case(<Use-Case-ID>)
```

Verwandte Features identifizieren und bei Bedarf nachladen.

## Schritt 2 — Code-Verifikation (wenn nötig)

Prüfen ob Doku durch Code gestützt wird:
- UI-Pfade: existieren die beschriebenen Menüpunkte und Dialoge?
- Rollen: stimmen beschriebene Berechtigungen mit der Implementierung überein?
- Regeln: werden alle beschriebenen Regeln tatsächlich durchgesetzt?

Widersprüche zwischen Doku und Code immer explizit benennen — nie stillschweigend auflösen.

## Schritt 3 — Inhalt schreiben

**Schreibregeln:**
- Direkte Anrede: "Klicken Sie auf..." oder "Sie klicken auf..."
- Aktive Formulierungen: "Das System speichert..." nicht "Die Daten werden gespeichert"
- Konkrete Labels aus der echten UI — nicht abstrakte Beschreibungen
- Fehlermeldungen im Wortlaut zitieren wenn bekannt
- Keine technischen Interna ohne direkten Nutzerbezug

**Feature-Artikel enthält:**
- Einstieg: was kann der Anwender damit tun? (1-2 Sätze)
- Schritt-für-Schritt-Anleitung für Hauptablauf
- Wichtige Regeln und Einschränkungen
- Häufige Fehlersituationen mit Lösung
- Verwandte Themen

## Schritt 4 — Prüfen vor Veröffentlichung

- Alle Pflichtabschnitte vorhanden?
- Einheitliche Anrede im gesamten Artikel?
- Verlinkungen zu verwandten Artikeln vorhanden?
- Kein Platzhalter oder TODO offen?
- Für Anwender ohne Entwicklerhintergrund verständlich?

## Schritt 5 — Veröffentlichen

Artikel via MCP erstellen oder aktualisieren.
Verlinkungen in verwandten Artikeln aktualisieren.

Nicht veröffentlichen wenn: inhaltliche Widersprüche, ungeklärte Quellen, offene TODOs.
