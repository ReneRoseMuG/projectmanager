# Log: Frontend Features & Use Cases

**Datum:** 16.05.26  
**Schritt:** 26 - Frontend Features & Use Cases  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der vorherige Dependency-Blocker wurde fachlich gelöst: Das im Auftrag genannte Paket `@tiptap/extension-markdown` existiert nicht im npm-Registry, die kompatible TipTap-2-Lösung ist `tiptap-markdown@0.8.10`. Diese Version wurde installiert, weil sie `@tiptap/core ^2.0.3` als Peer Dependency nutzt und damit zur bestehenden TipTap-2-Installation des Projekts passt. Anschließend wurden die Frontend-API-Module, Hooks, Feature-Seiten, Feature-Komponenten, Use-Case-Komponenten und ein eigener MarkdownEditor umgesetzt. Die neuen Routen `/features` und `/features/:id` sind registriert, und die Sidebar enthält den Features-Eintrag. Komponenten nutzen keine direkten `fetch`-Aufrufe, sondern greifen über `src/api/` und Hooks auf die API zu.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/package.json` | geändert | `tiptap-markdown@0.8.10` ergänzt |
| `package-lock.json` | geändert | Dependency-Lock für `tiptap-markdown` und Unterabhängigkeiten |
| `apps/web/src/api/features.ts` | neu | API-Funktionen für Feature-CRUD |
| `apps/web/src/api/use-cases.ts` | neu | API-Funktionen für Use-Case-CRUD |
| `apps/web/src/hooks/useFeatures.ts` | neu | Feature-Listen-/Detail-Hook |
| `apps/web/src/hooks/useUseCases.ts` | neu | Use-Case-Listen-/Detail-Hook |
| `apps/web/src/components/ui/MarkdownEditor.tsx` | neu | TipTap-2-Markdown-Editor mit Markdown-String-Ausgabe |
| `apps/web/src/components/features/FeatureList.tsx` | neu | Feature-Liste |
| `apps/web/src/components/features/FeatureCard.tsx` | neu | Feature-Karte |
| `apps/web/src/components/features/FeatureForm.tsx` | neu | Feature-Formular mit MarkdownEditor |
| `apps/web/src/components/features/FeatureDetail.tsx` | neu | Feature-Detailbearbeitung mit MarkdownEditor |
| `apps/web/src/components/usecases/UseCaseList.tsx` | neu | Use-Case-Liste |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | neu | Use-Case-Formular mit MarkdownEditor |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | neu | Use-Case-Detailbearbeitung mit MarkdownEditor |
| `apps/web/src/pages/FeaturesPage.tsx` | neu | Route `/features` |
| `apps/web/src/pages/FeatureDetailPage.tsx` | neu | Route `/features/:id` |
| `apps/web/src/App.tsx` | geändert | Feature-Routen registriert |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag Features ergänzt |

## Selbsttest-Protokoll - Schritt 26: Frontend Features & Use Cases

### 1. TypeScript-Build
Kommando: `npm run build -w apps/web`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`. Vite meldete nur eine Bundle-Größenwarnung, keinen Fehler.

Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 26 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 26 nicht nötig.

### 4. API-/Frontend-Smoke-Tests
Kommando: `npm ls tiptap-markdown -w apps/web`  
Antwort: `tiptap-markdown@0.8.10`.

Kommando: `Invoke-WebRequest http://localhost:5173/features`  
Antwort: HTTP `200`.

Kommando: serieller Smoke-Test über API für Feature und Use Case  
Antwort:

```json
{
  "WebStatus": 200,
  "FeatureId": 7,
  "DetailHasContent": true,
  "PatchedHasContent": true,
  "UseCaseId": 3,
  "UseCaseCount": 1,
  "Cleanup": "deleted"
}
```

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/features, apps/api/content/usecases -Recurse -Force`  
Ergebnis: Nach dem Smoke-Test-Cleanup blieben nur die `.gitkeep`-Dateien in `features/` und `usecases/`.

### 6. Lint
Kommando: `npm run lint -w apps/web`  
Ergebnis: Fehlerfrei.

### 7. Abweichungen vom Plan
Abweichung vorhanden und fachlich begründet: Statt des nicht existierenden Pakets `@tiptap/extension-markdown` wurde `tiptap-markdown@0.8.10` eingesetzt. Diese Version ist zur vorhandenen TipTap-2-Linie kompatibel. Ein Wechsel auf `@tiptap/markdown` wurde nicht vorgenommen, weil dieses Paket aktuell nur als TipTap-3-Paket verfügbar ist und ein TipTap-Major-Upgrade außerhalb des Schritt-26-Scopes läge.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 26 ist abgeschlossen.

## Probleme und Abweichungen

`npm install` meldet nach der Installation weiterhin `2 moderate severity vulnerabilities` im Dependency-Baum. Diese wurden nicht mit `npm audit fix --force` behoben, weil das Breaking Changes auslösen kann und nicht Teil des Auftrags ist.

## Offene Punkte / Folgeaufgaben

Schritt 27: Frontend Wiki.
