# Log: Frontend Features & Use Cases

**Datum:** 16.05.26  
**Schritt:** 26 - Frontend Features & Use Cases  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Der Schritt wurde gemäß Pflichtablauf begonnen. Vor Codeänderungen sollte die im Auftrag geforderte neue Dependency `@tiptap/extension-markdown` im Web-Workspace installiert werden. Dieser Installationsschritt ist fehlgeschlagen, weil das Paket unter diesem Namen nicht im npm-Registry existiert. Zur Verifikation wurde zusätzlich `npm view @tiptap/extension-markdown version` ausgeführt; auch dieser Registry-Lookup liefert `404 Not Found`. Deshalb wurde Schritt 26 kontrolliert gestoppt und keine alternative Markdown-Lösung eingebaut.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-16-schritt-26-frontend-features-use-cases-blockiert.md` | neu | Blocker-Log für Schritt 26 |
| `logs/README.md` | geändert | Schritt 26 als blockiert eingetragen |

## Selbsttest-Protokoll - Schritt 26: Frontend Features & Use Cases

### 1. TypeScript-Build
Nicht ausgeführt, weil der Pflichtschritt Dependency-Installation blockiert ist.

### 2. Migration
Für Schritt 26 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 26 nicht nötig.

### 4. API-Smoke-Tests
Für Schritt 26 nicht ausgeführt, weil keine Frontend-Implementierung erfolgen durfte.

### 5. Dateisystem-Check
Für Schritt 26 nicht nötig.

### 6. Abweichungen vom Plan
Blocker vorhanden: Die im Auftrag fest vorgegebene Dependency `@tiptap/extension-markdown` ist im npm-Registry nicht verfügbar.

Kommando:

```powershell
$env:PATH="$env:LOCALAPPDATA\CodexTools\node\node-v20.20.2-win-x64;$env:PATH"; npm install @tiptap/extension-markdown -w apps/web
```

Fehlertext:

```text
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@tiptap%2fextension-markdown - Not found
npm error 404
npm error 404  '@tiptap/extension-markdown@*' is not in this registry.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
npm error A complete log of this run can be found in: C:\Users\schro\AppData\Local\npm-cache\_logs\2026-05-16T12_29_26_335Z-debug-0.log
```

Verifikationskommando:

```powershell
$env:PATH="$env:LOCALAPPDATA\CodexTools\node\node-v20.20.2-win-x64;$env:PATH"; npm view @tiptap/extension-markdown version
```

Fehlertext:

```text
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@tiptap%2fextension-markdown - Not found
npm error 404
npm error 404  '@tiptap/extension-markdown@*' is not in this registry.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
npm error A complete log of this run can be found in: C:\Users\schro\AppData\Local\npm-cache\_logs\2026-05-16T12_29_37_123Z-debug-0.log
```

### Gesamtstatus
Mindestens ein Pflicht-Check ist rot. Schritt 26 ist blockiert.

## Probleme und Abweichungen

Die Dependency-Vorgabe ist technisch nicht erfüllbar, solange kein gültiger Paketname, Tarball, Git-URL oder eine erlaubte Ersatzbibliothek freigegeben wird. Eine mögliche fachliche Alternative wäre ein Markdown-Editor ohne dieses Paket oder ein anderes offiziell verfügbares Tiptap-Markdown-Paket; das wäre aber eine Scope- und Architekturänderung gegenüber dem Auftrag und wurde deshalb nicht eigenständig umgesetzt.

## Offene Punkte / Folgeaufgaben

Für Schritt 26 wird eine Entscheidung benötigt:

- gültigen Paketnamen oder Installationsquelle für die Markdown-Extension nennen,
- oder eine alternative Markdown-Editor-Strategie freigeben.

## Nachtrag 16.05.26

Der Blocker wurde im Folgeauftrag gelöst. Verwendet wird `tiptap-markdown@0.8.10`, weil diese Version zur vorhandenen TipTap-2-Installation passt. Der Abschluss ist dokumentiert in `logs/2026-05-16-schritt-26-frontend-features-use-cases.md`.
