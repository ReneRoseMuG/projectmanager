# Log: Note Details in neuem Tab

**Datum:** 31.05.26  
**Uhrzeit:** 16:19:31  
**Schritt:** Feature — Note Details in neuem Tab  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Notizen haben jetzt eine eigene Web-Detailroute unter `/notes/:id`. Die Route lädt die Notiz über die bestehende API, rendert den vorhandenen `NoteEditor` als vollflächige Detailseite und navigiert beim Schließen zum übergebenen `returnTo` zurück. Die Board- und Listen-Aktion „In Tab öffnen“ erzeugt nun einen Standalone-Link auf diese Note-Detailseite statt auf die übergeordnete Board- oder Listenansicht. Die TanStack-Query-Struktur wurde um einen Note-Detail-Key und eine zentrale Detail-Invalidierung ergänzt. Testleitplanken angewendet: Web-Unit/jsdom für Link- und Page-Verhalten, Web-Integration mit echtem QueryClient für Invalidation; keine DB- oder Dateisystemdaten betroffen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/NoteDetailPage.tsx` | neu | Eigenständige Note-Detailseite |
| `apps/web/src/hooks/useNoteDetail.ts` | neu | TanStack-Query-Hook für einzelne Notizen |
| `apps/web/src/App.tsx` | geändert | `/notes/:id` Route und Full-Bleed-Erkennung ergänzt |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | „In Tab öffnen“ verlinkt auf `/notes/:id` |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Page-Variante und optionaler Tab-Button ergänzt |
| `apps/web/src/api/notes.ts` | geändert | `getNote` API-Funktion ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | `notes.detail(id)` ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Note-Detail-Invalidierung ergänzt |
| `tests/unit/web/components/notes/NoteList.test.tsx` | geändert | Board-/Listen-Linkziel abgesichert |
| `tests/unit/web/pages/NoteDetailPage.test.tsx` | neu | Note-Detailroute und Rücknavigation abgesichert |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Note-Detail-Query-Invalidierung abgesichert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
