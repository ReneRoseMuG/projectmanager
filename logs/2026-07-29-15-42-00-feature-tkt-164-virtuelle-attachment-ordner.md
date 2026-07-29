# Log: TKT-164 – Virtuelle Attachment-Ordner

**Datum:** 29.07.26  
**Uhrzeit:** 15:42:00  
**Schritt:** Feature — TKT-164 Virtuelle Attachment-Ordner  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Attachment-Bereich verwendet die vorhandene virtuelle DMS-Ordnerhierarchie nun direkt als Ablage. Benutzer können im Explorer neue Ordner und Unterordner anlegen, Attachments nach Ordner filtern und eine Mehrfachauswahl mit einem einzelnen API-Aufruf in einen Ordner verschieben oder wieder als „Nicht einsortiert“ ablegen. Die Attachment-DTOs liefern ihre Ordnerzuordnung mit; die Owner-Listen laden diese Zuordnungen gebündelt statt pro Datei. Ownergebundene Attachments dürfen dabei auch ohne zusätzliche Sichtbarkeit in der Dokumentenbibliothek einem virtuellen Ordner zugeordnet werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Attachment-DTO um Ordnerzuordnung ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | Gebündeltes Laden und Setzen virtueller Ordner |
| `apps/api/src/services/attachment-folder.service.ts` | geändert | Ownergebundene Attachments für Ordnerzuordnung freigegeben |
| `apps/api/src/routes/attachments.ts` | geändert | Geschützte Bulk-Ordnerroute ergänzt |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Ordnerauswahl, Filter und Anlage von Unterordnern |
| `tests/integration/api/attachment-explorer.test.ts` | neu | Reale Ordnerzuordnung und Versionsschutz |
| `tests/unit/web/components/attachments/AttachmentList.test.tsx` | neu | Ordner- und Unterordneranlage in der UI |

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken`. Die Integrationsebene verwendet echte Fastify-Routen und eine zufällig isolierte MySQL-Testdatenbank; die Unit-Ebene verwendet JSDOM und ausschließlich gemockte direkte Query-/UI-Kollaboratoren. Bewiesen werden erfolgreiche Mehrfachzuordnung, aktualisierte Versionen, Konflikt bei veralteter Version sowie die Anlage eines Unterordners aus der aktuellen Ablage.

## Probleme und Abweichungen

Die zusätzliche visuelle Browserprüfung war wegen einer fehlenden Browser-Laufzeitfreigabe in dieser Sitzung nicht möglich. Die DOM-Interaktionen wurden stattdessen gezielt und erfolgreich als Unit-Test ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
