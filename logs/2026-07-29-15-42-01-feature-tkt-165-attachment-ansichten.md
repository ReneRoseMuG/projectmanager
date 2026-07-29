# Log: TKT-165 – Attachment-Ansichten

**Datum:** 29.07.26  
**Uhrzeit:** 15:42:01  
**Schritt:** Feature — TKT-165 Attachment-Ansichten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Attachment-Explorer bietet jetzt die fünf Ansichten „Liste“, „Details“, „Kleine Symbole“, „Mittelgroße Symbole“ und „Große Symbole“. Die Auswahl wird im lokalen Browser-Speicher erhalten und gilt damit bei der nächsten Nutzung weiter. Listen- und Detailansicht zeigen kompakte Zeilen, während die drei Symbolgrößen responsive Kacheln verwenden; Bilder werden als Vorschaubild dargestellt. In der Detailansicht bleibt die vorhandene Attachment-Vorschau für eine einzelne Auswahl verfügbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Fünf Explorer-Ansichten und persistierte Auswahl |
| `apps/web/src/utils/domainLabels.ts` | geändert | Zentrale Beschriftungen der Ansichtsmodi |
| `tests/unit/web/components/attachments/AttachmentList.test.tsx` | neu | Ansichtsumschaltung und LocalStorage-Persistenz |

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken`. Die Unit-Ebene beweist mit echter DOM-Interaktion, dass alle fünf Modi vorhanden sind und der ausgewählte Modus im isoliert zurückgesetzten LocalStorage gespeichert wird. Backend- oder Dateisystem-Mocks sind für diese reine Darstellungslogik nicht erforderlich.

## Probleme und Abweichungen

Die zusätzliche visuelle Browserprüfung war wegen einer fehlenden Browser-Laufzeitfreigabe in dieser Sitzung nicht möglich. Typecheck, gezielter ESLint-Lauf und DOM-Test sind erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
