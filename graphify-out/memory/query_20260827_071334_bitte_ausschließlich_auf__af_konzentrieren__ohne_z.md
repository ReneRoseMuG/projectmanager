---
type: "query"
date: "2026-08-27T07:13:34.477402+00:00"
question: "Bitte ausschließlich auf .af konzentrieren, ohne zusätzliches JPEG. Die App läuft lokal auf Windows. Hilft das?"
contributor: "graphify"
source_nodes: ["attachment-preview.service.ts", "attachmentTypes.ts", "DocumentTile.tsx", "dms.ts"]
---

# Q: Bitte ausschließlich auf .af konzentrieren, ohne zusätzliches JPEG. Die App läuft lokal auf Windows. Hilft das?

## Answer

Ja. Das installierte Affinity-3.2.3-AppX-Paket registriert für .af einen Windows ThumbnailHandler. Empfohlen ist deshalb ein isolierter Windows-Shell-Adapter: Das Backend ruft IShellItemImageFactory mit THUMBNAILONLY in einem zeitbegrenzten PowerShell-STA-Hilfsprozess auf, übernimmt dessen PNG atomar in den bestehenden Preview-Cache und verwendet die bestehende authentifizierte Thumbnail-Route, Prozessobergrenze und UI-Fehlerrückfallebene. Es wird ausschließlich .af klassifiziert; Legacy-Endungen und eine Detailvorschau bleiben unverändert. Ein direkter Parser des proprietären Dateiformats und ein zusätzliches JPEG werden nicht verwendet.

## Source Nodes

- attachment-preview.service.ts
- attachmentTypes.ts
- DocumentTile.tsx
- dms.ts