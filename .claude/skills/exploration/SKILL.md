---
name: exploration
description: >
  Code-Exploration und Impact-Analyse — verstehe zuerst, was existiert und was betroffen ist.
  Verwenden wenn unklar ist welche Komponenten zuständig sind, ob ähnliche Lösungen
  bereits existieren, oder was eine Änderung beeinflusst. IMMER vor nicht-trivialen
  Implementierungsaufträgen wenn der betroffene Bereich nicht vollständig bekannt ist.
  Auslöser: "was ist betroffen", "gibt es schon etwas für", "finde ähnliche Implementierungen",
  "was passiert wenn ich X ändere", "welche Dateien sind betroffen", "verstehe den Bereich",
  "analysiere was vorhanden ist", vor jeder strukturellen oder komponentenbezogenen Änderung.
---

# Code Exploration & Impact Analysis — Projekt Manager

Vor jeder Analyse gilt: Erst verstehen, dann entscheiden.
Keine Implementierungsentscheidung ohne Bestandsaufnahme.

## Schritt 1 — Graphify zuerst (immer)

```bash
graphify query "<fachlicher Begriff der Änderung>"
graphify path "<UI-Einstieg>" "<Service oder Repository>"
graphify explain "<unbekannter Knoten>"
```

Graphify-Graph liegt in `graphify-out/`. Falls veraltet: `graphify update .` ausführen.

Graphify zeigt Struktur — Quellcode bestätigt Qualität und Verantwortung.
Graphfunde immer durch direktes Dateilesen verifizieren.

## Schritt 2 — Auftragsart bestimmen

**Strukturerkundung:** Was existiert in diesem Bereich?
→ Komponenten, Schichten, Dateien, Muster kartieren

**Impact-Analyse:** Was bricht wenn X geändert wird?
→ Direkte Aufrufer, Services, Tests, Dokumentation ermitteln

**Mustersuche:** Gibt es das schon?
→ Ähnliche Komponenten, Services, Hooks finden und klassifizieren

## Schritt 3 — Technische Suche ergänzen

Über Graphify hinaus direkt im Repository suchen:
- Komponentennamen, Props, Event-Namen
- Import-/Exportpfade
- Hooks (`use*`), Services, Repositories
- Tests die den Bereich abdecken

## Schritt 4 — Betroffene Bereiche bei Impact-Analyse

Direkte Aufrufer → eine Ebene tiefer → Tests → Dokumentation

Schichten im Projekt Manager:
- `packages/shared-types` → Shared Types
- `apps/api/src/routes` → API-Routen
- `apps/api/src/repositories` → Repositories
- `apps/api/src/services` → Services
- `apps/web/src/api` → Web-API
- TanStack Query Hooks, Query-Keys, Invalidierung

Bei Schemaänderungen zusätzlich:
- `apps/api/src/db/schema.ts`
- Migrations, Fixtures, Seed

## Schritt 5 — Kandidaten klassifizieren

| Klasse | Merkmal |
|---|---|
| Verbindliche Referenz | Explizit zentral, breit genutzt |
| Zulässige Variante | Dokumentiert, bewusst abweichend |
| Driftverdacht | Lokale Kopie einer zentralen Lösung |
| Altlast | Veraltet, kaum referenziert |

## Ergebnis

Vor Übergabe an Planung oder Implementierung benennen:
- Gefundene Komponenten, Dateien, Muster mit Klassifikation
- Direkte Aufrufer und Seiteneffekte
- Betroffene Tests und Dokumentation
- Offene Fragen und Widersprüche

Kein Code verändern. Nur analysieren und dokumentieren.

Quelle (Ebene 1): Skill Library `dev-testing/exploration/` — dort zuerst ändern, dann hier nachziehen.
