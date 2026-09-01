---
type: "query"
date: "2026-08-26T14:54:21.250722+00:00"
question: "Der Dokument Manager erzeugt Thubnails. Können diese auch für das Dateiformat von afinnity angezeigt werden?"
contributor: "graphify"
source_nodes: ["attachment-preview.service.ts", "attachmentTypes.ts", "DocumentTile.tsx"]
---

# Q: Der Dokument Manager erzeugt Thubnails. Können diese auch für das Dateiformat von afinnity angezeigt werden?

## Answer

Derzeit nein: .afdesign, .afphoto und .afpub werden im Frontend als sonstige Datei behandelt, deshalb wird kein Thumbnail angefordert. Das Backend erzeugt Thumbnails nur für PDF sowie Office- und ODF-Dateien über LibreOffice. Eine Erweiterung ist möglich, wenn das in Affinity-Dateien optional gespeicherte Vorschaubild über einen separaten, sicher begrenzten Extraktor ausgelesen wird; nur die Dateiendungen in die Whitelists aufzunehmen reicht nicht.

## Source Nodes

- attachment-preview.service.ts
- attachmentTypes.ts
- DocumentTile.tsx