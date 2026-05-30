# Log: tldraw TipTap Audit Cluster

**Datum:** 21.05.26  
**Schritt:** 3 — tldraw TipTap Audit Cluster  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`@tldraw/tldraw` wurde auf 5.0.1 aktualisiert und beseitigt damit den produktiven tldraw/nanoid-Audit-Cluster. Weil tldraw 5 intern TipTap 3 nutzt, wurden die direkt verwendeten TipTap-Pakete des Web-Workspaces kontrolliert auf 3.23.5 aktualisiert. `tiptap-markdown` wurde auf 0.9.0 aktualisiert, da diese Version zu TipTap 3 kompatibel ist. Die tldraw-Node-Komponente wurde an die neue Export-API angepasst: statt `exportToBlob` wird `editor.getSvgString` verwendet und daraus ein SVG-Blob für die Vorschau erzeugt. Außerdem wurde der geänderte `TextStyle`-Import auf den neuen named export umgestellt. Der Web-Build wurde anschließend erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/package.json` | geändert | tldraw, TipTap-Pakete und `tiptap-markdown` aktualisiert |
| `apps/web/src/components/ui/TldrawNodeView.tsx` | geändert | tldraw-5-kompatible SVG-Vorschau-Erzeugung |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | TipTap-3-kompatibler `TextStyle`-Import |
| `package.json` | geändert | Root-DevDependency für TipTap-Peer-Auflösung ergänzt |
| `package-lock.json` | geändert | Lockfile nach Web-Dependency-Upgrade neu aufgelöst |
| `logs/2026-05-21-schritt-03-tldraw-tiptap-audit-cluster.md` | neu | Schritt-Log für den tldraw/TipTap-Audit-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Ein reiner `nanoid`-Override wurde geprüft, beseitigte den Audit-Fund aber nicht, weil npm den Override im Web-Unterbaum nicht durchsetzte. Der tldraw-5-Upgrade machte anschließend eine TipTap-3-Angleichung nötig, da Rollup sonst TipTap-2- und TipTap-3-Pakete mischte. Diese Ausweitung blieb auf die bestehenden Editor-Dependencies beschränkt.

## Offene Punkte / Folgeaufgaben

Offen sind nur noch moderate Dev-Tooling-Funde in Vite/Vitest/esbuild und Drizzle-Kit.
