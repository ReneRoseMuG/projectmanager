---
type: "query"
date: "2026-08-27T07:03:40.620121+00:00"
question: "hast Du die ENdung .af berücksichtigt?"
contributor: "graphify"
source_nodes: ["attachment-preview.service.ts", "attachmentTypes.ts", "DocumentTile.tsx"]
---

# Q: hast Du die ENdung .af berücksichtigt?

## Answer

Nein. Die erste Prüfung berücksichtigte nur .afdesign, .afphoto und .afpub. Die aktuelle Affinity-Anwendung verwendet das native Format .af. Auch .af ist im Projekt weder in attachmentTypes.ts noch im officeExtensions-Profil des Preview-Service eingetragen und wird deshalb als sonstige Datei ohne Thumbnail behandelt. Für eine Thumbnail-Unterstützung muss .af ausdrücklich klassifiziert und über einen eigenen Affinity-Thumbnail-Extraktor verarbeitet werden; LibreOffice kann das Format nicht über die bestehende Pipeline rendern.

## Source Nodes

- attachment-preview.service.ts
- attachmentTypes.ts
- DocumentTile.tsx