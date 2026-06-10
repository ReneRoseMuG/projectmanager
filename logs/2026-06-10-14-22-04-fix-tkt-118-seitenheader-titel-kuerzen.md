# Log: TKT-118 Aktuelles Item im Seitenheader bricht um

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:04  
**Schritt:** Fix — TKT-118 „Aktuelles Item im Seitenheader bricht um"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Titel im Detail-Seitenheader (`PageHero` Variante „detail") hatte eine feste
Maximalbreite (`max-w-[760px]`) und kein Kürzungsverhalten, wodurch lange Titel
umbrachen, obwohl Platz vorhanden war. Die feste Maximalbreite wurde entfernt und
durch `truncate` ersetzt: Der Titel nutzt jetzt die verfügbare Breite und wird bei
Überlänge mit Auslassungspunkten abgeschnitten — analog zur bereits korrekten
Listen-Variante des Headers.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/PageHero.tsx` | geändert | Detail-Titel: `max-w-[760px]` entfernt, `truncate` ergänzt |

## Probleme und Abweichungen

Keine. Der umgebende Container hat bereits `min-w-0`, sodass `truncate` greift.

## Offene Punkte / Folgeaufgaben

Keine.
