# Log: TKT-167 – Attachment-Bulk-Operationen

**Datum:** 29.07.26  
**Uhrzeit:** 15:42:02  
**Schritt:** Feature — TKT-167 Attachment-Bulk-Operationen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Attachments können im Explorer mehrfach ausgewählt und gesammelt als ZIP heruntergeladen, von ihrem Item gelöst, einem virtuellen Ordner zugeordnet oder endgültig gelöscht werden. Alle schreibenden Bulk-Operationen sind auf höchstens 100 Einträge begrenzt, ownergebunden, versionsgeschützt und verwenden die vorhandenen Attachment-Berechtigungen. Das Backend lädt und mutiert die Auswahl gebündelt; ein Lösen der letzten Owner-Verknüpfung nimmt eine zuvor bibliotheksunsichtbare Datei automatisch in die Dokumentenbibliothek auf. Das endgültige Löschen entfernt PM-Datensätze und zugehörige PM-Dateien, berührt aber niemals Dateien aus lokalen Ordnerquellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Gemeinsame Bulk- und lokale Dateiauswahltypen |
| `apps/api/src/routes/attachments.ts` | geändert | Bulk-Lösen, -Löschen, -Ordner und ZIP-Endpunkte |
| `apps/api/src/services/attachments.service.ts` | geändert | Gebündelte Owner-, Versions- und Löschlogik |
| `apps/api/src/services/document-download.service.ts` | geändert | Gemischtes ZIP aus PM- und lokalen Dateien |
| `apps/web/src/api/attachments.ts` | geändert | API-Funktionen für Bulk-Operationen |
| `apps/web/src/hooks/useAttachments.ts` | geändert | TanStack-Mutationen und zentrale Invalidierung |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Mehrfachauswahl und Aktionsleiste |
| `tests/integration/api/attachment-explorer.test.ts` | neu | ZIP, Lösen, Löschen, Rechte und Konflikte |
| `tests/unit/web/components/attachments/AttachmentList.test.tsx` | neu | Sichtbare Bulk-Aktionen und Payloads |

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken`. Die Integrationsebene nutzt echte Fastify-Routen, MySQL-Transaktionen, reale Dateien im eindeutigen Temp-Root und liest das erzeugte ZIP tatsächlich ein. Abgedeckt sind erfolgreicher Zugriff, anonymer Zugriff, Reader-Negativfälle, veraltete Versionen, physische PM-Dateilöschung und Erhalt lokaler Ursprungsdateien. Die UI-Ebene prüft Auswahlzustand und versionshaltige Bulk-Payloads in JSDOM.

## Probleme und Abweichungen

Der erste Integrationslauf scheiterte ausschließlich am Binärparser des neu angelegten Supertest-Adapters; nach Korrektur des Testadapters waren alle vier Integrationsfälle grün. Ein Produktfehler lag dabei nicht vor.

## Offene Punkte / Folgeaufgaben

Keine.
