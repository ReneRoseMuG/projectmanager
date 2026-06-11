---
name: datenmodell
description: >
  Datenmodell-Analyse vor Schema-Änderungen, Migrationen und neuen Entitäten.
  Verwenden wenn Tabellen, Spalten, Relationen oder Fremdschlüssel geändert werden sollen,
  eine neue Migration geplant ist, oder Datenbankintegrität geprüft werden soll.
  Auslöser: "neue Tabelle", "Schema ändern", "Migration", "Fremdschlüssel",
  "ON DELETE", "neue Spalte", "Datenbank", "Schema", "Relation", "Datenverlust".
---

# Datenmodell & Persistenz — Projekt Manager

Schema-Änderungen sind irreversibel in Produktion. Erst analysieren, dann migrieren.

## Schema-Quellen im Projekt Manager

| Quelle | Inhalt |
|---|---|
| `apps/api/src/db/schema.ts` | Verbindliche Schema-Definition |
| `apps/api/src/db/migrations/` | Migrationshistorie |
| `apps/api/src/repositories/` | Datenzugriff und Abfragen |
| `.Codex/project-context/data-schema.md` | Kurzreferenz (kann veraltet sein) |

Immer `schema.ts` als primäre Quelle lesen — nicht nur die Kurzreferenz.

## Schritt 1 — Bestandsaufnahme

```bash
graphify query "<Domänenobjekt>"
graphify explain "<Schema-Entität>"
```

Dann im Quellcode prüfen:
- Welche Tabellen, Spalten, Typen, Nullable, Default-Werte?
- Welche Fremdschlüssel und Kaskadierungsregeln (ON DELETE, ON UPDATE)?
- Welche Indizes?
- Welche Repositories, Services, API-Routen greifen zu?
- Welche Tests und Fixtures setzen das Schema voraus?

## Schritt 2 — Migrationskategorie bestimmen

| Kategorie | Risiko |
|---|---|
| Additiv: neue Tabelle, nullable Spalte | Niedrig |
| Modifizierend: Typ ändern, NOT NULL hinzufügen | Mittel–Hoch |
| Destruktiv: Spalte/Tabelle löschen | Hoch |
| Datenmigration: Werte transformieren | Hoch |

## Schritt 3 — Migrations-Pflichtablauf

1. Migration nach Repository-Konvention anlegen (nummeriert, benannt)
2. Strukturmigration und Datenmigration **in getrennten** Migrationsdateien
3. NOT NULL auf bestehenden Zeilen: erst nullable hinzufügen → Zeilen befüllen → NOT NULL setzen
4. Abhängige Repositories, Services, Shared Types und Tests anpassen
5. Migration lokal ausführen und Schema-Zustand prüfen
6. Fixtures, Seeds und Test-Datenbanken aktualisieren
7. Tests ausführen — alle betroffenen Suiten

## Schritt 4 — Integrität prüfen

- Alle FK mit explizitem ON DELETE / ON UPDATE?
- Kaskadierung fachlich korrekt? (RESTRICT vs CASCADE vs SET NULL)
- Unique-Constraints für fachlich eindeutige Felder?
- Soft-Delete in allen Abfragen konsistent berücksichtigt?
- Test-Isolation korrekt: Temp-DB oder In-Memory-DB, nie `apps/api/data/`

## Dump-Registry und Fixtures (Projekt Manager spezifisch)

Neue Tabellen erfordern:
- Eintrag in Dump-Registry
- Test-Truncation-Konfiguration
- Dump-Roundtrip-Seed-Anpassung

## Abbruch wenn

- ON DELETE Regel hat Auswirkungen die nicht vollständig bewertet sind
- Migration würde Daten löschen ohne dokumentierten Entscheid
- Test-Infrastruktur (Fixtures, Schema-Init) nicht klar aktualisierbar
