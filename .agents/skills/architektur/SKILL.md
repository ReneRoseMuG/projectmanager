---
name: architektur
description: >
  Architektur- und Design-Analyse vor Implementierungen.
  Verwenden wenn eine Designentscheidung getroffen werden muss: welche Komponente nutzen,
  wie eine neue Komponente aufbauen, ob etwas extrahiert oder wiederverwendet werden soll.
  Auslöser: "neue Komponente", "welche Komponente soll ich verwenden", "wie soll X aufgebaut sein",
  "Refactoring", "Vereinheitlichung", "Architekturentscheidung", neue UI-Funktion mit
  Designfrage, Änderung die mehrere Komponenten oder Schichten betrifft.
---

# Architektur & Design — Projekt Manager

Analyse vor Entscheidung vor Implementierung — in dieser Reihenfolge, nie andersrum.

## Auftragsart festlegen

| Art | Beschreibung |
|---|---|
| Analyse | Nur verstehen — kein Code |
| Entscheidung | Analyse + Umsetzungsentscheidung — noch kein Code |
| Implementierung | Vollständig: Analyse → Entscheidung → Code → Prüfung |
| Audit | Driftbewertung ohne automatische Bereinigung |
| Vereinheitlichung | Parallele Lösungen kontrolliert zusammenführen |

## Schritt 1 — Bestand analysieren

Graphify-Protokoll anwenden:
```bash
graphify query "<Zielbereich>"
graphify path "<UI-Einstieg>" "<Service>"
graphify explain "<unbekannter Knoten>"
```

Dann im Quellcode verifizieren:
- Vorhandene Komponenten mit gleicher fachlicher Aufgabe finden
- Props, Events, Hooks, Services, Erweiterungspunkte prüfen
- Ähnliche Interaktionen und Darstellungen kartieren

UI-Themen: `docs/design-leitfaden.md` lädt nur die relevanten Abschnitte.

## Schritt 2 — Regeln ermitteln

**Schichten:** shared-types → routes → repositories → services → web-api → hooks
**State:** TanStack Query — kein `useState+useEffect` für Server-State
**Komponenten:** `ItemCard`, `FormModal`, `ItemRow` bevorzugen
**Labels:** `domainLabels.ts` — keine deutschen Strings inline
**Design:** `docs/design-leitfaden.md` ist verbindlich für `apps/web`

Vorhandener Code ist keine verbindliche Regel — er kann Drift sein.

## Schritt 3 — Umsetzungsentscheidung

| Option | Wann |
|---|---|
| A. Unverändert verwenden | Deckt Aufgabe vollständig ab |
| B. Konfigurieren | Props/Varianten reichen aus |
| C. Kontrolliert erweitern | Neue Anforderung gehört zur bestehenden Verantwortung |
| D. Abstraktion extrahieren | Mehrere Lösungen, gleiche stabile Verantwortung |
| E. Neue Komponente | Keine passende bestehende Lösung |
| F. Lokale Lösung | Reine lokale Darstellung, keine Fachlogik |

Verwerfen begründen. Neuentwicklung ist keine Abkürzung.

## Schritt 4 — Implementierung (nur bei Auftragsart "Implementierung")

- Referenzkomponente und Abnahmekriterien vor der ersten Änderung prüfen
- Änderungen auf geplanten Verantwortungsbereich begrenzen
- Design-Token, zentrale Icons, etablierte Muster verwenden
- Keine lokale Kopie erzeugen wenn zentrale Komponente existiert
- UI-Zustände vollständig: leer, laden, fehler, deaktiviert

## Schritt 5 — Driftprüfung

Nach der Implementierung:
```bash
graphify update .
graphify query "<geänderte Komponente>"
```

Neue parallele Komponente oder Logik entstanden? → Drift dokumentieren oder sofort beheben.

## Abbruch wenn

- Gleichrangige Quellen verlangen unvereinbare Architektur
- Zuständige Komponente unklar und die Unsicherheit beeinflusst die Lösung wesentlich
- Scope widerspricht `agents.md`
