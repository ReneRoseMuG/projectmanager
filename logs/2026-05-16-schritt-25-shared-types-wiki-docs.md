# Log: Shared Types Wiki/Docs

**Datum:** 16.05.26  
**Schritt:** 25 - Shared Types Erweiterung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen Typen wurden um die neuen Entitäten der Dokumentations- und Wiki-Ebene erweitert. Ergänzt wurden Status-Konstanten und Typ-Aliasse für Features und Backlog-Items sowie die geforderten Interfaces `Feature`, `UseCase`, `WikiPage`, `WikiBreadcrumb` und `BacklogItem`. Zusätzlich wurden Input- und Update-Typen für die neuen Entitäten ergänzt, damit API- und Web-Code keine lokalen Dubletten definieren müssen. Die bestehenden Typen für Projekte, Tasks, Notizen, Attachments und Events wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Neue Status-Typen, Entitäts-Interfaces und Input/Update-Typen ergänzt |

## Selbsttest-Protokoll - Schritt 25: Shared Types Erweiterung

### 1. TypeScript-Build
Kommando: `npm run build -w packages/shared-types`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

Kommando: `npm run build -w apps/web`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`. Vite meldete nur eine Bundle-Größenwarnung, keinen Buildfehler.

### 2. Migration
Für Schritt 25 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 25 nicht nötig.

### 4. API-Smoke-Tests
Für Schritt 25 nicht vorgesehen, da nur Shared Types geändert wurden.

### 5. Dateisystem-Check
Für Schritt 25 nicht nötig.

### 6. Abweichungen vom Plan
Keine fachlichen Abweichungen. Input- und Update-Typen wurden ergänzend aufgenommen, um die Coding-Regel "Shared Types statt doppelter Definitionen" einzuhalten.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 25 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 26: Frontend Features & Use Cases.
