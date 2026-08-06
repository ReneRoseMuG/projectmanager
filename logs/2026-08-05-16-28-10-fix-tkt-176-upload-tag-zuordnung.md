# Log: TKT-176 Upload-Tag-Zuordnung

**Datum:** 05.08.26  
**Uhrzeit:** 16:28:10  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Dokument-Upload übernimmt jetzt neben der direkt ausgewählten Sammlung auch alle aktiven DMS-Tagfilter. Die Tag-IDs werden durch Seite und TanStack-Mutation bis zum bestehenden MS-80-Uploadvertrag weitergegeben und dort dedupliziert sowie stabil sortiert als Query-Parameter gesendet. Dadurch entsteht die Tag-Zuordnung atomar im vorhandenen Upload-Request, ohne nachgelagerten zweiten API-Aufruf. Uploads ohne aktiven Tag- oder Sammlungskontext behalten den bisherigen unparametrisierten Pfad. Die Umsetzung wurde mit den Skills `planungsleitplanken`, `test-entwurfsleitplanken` und `code-discipline` auf den Ticket-Scope begrenzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Aktive Tagfilter an den Dokument-Upload übergeben |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Tag-IDs durch die Upload-Mutation weiterreichen |
| `apps/web/src/api/documents.ts` | geändert | Sammlung und Tags im atomaren Upload-Query erzeugen |
| `tests/unit/web/pages/DocumentsPage.grid.test.tsx` | geändert | Upload mit und ohne aktiven Tag-Kontext absichern |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Weitergabe von Sammlung und Tags durch den Hook prüfen |
| `tests/unit/web/api/documents.test.ts` | neu | Query- und FormData-Erzeugung des Upload-Clients prüfen |
| `logs/2026-08-05-16-28-10-fix-tkt-176-upload-tag-zuordnung.md` | neu | Umsetzung und Verifikation dokumentieren |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzen |

## Probleme und Abweichungen

Der vollständige bestehende Test `DocumentsPage.grid.test.tsx` enthält unabhängig von TKT-176 eine veraltete Erwartung auf den Titel `Kachelgröße Groß`; die aktuelle UI verwendet die seit der Kachelumstellung vorhandene Bezeichnung `Kachelgröße L`. Gemäß Verbot eigenständiger Regressions-Fixes während des Testlaufs wurde dieser fremde Fehler nicht geändert. Die beiden Uploadvertrag-Tests derselben Datei laufen gezielt grün.

## Offene Punkte / Folgeaufgaben

Die veraltete Kachelgrößen-Erwartung sollte in einem separaten Test-Fix an die bestehende UI angeglichen werden.

## Testleitplanken und Testebenen

Angewendet wurde `test-entwurfsleitplanken`. Abgedeckt ist die Unit-Ebene mit echter Seitenverdrahtung, echtem TanStack QueryClient sowie echter Query- und FormData-Erzeugung; gemockt wurden nur Datenhooks beziehungsweise der ky-Client als klar begrenzte Netzwerkgrenze. Die Tests laufen isoliert in jsdom ohne zentrale Datenbank, produktive Upload-Verzeichnisse oder Netzwerkzugriff. Erfolgreich waren 2 API-Client-Tests, 2 gezielte Seiten-Uploadtests und 5 Hook-Tests; zusätzlich waren ESLint für die geänderten Produktivdateien und der Web-Produktionsbuild grün.
