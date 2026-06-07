# Datenmodell — Projekt Manager

Übersicht des aktuellen Datenbankschemas für Code-Analysen und Skill-Kontext.
Verbindliche Quelle ist `apps/api/src/db/schema.ts`.

---

## Status

Diese Datei dient als Kurzreferenz für Skills.
Bei Schema-Änderungen immer zuerst `apps/api/src/db/schema.ts` lesen — diese Datei kann veraltet sein.

---

## Kernobjekte (Platzhalter)

<!-- Schema-Übersicht aus schema.ts hierher übertragen -->

### Hierarchie der Projektobjekte
```
Projekt → Meilenstein → Aufgabe
                      → Ticket
        → Feature → Use Case
```

### Gemeinsame Felder
- `id`, `createdAt`, `updatedAt` — alle Tabellen
- `version`, `expectedVersion` — versionierte Objekte

---

## Löschregeln (Platzhalter)

<!-- ON DELETE CASCADE / RESTRICT Entscheidungen dokumentieren -->

---

## Migrationshistorie

Migrationen in: `apps/api/src/db/migrations/`

Beim Arbeiten mit dem Schema:
1. Aktuelle Migration-Dateien lesen
2. `schema.ts` als Wahrheitsquelle nutzen
3. Diese Datei nur für schnellen Überblick
