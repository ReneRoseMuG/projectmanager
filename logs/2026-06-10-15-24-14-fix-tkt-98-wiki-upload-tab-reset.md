# Log: TKT-98 Dateiupload springt zur Detailseite

**Datum:** 10.06.26  
**Uhrzeit:** 15:24:14  
**Schritt:** Fix — TKT-98 „Dateiupload an Wikipage springt zur Detailseite"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Beim Hochladen einer Datei im „Dateien"-Tab einer Wiki-Seite sprang die Ansicht
zurück auf den „Details"-Tab. Ursache: `invalidateAttachments` invalidiert für
`wikiPage` auch die Wiki-Detail- und Root-Query, wodurch `useWiki` nachlädt und die
Props `page` und `parent` neue Objekt-Referenzen erhalten. Der Reset-Effekt in
`WikiPageForm` hing an den Objekten `[open, page, parent]` und lief deshalb bei jedem
Refetch erneut, inklusive `setActiveTab("details")`.

Die Effekt-Abhängigkeiten wurden auf die Identitäten umgestellt: `[open, page?.id,
parent?.id]` (mit `eslint-disable`-Kommentar wie beim benachbarten Effekt). Dadurch
setzt der Effekt Tab und Feldwerte nur noch beim Öffnen oder bei einem echten
Seitenwechsel zurück, nicht mehr beim Neuladen derselben Seite.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Reset-Effekt von Objekt- auf ID-Abhängigkeiten umgestellt |

## Probleme und Abweichungen

Keine. Seitenwechsel öffnet weiterhin auf „Details"; Refetch derselben Seite (Upload,
Autosave) erhält den aktiven Tab und die Feldwerte. Typecheck grün, WikiPageForm-Tests
16/16 grün.

## Offene Punkte / Folgeaufgaben

- Empfohlen: kurzer Browser-Sichtcheck (Datei im „Dateien"-Tab hochladen → Tab bleibt
  „Dateien", Liste aktualisiert sich).
