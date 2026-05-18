# Log: Owner-Board-Migration

**Datum:** 18.05.26  
**Schritt:** 2 — Migration OwnerTaskBoard + OwnerTicketBoard  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`OwnerTaskBoard` und `OwnerTicketBoard` verwenden nun `OwnerRelationBoard` für Link-Aktion, Öffnen, Anlegen und Entfernen von Zuordnungen. Die Inline-Link-Dialoge wurden entfernt und durch die neuen `TaskLinkDialog`- und `TicketLinkDialog`-Komponenten ersetzt. Das Confirm-Verhalten für Unlink liegt zentral in `OwnerRelationBoard`; die Boards behalten ihre bestehenden Create- und Link-Toast-Flows. Ein gezielter Suchlauf bestätigt, dass die migrierten Board-Dateien keine lokalen `confirm()`- oder Link-Dialog-Funktionen mehr enthalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Auf `OwnerRelationBoard` und extrahierten Link-Dialog migriert |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Auf `OwnerRelationBoard` und extrahierten Link-Dialog migriert |

## Probleme und Abweichungen

Keine. Die technische Verifikation per Typecheck, Lint, Build sowie Unit- und API-Tests wurde später erfolgreich nachgeholt.

## Offene Punkte / Folgeaufgaben

Playwright-Specs konnten wegen eines lokalen `tsx`/`esbuild`-Startfehlers nicht ausgeführt werden.
