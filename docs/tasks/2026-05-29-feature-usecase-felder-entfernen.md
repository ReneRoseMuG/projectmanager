# Codex-Auftrag: Feature & Use Case – Kurzbeschreibung und Sortierung entfernen

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-122

---

## Ziel

Die Felder `shortDescription` (Kurzbeschreibung) und `sortOrder` (Sortierung) werden aus den Edit-Formularen von Feature und Use Case entfernt. Im Create-Pfad schreibt der Server Standardwerte in die DB, ohne dass das Frontend diese explizit senden muss. Bestehende Datensätze bleiben unverändert.

## Hintergrund & Kontext

Die Felder wurden ursprünglich für eine redaktionelle Strukturierung vorgesehen, werden aber in der Praxis nicht genutzt. Sie verursachen unnötigen UI-Noise und inkonsistente Formular-Layouts. Die Sortierung liegt je nach Formular an unterschiedlichen Stellen (Feature: neben Titel, UseCase: neben Status), was die angestrebte einheitliche Sidebar-Struktur erschwert.

## Aufgabe

### 1. FeatureForm.tsx
- State-Variablen `shortDescription` und `sortOrder` entfernen
- Zugehörige `useState`-Initialisierungen und `useEffect`-Synchronisierungen entfernen
- `FormField label="Sortierung"` und `FormField label="Kurzbeschreibung"` (inkl. `RichTextInlineField`) aus dem JSX entfernen
- Beide Felder aus dem Submit-Payload (`FeatureInput`) streichen
- Das Grid `md:grid-cols-[minmax(0,1fr)_10rem]` (Titel + Sortierung) auf einfaches `w-full` für den Titel zurückbauen

### 2. UseCaseForm.tsx
- State-Variablen `shortDescription` und `sortOrder` entfernen
- `FormField label="Sortierung"` und `Section title="Kurzbeschreibung"` (inkl. `RichTextInlineField`) entfernen
- Section `"Status & Sortierung"` umbenennen in `"Status"` und das Grid `md:grid-cols-[minmax(0,1fr)_10rem]` entfernen — Status bleibt allein
- Beide Felder aus dem Submit-Payload (`UseCaseInput`) streichen

### 3. API / Service (Feature & UseCase)
- In den jeweiligen Service-Methoden `createFeature` / `createUseCase` Defaultwerte setzen:
  - `sortOrder`: `0`
  - `shortDescription`: `""` (leerer String) oder `null`
- Sicherstellen, dass die Felder im Input-Schema als optional markiert sind (`z.string().optional()` o.ä.) — kein Breaking Change für bestehende API-Aufrufe
- Keine DB-Migration nötig — Spalten bleiben erhalten

## Technische Leitplanken

- Keine Datenbankmigrationen — nur API-Schema und Frontend ändern
- Bestehende Datensätze mit gesetzten `sortOrder`/`shortDescription`-Werten dürfen nicht verändert werden
- Shared-Types in `packages/shared-types/src` anpassen wenn `FeatureInput` / `UseCaseInput` die Felder als required deklarieren

## Seiteneffekte

- Prüfen ob `sortOrder` oder `shortDescription` irgendwo außerhalb der Formulare gelesen wird (z.B. in Listen-Sortierungen oder Detail-Views) — falls ja, dort sicherstellen dass `null`/`0` als Default korrekt behandelt wird
- `FeatureDetail.tsx` und `UseCaseDetail.tsx` prüfen: werden die Felder dort angezeigt? Falls ja, Anzeige ebenfalls entfernen

## Testanforderungen

- E2E-Test: Feature anlegen ohne `sortOrder`/`shortDescription` → Datensatz korrekt in DB
- E2E-Test: UseCase anlegen ohne diese Felder → Datensatz korrekt in DB
- Bestehende Feature/UseCase-Tests auf Fehlermeldungen wegen fehlender Felder prüfen

## Abnahmekriterien

- FeatureForm zeigt keine Sortierungs- und Kurzbeschreibungs-Felder mehr
- UseCaseForm zeigt keine Sortierungs- und Kurzbeschreibungs-Felder mehr
- Neues Feature anlegen schlägt nicht fehl wegen fehlender `sortOrder`
- Bestehende Features und Use Cases sind weiterhin vollständig editierbar
- Kein TypeScript-Fehler im Build
